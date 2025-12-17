// components/Scheduling/CreateScheduleWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Steps,
  Button,
  Form,
  Select,
  Input,
  InputNumber,
  TimePicker,
  message,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Divider,
  Modal,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "./CreateScheduleWizard.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const getToken = () => localStorage.getItem("authToken") || "";

// axios instance with token
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* -------------------- helpers -------------------- */

const isTimeHHMM = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ""));
const timeToMin = (t) => {
  if (!isTimeHHMM(t)) return null;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
};

const getId = (x) => (x && typeof x === "object" && x._id ? String(x._id) : String(x || ""));

const pad3 = (n) => String(Number(n || 1)).padStart(3, "0");

const nextSectionNumber = (sections, semesterId, courseId) => {
  const used = new Set(
    (sections || [])
      .filter((s) => getId(s.semester) === String(semesterId) && getId(s.course) === String(courseId))
      .map((s) => String(s.sectionNumber))
  );
  for (let i = 1; i <= 999; i++) {
    const cand = pad3(i);
    if (!used.has(cand)) return cand;
  }
  return "999";
};

const showConflictsModal = (title, conflicts) => {
  Modal.error({
    title,
    width: 720,
    content: (
      <div>
        {(conflicts || []).map((c, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <b>{c.type}:</b> {c.message} {c.day ? `(${c.day} ${c.time || ""})` : ""}
          </div>
        ))}
      </div>
    ),
  });
};

const parseApiError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 401) return { kind: "auth", message: "Session expired. Please login again." };

  if (status === 409 && data?.error === "SCHEDULE_CONFLICT") {
    return { kind: "conflict", message: data.message || "Schedule conflict", conflicts: data.conflicts || [] };
  }

  // duplicate section patterns (depends on your backend)
  if (status === 409 && data?.error === "DUPLICATE_SECTION") {
    return { kind: "dup_section", message: data.message || "Duplicate section", keyValue: data.keyValue };
  }

  const msg = data?.message || data?.error || err?.message || "Request failed";
  return { kind: "generic", message: msg };
};

export default function CreateScheduleWizard() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [semesters, setSemesters] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const [savedDraft, setSavedDraft] = useState(null);
  const [stepError, setStepError] = useState(null);

  const stepFields = useMemo(
    () => [
      ["semester", "professor"],
      ["course", "type", "sectionNumber", "capacity"],
      ["day", "startTime", "endTime"],
      ["classroom", "notes"],
    ],
    []
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      message.error("No auth token. Please login.");
      navigate("/login");
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // IMPORTANT: use /api/semesters (your server.js has it)
        const [s, d, c, r] = await Promise.all([
          api.get("/api/semesters"),
          api.get("/api/doctors"),
          api.get("/api/courses"),
          api.get("/api/classrooms"),
        ]);

        setSemesters(s.data?.data || []);
        setProfessors(d.data?.data || []);
        setCourses(c.data?.data || []);
        setClassrooms(r.data?.data || []);

        loadDraft();
      } catch (err) {
        const parsed = parseApiError(err);
        message.error(parsed.message || "Failed to load data");
        if (parsed.kind === "auth") navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------- DRAFT ---------------- */

  const saveDraft = async () => {
    try {
      const values = form.getFieldsValue(true);
      const safeValues = {
        ...values,
        startTime: values.startTime ? values.startTime.format("HH:mm") : null,
        endTime: values.endTime ? values.endTime.format("HH:mm") : null,
      };

      const draft = { currentStep, formData: safeValues, savedAt: new Date().toISOString() };
      localStorage.setItem("scheduleDraft", JSON.stringify(draft));
      setSavedDraft(draft);
      message.success("Draft saved");
      return true;
    } catch {
      message.error("Failed to save draft");
      return false;
    }
  };

  const loadDraft = () => {
    const raw = localStorage.getItem("scheduleDraft");
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      const data = { ...(draft.formData || {}) };

      if (typeof data.startTime === "string") data.startTime = dayjs(data.startTime, "HH:mm");
      if (typeof data.endTime === "string") data.endTime = dayjs(data.endTime, "HH:mm");

      setSavedDraft(draft);
      setCurrentStep(typeof draft.currentStep === "number" ? draft.currentStep : 0);
      form.setFieldsValue(data);
    } catch {
      localStorage.removeItem("scheduleDraft");
    }
  };

  const clearDraft = () => {
    localStorage.removeItem("scheduleDraft");
    setSavedDraft(null);
    setStepError(null);
    form.resetFields();
    setCurrentStep(0);
    message.info("Draft cleared");
  };

  /* ---------------- VALIDATION ---------------- */

  const validateTimeRange = () => {
    const { startTime, endTime } = form.getFieldsValue(["startTime", "endTime"]);
    if (!startTime || !endTime) return { ok: false, message: "Start time and end time are required." };

    const s = startTime.format("HH:mm");
    const e = endTime.format("HH:mm");
    const sMin = timeToMin(s);
    const eMin = timeToMin(e);

    if (sMin == null || eMin == null) return { ok: false, message: "Time must be valid HH:MM (24h)." };
    if (eMin <= sMin) return { ok: false, message: "End time must be after start time." };

    return { ok: true };
  };

  /* ---------------- CONFLICT CHECK ---------------- */

  const checkConflicts = async ({ semesterId, sectionId, doctorId, classroomId, scheduleSlots, excludeScheduleId }) => {
    const payload = {
      semester: semesterId,
      section: sectionId,
      doctor: doctorId,
      classroom: classroomId,
      scheduleSlots,
      excludeScheduleId,
    };

    const res = await api.post("/api/schedules/check-conflicts", payload);
    return res.data?.conflicts || [];
  };

  /* ---------------- STEP NAV ---------------- */

  const next = async () => {
    try {
      setStepError(null);
      await form.validateFields(stepFields[currentStep]);

      // step time validation
      if (currentStep === 2) {
        const t = validateTimeRange();
        if (!t.ok) {
          setStepError(t.message);
          message.error(t.message);
          return;
        }
      }

      await saveDraft();
      setCurrentStep((s) => Math.min(s + 1, 3));
    } catch {
      setStepError("Fix the required fields in this step before continuing.");
      message.error("Fix the required fields in this step.");
    }
  };

  const prev = () => {
    setStepError(null);
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async () => {
    setLoading(true);
    setStepError(null);

    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);

      const semesterId = values.semester;
      const courseId = values.course;
      const doctorId = values.professor;
      const classroomId = values.classroom;

      if (!semesterId || !courseId || !doctorId || !classroomId) {
        setStepError("Missing semester, course, professor, or classroom.");
        message.error("Missing semester, course, professor, or classroom.");
        setCurrentStep(0);
        return;
      }

      const timeCheck = validateTimeRange();
      if (!timeCheck.ok) {
        setStepError(timeCheck.message);
        message.error(timeCheck.message);
        setCurrentStep(2);
        return;
      }

      const scheduleSlots = [
        {
          day: values.day,
          startTime: values.startTime.format("HH:mm"),
          endTime: values.endTime.format("HH:mm"),
          type: values.type,
        },
      ];

      // STEP 1: load sections
      let allSections = [];
      try {
        const secRes = await api.get("/api/sections", { params: { semesterId } });
        allSections = secRes.data?.data || [];
      } catch (e) {
        setStepError("Failed to load sections for this semester.");
        message.error("Failed to load sections for this semester.");
        setCurrentStep(1);
        return;
      }

      // STEP 2: determine section number
      const wanted = values.sectionNumber ? pad3(values.sectionNumber) : null;
      const sectionNumber = wanted || nextSectionNumber(allSections, semesterId, courseId);

      let section = allSections.find(
        (s) =>
          getId(s.semester) === String(semesterId) &&
          getId(s.course) === String(courseId) &&
          String(s.sectionNumber) === String(sectionNumber)
      );

      // STEP 3: create section if missing
      if (!section?._id) {
        try {
          const createSecRes = await api.post("/api/sections", {
            semester: semesterId,
            course: courseId,
            assignedDoctor: doctorId,
            sectionNumber,
            type: values.type,
            capacity: values.capacity || 30,
            isActive: true,
            notes: values.notes || "",
          });
          section = createSecRes.data?.data;
        } catch (err) {
          const parsed = parseApiError(err);
          setStepError(parsed.message || "Failed to create section.");
          message.error(parsed.message || "Failed to create section.");
          setCurrentStep(1);
          return;
        }
      }

      if (!section?._id) {
        setStepError("Section creation failed.");
        message.error("Section creation failed.");
        setCurrentStep(1);
        return;
      }

      // STEP 4: check conflicts BEFORE create
      try {
        const conflicts = await checkConflicts({
          semesterId,
          sectionId: section._id,
          doctorId,
          classroomId,
          scheduleSlots,
        });

        if (conflicts.length) {
          showConflictsModal("Cannot create schedule", conflicts);
          setStepError("Schedule conflict detected. Fix conflicts and try again.");
          setCurrentStep(2);
          return;
        }
      } catch (err) {
        const parsed = parseApiError(err);
        message.error(parsed.message || "Failed to check conflicts.");
        setStepError(parsed.message || "Failed to check conflicts.");
        setCurrentStep(2);
        return;
      }

      // STEP 5: create schedule (backend should also enforce conflicts)
      try {
        const res = await api.post("/api/schedules", {
          semester: semesterId,
          section: section._id,
          course: courseId,
          doctor: doctorId,
          classroom: classroomId,
          scheduleSlots,
          status: values.saveAsDraft ? "Draft" : "Published",
          notes: values.notes || "",
        });

        if (!res.data?.success) {
          message.error(res.data?.message || "Failed to create schedule.");
          setStepError(res.data?.message || "Failed to create schedule.");
          return;
        }
      } catch (err) {
        const parsed = parseApiError(err);
        if (parsed.kind === "conflict") {
          showConflictsModal("Schedule conflict", parsed.conflicts);
          setStepError("Schedule conflict detected.");
          setCurrentStep(2);
          return;
        }
        message.error(parsed.message || "Failed to create schedule.");
        setStepError(parsed.message || "Failed to create schedule.");
        return;
      }

      clearDraft();
      message.success(`Schedule created (Section ${sectionNumber})`);
      navigate("/admin/schedule/view");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  const steps = useMemo(
    () => [
      {
        title: "Semester & Professor",
        content: (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="semester" label="Semester" rules={[{ required: true, message: "Select semester" }]}>
                <Select placeholder="Select semester" showSearch optionFilterProp="children">
                  {semesters.map((s) => (
                    <Option key={s._id} value={s._id}>
                      {s.name} {s.year} {s.isActive ? "(Active)" : ""}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="professor" label="Professor" rules={[{ required: true, message: "Select professor" }]}>
                <Select placeholder="Select professor" showSearch optionFilterProp="children">
                  {professors.map((p) => (
                    <Option key={p._id} value={p._id}>
                      {p?.user?.profile?.firstName} {p?.user?.profile?.lastName}
                      {p?.employeeId ? ` (${p.employeeId})` : ""}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        ),
      },
      {
        title: "Course & Section",
        content: (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="course" label="Course" rules={[{ required: true, message: "Select course" }]}>
                <Select placeholder="Select course" showSearch optionFilterProp="children">
                  {courses.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.courseCode} - {c.courseName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="type" label="Type" rules={[{ required: true, message: "Select type" }]}>
                <Select placeholder="Select type">
                  <Option value="Lecture">Lecture</Option>
                  <Option value="Lab">Lab</Option>
                  <Option value="Tutorial">Tutorial</Option>
                  <Option value="Seminar">Seminar</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                name="sectionNumber"
                label="Section Number"
                tooltip="If empty, the system auto-picks the next free number. If you type 1 it becomes 001."
              >
                <InputNumber min={1} max={999} style={{ width: "100%" }} placeholder="Auto if empty" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="capacity" label="Capacity">
                <InputNumber min={1} max={1000} style={{ width: "100%" }} placeholder="Default: 30" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Alert
                type="info"
                showIcon
                message="Section uniqueness"
                description={
                  <span>
                    Unique key is <Tag>semester + course + sectionNumber</Tag>. Not doctor.
                  </span>
                }
              />
            </Col>
          </Row>
        ),
      },
      {
        title: "Schedule Time",
        content: (
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="day" label="Day" rules={[{ required: true, message: "Select day" }]}>
                <Select placeholder="Select day">
                  <Option value="Sunday">Sunday</Option>
                  <Option value="Monday">Monday</Option>
                  <Option value="Tuesday">Tuesday</Option>
                  <Option value="Wednesday">Wednesday</Option>
                  <Option value="Thursday">Thursday</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="startTime" label="Start Time" rules={[{ required: true, message: "Select start time" }]}>
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="endTime" label="End Time" rules={[{ required: true, message: "Select end time" }]}>
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message="Conflict checks"
                description="Before saving, this page checks: doctor overlap, classroom overlap, and section overlap for the same semester and time range."
              />
            </Col>
          </Row>
        ),
      },
      {
        title: "Classroom & Notes",
        content: (
          <>
            <Form.Item name="classroom" label="Classroom" rules={[{ required: true, message: "Select classroom" }]}>
              <Select placeholder="Select classroom" showSearch optionFilterProp="children">
                {classrooms.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.building} {c.roomNumber} (cap {c.capacity})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <TextArea rows={3} placeholder="Optional notes" />
            </Form.Item>
          </>
        ),
      },
    ],
    [classrooms, courses, professors, semesters]
  );

  return (
    <Card loading={loading}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            <CalendarOutlined /> Create Schedule
          </Title>
          <Text type="secondary">Checks conflicts before creating schedules. Handles duplicates safely.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<SaveOutlined />} onClick={saveDraft}>
              Save Draft
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={clearDraft}>
              Clear
            </Button>
          </Space>
        </Col>
      </Row>

      <Divider />

      {stepError && (
        <Alert type="error" showIcon message="Fix this before continuing" description={stepError} style={{ marginBottom: 16 }} />
      )}

      <Form form={form} layout="vertical" preserve>
        <Steps current={currentStep}>
          {steps.map((s) => (
            <Step key={s.title} title={s.title} />
          ))}
        </Steps>

        <div style={{ marginTop: 24 }}>{steps[currentStep].content}</div>
      </Form>

      <Space style={{ marginTop: 24 }}>
        {currentStep > 0 && (
          <Button icon={<ArrowLeftOutlined />} onClick={prev}>
            Previous
          </Button>
        )}

        {currentStep < steps.length - 1 && (
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={next}>
            Next
          </Button>
        )}

        {currentStep === steps.length - 1 && (
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit}>
            Submit
          </Button>
        )}
      </Space>

      {savedDraft?.savedAt && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Draft saved at: {new Date(savedDraft.savedAt).toLocaleString()}</Text>
        </div>
      )}
    </Card>
  );
}
