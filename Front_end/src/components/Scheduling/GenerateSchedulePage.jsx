import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Select,
  message,
  Tag,
  Alert,
  Modal,
  Row,
  Col,
  Space,
  Typography,
  Steps,
  Progress,
  Statistic,
} from "antd";
import {
  RocketOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  ReloadOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./GenerateSchedulePage.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

const API = "http://localhost:5000";
function authHeaders() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

export default function GenerateSchedulePage() {
  const navigate = useNavigate();

  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const [counts, setCounts] = useState({ sections: 0, timeslots: 0, classrooms: 0 });
  const [result, setResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchPrerequisites();
      setStep(0);
      setResult(null);
      setValidationResult(null);
    }
  }, [selectedSemester]);

  const activeSemester = useMemo(
    () => semesters.find((s) => s.isActive),
    [semesters]
  );

  const canGenerate = counts.sections > 0 && counts.timeslots > 0 && counts.classrooms > 0;

  async function fetchSemesters() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/admin/schedule/semesters`, { headers: authHeaders() });
      if (res.data?.success) {
        const data = res.data.data || [];
        setSemesters(data);
        const active = data.find((s) => s.isActive);
        if (active) setSelectedSemester(active._id);
        else if (data.length) setSelectedSemester(data[0]._id);
      }
    } catch {
      message.error("Failed to fetch semesters");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPrerequisites() {
    try {
      const [secRes, slotRes, roomRes] = await Promise.all([
        axios.get(`${API}/api/sections?semesterId=${selectedSemester}`, { headers: authHeaders() }),
        axios.get(`${API}/api/timeslots?semesterId=${selectedSemester}`, { headers: authHeaders() }),
        axios.get(`${API}/api/classrooms`, { headers: authHeaders() }),
      ]);

      setCounts({
        sections: secRes.data?.success ? (secRes.data.data || []).length : 0,
        timeslots: slotRes.data?.success ? (slotRes.data.data || []).length : 0,
        classrooms: roomRes.data?.success ? (roomRes.data.data || []).length : 0,
      });
    } catch {
      setCounts({ sections: 0, timeslots: 0, classrooms: 0 });
      message.error("Failed to load prerequisites");
    }
  }

  function simulateProgress() {
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          return 100;
        }
        return p + 10;
      });
    }, 180);
  }

  async function handleGenerate() {
    if (!selectedSemester) return message.warning("Select a semester");
    if (!canGenerate) {
      return Modal.info({
        title: "Missing data",
        content: (
          <div>
            <p>You must create these first:</p>
            <ul>
              <li>Sections (Semester + Course + Doctor)</li>
              <li>Time Slots</li>
              <li>Classrooms</li>
            </ul>
          </div>
        ),
      });
    }

    Modal.confirm({
      title: "Generate Schedule",
      content: "This will generate schedules for the selected semester. Continue?",
      okText: "Generate",
      onOk: async () => {
        try {
          setGenerating(true);
          simulateProgress();

          const res = await axios.post(`${API}/api/admin/schedules/generate`, { semesterId: selectedSemester }, { headers: authHeaders() });


          if (res.data?.success) {
            setResult(res.data.data);
            setStep(1);
            message.success("Generation completed");
          } else {
            message.error(res.data?.error || "Generation failed");
          }
        } catch (e) {
          message.error(e.response?.data?.error || "Failed to generate schedule");
        } finally {
          setGenerating(false);
          setProgress(100);
          fetchPrerequisites();
        }
      },
    });
  }

  async function handleValidate() {
    try {
      setValidating(true);
      const res = await axios.post(`${API}/api/admin/schedules/validate`, { semesterId: selectedSemester }, { headers: authHeaders() });


      if (res.data?.success) {
        setValidationResult(res.data.data);
        if (res.data.data?.hasErrors) message.warning("Validation found errors");
        else {
          message.success("Validation passed");
          setStep(2);
        }
      } else {
        message.error(res.data?.error || "Validation failed");
      }
    } catch {
      message.error("Failed to validate schedule");
    } finally {
      setValidating(false);
    }
  }

  async function handlePublish() {
    Modal.confirm({
      title: "Publish Schedule",
      content: "Publish will make schedule live. Continue?",
      okText: "Publish",
      onOk: async () => {
        try {
          setPublishing(true);
          const res = await axios.post(
            `${API}/api/admin/schedule/publish`,
            { semesterId: selectedSemester },
            { headers: authHeaders() }
          );

          if (res.data?.success) {
            message.success("Schedule published");
            setStep(3);
          } else {
            message.error(res.data?.error || "Publish failed");
          }
        } catch {
          message.error("Failed to publish schedule");
        } finally {
          setPublishing(false);
        }
      },
    });
  }

  const selected = semesters.find((s) => s._id === selectedSemester);

  return (
    <div className="generate-schedule-page">
      <div className="page-header">
        <Title level={2} style={{ marginBottom: 4 }}>
          <RocketOutlined /> Auto Schedule Generation
        </Title>
        <Text type="secondary">Generate schedules after you create Sections and Time Slots.</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col span={24} lg={16}>
          <Card
            className="control-card"
            title="Workflow"
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchPrerequisites}>
                  Refresh
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => navigate("/admin/semesters")}>
                  Create semester
                </Button>
                <Button onClick={() => navigate("/admin")}>
                  Dashboard
                </Button>
              </Space>
            }
          >
            <Steps current={step} style={{ marginBottom: 24 }}>
              <Step title="Setup" />
              <Step title="Generate" />
              <Step title="Validate" />
              <Step title="Publish" />
            </Steps>

            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  <CalendarOutlined /> Select Semester
                </Text>
                <Select
                  style={{ width: "100%" }}
                  value={selectedSemester}
                  onChange={setSelectedSemester}
                  placeholder="Select semester"
                  loading={loading}
                >
                  {semesters.map((s) => (
                    <Option key={s._id} value={s._id}>
                      {s.name} {s.year} {s.isActive ? "(Active)" : ""}
                    </Option>
                  ))}
                </Select>
                {activeSemester && (
                  <div style={{ marginTop: 10 }}>
                    <Tag color="green">Active: {activeSemester.name} {activeSemester.year}</Tag>
                  </div>
                )}
              </div>

              <Alert
                type={canGenerate ? "success" : "warning"}
                showIcon
                message={canGenerate ? "Ready to generate" : "Missing required data"}
                description={
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={8}>
                      <Statistic title="Sections" value={counts.sections} prefix={<AppstoreOutlined />} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="Time Slots" value={counts.timeslots} prefix={<ClockCircleOutlined />} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="Classrooms" value={counts.classrooms} />
                    </Col>

                    {!canGenerate && (
                      <Col span={24} style={{ marginTop: 12 }}>
                        <Space>
                          <Button icon={<PlusOutlined />} onClick={() => navigate("/admin/sections")}>
                            Create Sections
                          </Button>
                          <Button icon={<PlusOutlined />} onClick={() => navigate("/admin/timeslots")}>
                            Create Time Slots
                          </Button>
                          <Button icon={<PlusOutlined />} onClick={() => navigate("/admin/classrooms")}>
                            Add Classrooms
                          </Button>
                        </Space>
                      </Col>
                    )}
                  </Row>
                }
              />

              <Button
                type="primary"
                size="large"
                block
                disabled={!selectedSemester || !canGenerate}
                loading={generating}
                icon={<RocketOutlined />}
                onClick={handleGenerate}
              >
                Generate
              </Button>

              {generating && <Progress percent={progress} status="active" />}

              {step >= 1 && result && (
                <Card size="small" style={{ background: "#fafafa" }}>
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="Generated" value={result.generated || 0} /></Col>
                    <Col span={8}><Statistic title="Unassigned" value={result.unassigned || 0} /></Col>
                    <Col span={8}><Statistic title="Conflicts" value={(result.conflicts || []).length} /></Col>
                  </Row>

                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      onClick={handleValidate}
                      loading={validating}
                      block
                    >
                      Validate
                    </Button>
                    
                  </div>
                </Card>
              )}

              {step >= 2 && validationResult && (
                <Card size="small" style={{ background: "#fafafa" }}>
                  <Alert
                    type={validationResult.hasErrors ? "error" : "success"}
                    showIcon
                    message={validationResult.hasErrors ? "Validation failed" : "Validation passed"}
                    description={`Conflicts: ${(validationResult.conflicts || []).length}`}
                  />

                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handlePublish}
                      loading={publishing}
                      disabled={validationResult.hasErrors}
                      block
                    >
                      Publish
                    </Button>
                  </div>
                </Card>
              )}

              {step === 3 && (
                <Alert
                  type="success"
                  showIcon
                  message="Published"
                  description={
                    <Space direction="vertical">
                      <div>Semester: {selected ? `${selected.name} ${selected.year}` : "—"}</div>
                      <Button type="primary" onClick={() => navigate("/admin/schedule/view")}>
                        View Schedule
                      </Button>
                    </Space>
                  }
                />
              )}
            </Space>
          </Card>
        </Col>

        <Col span={24} lg={8}>
          <Card title="What you must create first">
            <Space direction="vertical">
              <Alert
                showIcon
                type="info"
                message="Order"
                description={
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Create Semester</li>
                    <li>Add Courses</li>
                    <li>Add Doctors</li>
                    <li>Create Sections (Semester + Course + Doctor)</li>
                    <li>Create Time Slots</li>
                    <li>Add Classrooms</li>
                    <li>Generate</li>
                  </ol>
                }
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
