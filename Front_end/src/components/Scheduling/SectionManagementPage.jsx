import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Space,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
} from "antd";
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const API = "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

export default function SectionManagementPage() {
  const [form] = Form.useForm();
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [selectedSemester, setSelectedSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (selectedSemester) fetchSections();
  }, [selectedSemester]);

  const activeSemester = useMemo(
    () => semesters.find((s) => s.isActive),
    [semesters]
  );

  async function fetchAll() {
    try {
      setLoading(true);
      const [semRes, courseRes, docRes] = await Promise.all([
        axios.get(`${API}/api/admin/schedule/semesters`, { headers: authHeaders() }),
        axios.get(`${API}/api/courses`, { headers: authHeaders() }),
        axios.get(`${API}/api/doctors`, { headers: authHeaders() }),
      ]);

      if (semRes.data?.success) {
        setSemesters(semRes.data.data || []);
        const active = (semRes.data.data || []).find((s) => s.isActive);
        if (active) setSelectedSemester(active._id);
        else if (semRes.data.data?.length) setSelectedSemester(semRes.data.data[0]._id);
      }

      if (courseRes.data?.success) setCourses(courseRes.data.data || []);
      if (docRes.data?.success) setDoctors(docRes.data.data || []);
    } catch (e) {
      message.error("Failed to load data (semesters/courses/doctors)");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSections() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/sections?semesterId=${selectedSemester}`, {
        headers: authHeaders(),
      });
      if (res.data?.success) setSections(res.data.data || []);
      else setSections([]);
    } catch (e) {
      setSections([]);
      message.error("Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  }

  async function createSection(values) {
    try {
      setCreating(true);

      // ✅ IMPORTANT FIX: backend requires assignedDoctor
      const payload = {
        semester: selectedSemester || values.semester,
        course: values.course,
        assignedDoctor: values.assignedDoctor, // ✅ matches schema
        sectionNumber: String(values.sectionNumber).trim(),
        type: values.type,
        capacity: Number(values.capacity || 30),
        notes: values.notes || "",
      };

      const res = await axios.post(`${API}/api/sections`, payload, { headers: authHeaders() });
      if (res.data?.success) {
        message.success("Section created");
        form.resetFields();
        setModalOpen(false);
        fetchSections();
      } else {
        message.error(res.data?.error || "Failed to create section");
      }
    } catch (e) {
      message.error(e.response?.data?.error || "Section validation failed");
    } finally {
      setCreating(false);
    }
  }

  async function deleteSection(id) {
    try {
      const res = await axios.delete(`${API}/api/sections/${id}`, { headers: authHeaders() });
      if (res.data?.success) {
        message.success("Section deleted");
        fetchSections();
      } else {
        message.error("Failed to delete section");
      }
    } catch {
      message.error("Failed to delete section");
    }
  }

  const columns = [
    {
      title: "Course",
      dataIndex: "course",
      key: "course",
      render: (course) =>
        course ? (
          <Space direction="vertical" size={0}>
            <Text strong>{course.courseCode}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {course.courseName}
            </Text>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Section",
      dataIndex: "sectionNumber",
      key: "sectionNumber",
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Doctor",
      dataIndex: "assignedDoctor",
      key: "assignedDoctor",
      render: (d) => {
        const name =
          d?.user?.profile
            ? `${d.user.profile.firstName} ${d.user.profile.lastName}`
            : d?.employeeId || "—";
        return (
          <Space direction="vertical" size={0}>
            <Text>{name}</Text>
            {d?.employeeId && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {d.employeeId}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (v) => <Tag color={v === "Lab" ? "purple" : "geekblue"}>{v}</Tag>,
    },
    {
      title: "Capacity",
      dataIndex: "capacity",
      key: "capacity",
      render: (v) => v ?? "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <Popconfirm
          title="Delete section?"
          okText="Delete"
          okType="danger"
          onConfirm={() => deleteSection(row._id)}
        >
          <Button danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Sections</Title>
          <Text type="secondary">
            Create sections first. Generator schedules sections into time slots and classrooms.
          </Text>
        </div>

        <Card
          title="Select Semester"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchAll} />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                Add Section
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Select
                style={{ width: "100%" }}
                value={selectedSemester}
                onChange={setSelectedSemester}
                placeholder="Select semester"
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
            </Col>
          </Row>
        </Card>

        <Card title={`Sections (${sections.length})`} loading={loading}>
          <Table rowKey="_id" columns={columns} dataSource={sections} pagination={{ pageSize: 10 }} />
        </Card>
      </Space>

      <Modal
        title="Create Section"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        okText="Create"
        confirmLoading={creating}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createSection}
          initialValues={{ type: "Lecture", capacity: 30 }}
        >
          <Row gutter={16}>
            {!selectedSemester && (
              <Col span={12}>
                <Form.Item
                  name="semester"
                  label="Semester"
                  rules={[{ required: true, message: "Select semester" }]}
                >
                  <Select placeholder="Select semester">
                    {semesters.map((s) => (
                      <Option key={s._id} value={s._id}>
                        {s.name} {s.year}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}

            <Col span={12}>
              <Form.Item
                name="course"
                label="Course"
                rules={[{ required: true, message: "Select course" }]}
              >
                <Select placeholder="Select course" showSearch optionFilterProp="children">
                  {courses.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.courseCode} - {c.courseName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="assignedDoctor"
                label="Doctor"
                rules={[{ required: true, message: "Select doctor" }]}
              >
                <Select placeholder="Select doctor" showSearch optionFilterProp="children">
                  {doctors.map((d) => {
                    const name =
                      d?.user?.profile
                        ? `${d.user.profile.firstName} ${d.user.profile.lastName}`
                        : d?.employeeId || "Doctor";
                    return (
                      <Option key={d._id} value={d._id}>
                        {name} {d.employeeId ? `(${d.employeeId})` : ""}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="sectionNumber"
                label="Section Number"
                rules={[{ required: true, message: "Enter section number" }]}
              >
                <Input placeholder="e.g. 1 or 01 or A" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="Lecture">Lecture</Option>
                  <Option value="Lab">Lab</Option>
                  <Option value="Tutorial">Tutorial</Option>
                  <Option value="Seminar">Seminar</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="capacity" label="Capacity">
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="notes" label="Notes (optional)">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Card size="small" style={{ marginTop: 12, background: "#fafafa" }}>
          <Text strong>What is a Section?</Text>
          <div style={{ marginTop: 6 }}>
            A Section links <b>Semester + Course + Doctor</b>. The generator schedules sections into
            <b> time slots</b> and <b>classrooms</b>.
          </div>
        </Card>
      </Modal>
    </div>
  );
}
