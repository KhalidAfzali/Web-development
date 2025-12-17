import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  Form,
  Input,
  List,
  message,
  Modal,
  Popover,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileAddOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./SchedulePage.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { Countdown } = Statistic;
const { TextArea } = Input;

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getToken = () => localStorage.getItem("authToken") || "";

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
  const [h, m] = t.split(":").map((x) => Number(x));
  return h * 60 + m;
};

const getId = (x) => (x && typeof x === "object" && x._id ? String(x._id) : String(x || ""));

const pad3 = (n) => String(Number(n)).padStart(3, "0");

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

const getStatusColor = (status) => {
  switch (status) {
    case "Published":
      return "green";
    case "Validated":
      return "blue";
    case "Draft":
      return "orange";
    case "Cancelled":
      return "red";
    default:
      return "default";
  }
};

const showConflictsModal = (title, conflicts) => {
  Modal.error({
    title,
    width: 700,
    content: (
      <div>
        {(conflicts || []).map((c, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
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

  // schedule conflict
  if (status === 409 && data?.error === "SCHEDULE_CONFLICT") {
    return { kind: "conflict", message: data.message || "Schedule conflict", conflicts: data.conflicts || [] };
  }

  // section duplicate
  if (status === 409 && data?.error === "DUPLICATE_SECTION") {
    return { kind: "dup_section", message: data.message || "Duplicate section", keyValue: data.keyValue };
  }

  const msg =
    data?.message ||
    data?.error ||
    err?.message ||
    "Request failed";

  return { kind: "generic", message: msg };
};

const StatisticCard = ({ title, value, icon, color }) => (
  <Space direction="vertical" align="center" style={{ width: "100%" }}>
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: `${color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
      }}
    >
      {React.cloneElement(icon, { style: { fontSize: 24, color } })}
    </div>
    <Text strong style={{ fontSize: 24 }}>
      {value}
    </Text>
    <Text type="secondary">{title}</Text>
  </Space>
);

/* -------------------- Quick Add Modal (admin only) -------------------- */

const QuickAddModal = ({
  open,
  onCancel,
  onSuccess,
  semesters,
  selectedSemester,
  professors,
  courses,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/api/classrooms");
        if (res.data?.success) setClassrooms(res.data.data || []);
      } catch (e) {
        message.error("Failed to fetch classrooms");
      }
    })();
  }, [open]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const semesterId = selectedSemester && selectedSemester !== "all" ? selectedSemester : values.semester;

      // basic validation
      if (!semesterId || semesterId === "all") {
        message.error("Select semester first.");
        return;
      }
      if (!values.course) {
        message.error("Select course.");
        return;
      }
      if (!values.professor) {
        message.error("Select professor.");
        return;
      }
      if (!values.classroom) {
        message.error("Select classroom.");
        return;
      }
      if (!values.day) {
        message.error("Select day.");
        return;
      }
      if (!isTimeHHMM(values.startTime) || !isTimeHHMM(values.endTime)) {
        message.error("Time must be HH:MM (24h). Example 09:00");
        return;
      }
      const sMin = timeToMin(values.startTime);
      const eMin = timeToMin(values.endTime);
      if (sMin == null || eMin == null || eMin <= sMin) {
        message.error("End time must be after start time.");
        return;
      }

      // STEP 1: load all sections for semester
      const secRes = await api.get("/api/sections", { params: { semesterId } });
      const allSections = secRes.data?.data || [];

      // STEP 2: auto-pick free section number (avoid E11000)
      const sectionNumber = nextSectionNumber(allSections, semesterId, values.course);

      // IMPORTANT: uniqueness is semester+course+sectionNumber. Not doctor.
      let section = allSections.find(
        (s) => getId(s.semester) === String(semesterId) &&
               getId(s.course) === String(values.course) &&
               String(s.sectionNumber) === String(sectionNumber)
      );

      let sectionId = section?._id;

      // STEP 3: create section if missing
      if (!sectionId) {
        try {
          const createSecRes = await api.post("/api/sections", {
            semester: semesterId,
            course: values.course,
            assignedDoctor: values.professor, // ok
            sectionNumber,
            type: values.type || "Lecture",
            capacity: 30,
            notes: values.notes || "",
          });
          sectionId = createSecRes.data?.data?._id;
        } catch (err) {
          const parsed = parseApiError(err);
          if (parsed.kind === "dup_section") {
            message.error(parsed.message);
            return;
          }
          message.error(parsed.message || "Section creation failed.");
          return;
        }
      }

      if (!sectionId) {
        message.error("Section creation failed.");
        return;
      }

      const scheduleData = {
        semester: semesterId,
        section: sectionId,
        course: values.course,
        doctor: values.professor,
        classroom: values.classroom,
        scheduleSlots: [
          {
            day: values.day,
            startTime: values.startTime,
            endTime: values.endTime,
            type: values.type || "Lecture",
          },
        ],
        status: "Draft",
        notes: values.notes || "",
      };

      // STEP 4: check conflicts BEFORE create
      try {
        const check = await api.post("/api/schedules/check-conflicts", {
          semester: semesterId,
          section: sectionId,
          doctor: values.professor,
          classroom: values.classroom,
          scheduleSlots: scheduleData.scheduleSlots,
        });

        const conflicts = check.data?.conflicts || [];
        if (conflicts.length) {
          showConflictsModal("Cannot add schedule", conflicts);
          return;
        }
      } catch (err) {
        // if check-conflicts fails, do not create schedule
        const parsed = parseApiError(err);
        message.error(parsed.message || "Failed to check conflicts.");
        return;
      }

      // STEP 5: create schedule (backend also enforces conflicts)
      try {
        const response = await api.post("/api/schedules", scheduleData);

        if (response.data?.success) {
          message.success(`Schedule added (Section ${sectionNumber})`);
          form.resetFields();
          onSuccess?.();
        } else {
          message.error(response.data?.message || "Failed to add schedule");
        }
      } catch (err) {
        const parsed = parseApiError(err);
        if (parsed.kind === "conflict") {
          showConflictsModal("Schedule conflict", parsed.conflicts);
          return;
        }
        message.error(parsed.message || "Failed to add schedule");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Quick Add Schedule"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Add Schedule"
      cancelText="Cancel"
      confirmLoading={loading}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ day: "Monday", type: "Lecture" }}
      >
        <Row gutter={16}>
          {(!selectedSemester || selectedSemester === "all") && (
            <Col span={12}>
              <Form.Item name="semester" label="Semester" rules={[{ required: true }]}>
                <Select placeholder="Select semester">
                  {semesters.map((s) => (
                    <Select.Option key={s._id} value={s._id}>
                      {s.name} {s.year}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          )}

          <Col span={12}>
            <Form.Item name="course" label="Course" rules={[{ required: true }]}>
              <Select placeholder="Select course" showSearch optionFilterProp="children">
                {courses.map((c) => (
                  <Select.Option key={c._id} value={c._id}>
                    {c.courseCode} - {c.courseName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="professor" label="Professor" rules={[{ required: true }]}>
              <Select placeholder="Select professor" showSearch optionFilterProp="children">
                {professors.map((p) => (
                  <Select.Option key={p._id} value={p._id}>
                    {p.user?.profile?.firstName} {p.user?.profile?.lastName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="day" label="Day" rules={[{ required: true }]}>
              <Select>
                {dayNames.map((d) => (
                  <Select.Option key={d} value={d}>
                    {d}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="startTime"
              label="Start Time"
              rules={[
                { required: true },
                { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Use HH:MM (24h)" },
              ]}
            >
              <Input placeholder="09:00" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="endTime"
              label="End Time"
              rules={[
                { required: true },
                { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Use HH:MM (24h)" },
              ]}
            >
              <Input placeholder="10:30" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="classroom" label="Classroom" rules={[{ required: true }]}>
              <Select placeholder="Select classroom" showSearch optionFilterProp="children">
                {classrooms.map((r) => (
                  <Select.Option key={r._id} value={r._id}>
                    {r.building} {r.roomNumber} ({r.capacity} seats)
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="type" label="Type">
              <Select>
                <Select.Option value="Lecture">Lecture</Select.Option>
                <Select.Option value="Lab">Lab</Select.Option>
                <Select.Option value="Tutorial">Tutorial</Select.Option>
                <Select.Option value="Seminar">Seminar</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Notes (Optional)">
          <TextArea rows={2} placeholder="Add any notes..." />
        </Form.Item>

        <Alert
          type="info"
          showIcon
          message="Conflict prevention"
          description="This will block saving if doctor/classroom overlaps or other conflicts exist."
        />
      </Form>
    </Modal>
  );
};

/* -------------------- Main Page -------------------- */

const SchedulePage = ({ isAdmin = false }) => {
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedProfessor, setSelectedProfessor] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [professors, setProfessors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);

  const [calendarMode, setCalendarMode] = useState("month");
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  const filteredSchedules = useMemo(() => {
    let list = [...schedules];
    if (isAdmin) {
      if (selectedProfessor !== "all")
        list = list.filter((s) => String(s.doctor?._id) === String(selectedProfessor));
      if (selectedCourse !== "all")
        list = list.filter((s) => String(s.course?._id) === String(selectedCourse));
      if (selectedStatus !== "all")
        list = list.filter((s) => String(s.status) === String(selectedStatus));
    }
    return list;
  }, [schedules, isAdmin, selectedProfessor, selectedCourse, selectedStatus]);

  const stats = useMemo(() => {
    const published = schedules.filter((s) => s.status === "Published").length;
    const draft = schedules.filter((s) => s.status === "Draft").length;
    const validated = schedules.filter((s) => s.status === "Validated").length;
    const classroomsUsed = new Set(schedules.map((s) => s.classroom?._id).filter(Boolean)).size;
    return { total: schedules.length, published, draft, validated, classrooms: classroomsUsed };
  }, [schedules]);

  const getSelectedSemesterName = useCallback(() => {
    if (selectedSemester === "all") return "All Semesters";
    const sem = semesters.find((s) => String(s._id) === String(selectedSemester));
    return sem ? `${sem.name} ${sem.year}` : "Select Semester";
  }, [selectedSemester, semesters]);

  const fetchSemesters = useCallback(async () => {
    try {
      const res = await api.get("/api/semesters");
      if (res.data?.success) {
        const data = res.data.data || [];
        setSemesters(data);
        const active = data.find((s) => s.isActive);
        if (active) {
          setActiveSemester(active);
          setSelectedSemester(active._id);
        } else if (data.length) {
          setActiveSemester(null);
          setSelectedSemester(data[0]._id);
        } else {
          setActiveSemester(null);
          setSelectedSemester("");
        }
      } else {
        message.error(res.data?.message || "Failed to fetch semesters");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to fetch semesters");
    }
  }, []);

  const fetchProfessors = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/api/doctors");
      if (res.data?.success) setProfessors(res.data.data || []);
    } catch {
      message.error("Failed to fetch professors");
    }
  }, [isAdmin]);

  const fetchCourses = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/api/courses");
      if (res.data?.success) setCourses(res.data.data || []);
    } catch {
      message.error("Failed to fetch courses");
    }
  }, [isAdmin]);

  const fetchSchedules = useCallback(async () => {
    if (!selectedSemester) return;

    setLoading(true);
    try {
      const params = {};
      if (selectedSemester !== "all") params.semesterId = selectedSemester;

      const res = await api.get("/api/schedules", { params });

      if (res.data?.success) {
        setSchedules(res.data.data || []);
      } else {
        message.error(res.data?.message || "Failed to fetch schedules");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to fetch schedules");
    } finally {
      setLoading(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    fetchSemesters();
    fetchProfessors();
    fetchCourses();
  }, [fetchSemesters, fetchProfessors, fetchCourses]);

  useEffect(() => {
    if (selectedSemester) fetchSchedules();
  }, [selectedSemester, fetchSchedules]);

  const handleCreateNew = () => navigate("/admin/schedule/create");
  const handleBack = () => navigate("/admin/schedule");
  const handleQuickAdd = () => setShowQuickAddModal(true);
  const handleEditSchedule = (schedule) => navigate(`/admin/schedule/edit/${schedule._id}`);

  const handleDeleteSchedule = (scheduleId) => {
    Modal.confirm({
      title: "Delete Schedule",
      content: "Are you sure you want to delete this schedule?",
      okText: "Delete",
      cancelText: "Cancel",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await api.delete(`/api/schedules/${scheduleId}`);
          if (res.data?.success) {
            message.success("Schedule deleted successfully");
            fetchSchedules();
          } else {
            message.error(res.data?.message || "Failed to delete schedule");
          }
        } catch (e) {
          message.error(e.response?.data?.message || "Failed to delete schedule");
        }
      },
    });
  };

  const dateCellRender = (date) => {
    const dayName = dayNames[date.day()];
    const daySchedules = filteredSchedules.filter((sch) =>
      (sch.scheduleSlots || []).some((slot) => slot.day === dayName)
    );

    if (!daySchedules.length) return null;

    return (
      <div className="events">
        {daySchedules.slice(0, 2).map((schedule) => {
          const slot =
            schedule.scheduleSlots?.find((s) => s.day === dayName) || schedule.scheduleSlots?.[0];

          return (
            <Popover
              key={schedule._id}
              trigger="click"
              placement="right"
              destroyTooltipOnHide
              title={
                <Space>
                  <Text strong>{schedule.course?.courseCode || "N/A"}</Text>
                  <Tag color={getStatusColor(schedule.status)}>{schedule.status}</Tag>
                </Space>
              }
              content={
                <div
                  className="schedule-details"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p>
                    <strong>Course:</strong> {schedule.course?.courseCode} - {schedule.course?.courseName}
                  </p>
                  <p>
                    <strong>Professor:</strong>{" "}
                    {schedule.doctor?.employeeId ||
                      `${schedule.doctor?.user?.profile?.firstName || ""} ${schedule.doctor?.user?.profile?.lastName || ""}`.trim() ||
                      "N/A"}
                  </p>
                  <p>
                    <strong>Classroom:</strong> {schedule.classroom?.building} {schedule.classroom?.roomNumber}
                  </p>
                  <p>
                    <strong>Time:</strong> {slot?.startTime} - {slot?.endTime}
                  </p>
                  <p>
                    <strong>Type:</strong> {slot?.type}
                  </p>

                  {isAdmin && (
                    <Space style={{ marginTop: 8 }}>
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleEditSchedule(schedule)}>
                        Edit
                      </Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSchedule(schedule._id)}>
                        Delete
                      </Button>
                    </Space>
                  )}
                </div>
              }
            >
              <div className="event-item" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <div className="event-header">
                  <Text strong style={{ fontSize: 12 }}>
                    {schedule.course?.courseCode || "N/A"}
                  </Text>
                  {schedule.status === "Draft" && <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 12 }} />}
                </div>
                <div className="event-time">
                  <ClockCircleOutlined style={{ fontSize: 10 }} />
                  <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                    {slot?.startTime}
                  </Text>
                </div>
              </div>
            </Popover>
          );
        })}

        {daySchedules.length > 2 && (
          <div className="more-events">
            <Text type="secondary" style={{ fontSize: 11 }}>
              +{daySchedules.length - 2} more
            </Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div>
          <Title level={2}>
            <CalendarOutlined /> Schedule {isAdmin ? "Management" : "Viewer"}
          </Title>
          <Text type="secondary">
            {isAdmin ? "Manage and view all course schedules" : "Your teaching schedule"}
            {selectedSemester && <span> • {getSelectedSemesterName()}</span>}
          </Text>
        </div>

        <Space>
          {isAdmin && (
            <>
              <Button icon={<PlusOutlined />} onClick={handleBack}>
                Back
              </Button>

              <Button type="primary" icon={<FileAddOutlined />} onClick={handleCreateNew}>
                Create Schedule
              </Button>

              <Button icon={<PlusOutlined />} onClick={handleQuickAdd}>
                Quick Add
              </Button>
            </>
          )}

          <Button icon={<DownloadOutlined />} onClick={() => message.info("Export coming soon")}>
            Export
          </Button>
          <Button onClick={() => window.print()}>Print</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchSchedules} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      {activeSemester && (
        <Alert
          message={
            <Space>
              <BookOutlined />
              <span>
                <strong>Active Semester:</strong> {activeSemester.name} {activeSemester.year} •{" "}
                <Text type="secondary">
                  {activeSemester.startDate ? new Date(activeSemester.startDate).toLocaleDateString() : "N/A"} -{" "}
                  {activeSemester.endDate ? new Date(activeSemester.endDate).toLocaleDateString() : "N/A"}
                </Text>
              </span>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            activeSemester.endDate ? (
              <Countdown title="Ends in" value={new Date(activeSemester.endDate)} format="D [days] H [hours]" />
            ) : null
          }
        />
      )}

      <Card className="filters-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              <BookOutlined /> Semester
            </Text>
            <Select
              placeholder="Select Semester"
              style={{ width: "100%" }}
              value={selectedSemester || undefined}
              onChange={setSelectedSemester}
            >
              <Option value="all">All Semesters</Option>
              {semesters.map((s) => (
                <Option key={s._id} value={s._id}>
                  {s.name} {s.year} {s.isActive && <Tag color="green" style={{ marginLeft: 8, fontSize: 10 }}>Active</Tag>}
                </Option>
              ))}
            </Select>
          </Col>

          {isAdmin && (
            <>
              <Col xs={24} sm={6}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  <FilterOutlined /> Professor
                </Text>
                <Select style={{ width: "100%" }} value={selectedProfessor} onChange={setSelectedProfessor}>
                  <Option value="all">All Professors</Option>
                  {professors.map((p) => (
                    <Option key={p._id} value={p._id}>
                      {p.user?.profile?.firstName} {p.user?.profile?.lastName}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} sm={6}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  Filter by Course
                </Text>
                <Select style={{ width: "100%" }} value={selectedCourse} onChange={setSelectedCourse}>
                  <Option value="all">All Courses</Option>
                  {courses.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.courseCode} - {c.courseName}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} sm={6}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  Filter by Status
                </Text>
                <Select style={{ width: "100%" }} value={selectedStatus} onChange={setSelectedStatus}>
                  <Option value="all">All Status</Option>
                  <Option value="Draft">Draft</Option>
                  <Option value="Validated">Validated</Option>
                  <Option value="Published">Published</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </Col>
            </>
          )}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" hoverable>
            <StatisticCard title="Total Classes" value={stats.total} icon={<CalendarOutlined />} color="#1890ff" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" hoverable>
            <StatisticCard title="Published" value={stats.published} icon={<CheckCircleOutlined />} color="#52c41a" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" hoverable>
            <StatisticCard title="In Draft" value={stats.draft} icon={<ExclamationCircleOutlined />} color="#faad14" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" hoverable>
            <StatisticCard title="Classrooms Used" value={stats.classrooms} icon={<BankOutlined />} color="#722ed1" />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <CalendarOutlined />
            <span>Academic Calendar</span>
            <Badge count={filteredSchedules.length} style={{ backgroundColor: "#1890ff" }} />
            <Text type="secondary" style={{ fontSize: 14 }}>
              {getSelectedSemesterName()}
            </Text>
          </Space>
        }
        className="calendar-card"
        loading={loading}
        extra={
          <Space>
            <Select value={calendarMode} onChange={setCalendarMode} size="small" style={{ width: 100 }}>
              <Option value="month">Month</Option>
              <Option value="week">Week</Option>
            </Select>
            <Button size="small" onClick={fetchSchedules} icon={<ReloadOutlined />} />
          </Space>
        }
      >
        <Calendar cellRender={dateCellRender} mode={calendarMode} onPanelChange={(_, mode) => setCalendarMode(mode)} />
      </Card>

      <Card
        title={
          <Space>
            <span>Schedule List</span>
            <Tag color="blue">{filteredSchedules.length} schedules</Tag>
            <Tag color="green">{stats.published} published</Tag>
            <Tag color="orange">{stats.draft} draft</Tag>
          </Space>
        }
        className="list-card"
        style={{ marginTop: 24 }}
      >
        <List
          dataSource={filteredSchedules}
          renderItem={(schedule) => (
            <List.Item
              actions={
                isAdmin
                  ? [
                      <Tooltip key="e" title="Edit schedule">
                        <Button type="link" icon={<EditOutlined />} onClick={() => handleEditSchedule(schedule)} />
                      </Tooltip>,
                      <Tooltip key="d" title="Delete schedule">
                        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSchedule(schedule._id)} />
                      </Tooltip>,
                      <Tooltip key="v" title="View details">
                        <Button type="link" icon={<EyeOutlined />} />
                      </Tooltip>,
                    ]
                  : [<Button key="v2" type="link" icon={<EyeOutlined />}>View Details</Button>]
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>
                      {schedule.course?.courseCode} - {schedule.course?.courseName}
                    </Text>
                    <Tag color={getStatusColor(schedule.status)}>{schedule.status}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Space>
                      <ClockCircleOutlined />
                      <Text type="secondary">
                        {(schedule.scheduleSlots || [])
                          .map((slot) => `${slot.day} ${slot.startTime}-${slot.endTime} (${slot.type})`)
                          .join(", ")}
                      </Text>
                    </Space>
                    <Space>
                      <BankOutlined />
                      <Text type="secondary">
                        {schedule.classroom?.building} {schedule.classroom?.roomNumber}
                        {schedule.classroom?.capacity ? ` (${schedule.classroom.capacity} seats)` : ""}
                      </Text>
                    </Space>
                    {isAdmin && schedule.doctor && (
                      <Space>
                        <TeamOutlined />
                        <Text type="secondary">
                          Professor: {schedule.doctor?.employeeId}{" "}
                          {schedule.doctor?.user?.profile
                            ? `- ${schedule.doctor.user.profile.firstName} ${schedule.doctor.user.profile.lastName}`
                            : ""}
                        </Text>
                      </Space>
                    )}
                    {schedule.semester && (
                      <Space>
                        <BookOutlined />
                        <Text type="secondary">
                          Semester: {schedule.semester.name} {schedule.semester.year}
                        </Text>
                      </Space>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{
            emptyText: (
              <div className="schedule-empty">
                <CalendarOutlined className="schedule-empty-icon" />
                <div className="schedule-empty-text">No schedules found for {getSelectedSemesterName()}</div>
                {isAdmin && (
                  <Space>
                    <Button type="primary" onClick={handleCreateNew}>
                      Create Schedule
                    </Button>
                    <Button onClick={handleQuickAdd}>Quick Add</Button>
                  </Space>
                )}
              </div>
            ),
          }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} schedules` }}
        />
      </Card>

      {isAdmin && (
        <QuickAddModal
          open={showQuickAddModal}
          onCancel={() => setShowQuickAddModal(false)}
          onSuccess={() => {
            fetchSchedules();
            setShowQuickAddModal(false);
          }}
          semesters={semesters}
          selectedSemester={selectedSemester}
          professors={professors}
          courses={courses}
        />
      )}
    </div>
  );
};

export default SchedulePage;
