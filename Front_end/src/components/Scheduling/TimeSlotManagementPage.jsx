import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Table,
    Button,
    Modal,
    Form,
    Select,
    Input,
    Space,
    message,
    Tag,
    Typography,
    Popconfirm,
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimeSlotManagementPage() {
    const [form] = Form.useForm();
    const [semesters, setSemesters] = useState([]);
    const [selectedSemester, setSelectedSemester] = useState("");
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (selectedSemester) fetchSlots();
    }, [selectedSemester]);

    const activeSemester = useMemo(
        () => semesters.find((s) => s.isActive),
        [semesters]
    );

    async function fetchSemesters() {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/admin/schedule/semesters`, { headers: authHeaders() });
            if (res.data?.success) {
                setSemesters(res.data.data || []);
                const active = (res.data.data || []).find((s) => s.isActive);
                if (active) setSelectedSemester(active._id);
                else if (res.data.data?.length) setSelectedSemester(res.data.data[0]._id);
            }
        } catch {
            message.error("Failed to fetch semesters");
        } finally {
            setLoading(false);
        }
    }

    async function fetchSlots() {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/timeslots?semesterId=${selectedSemester}`, {
                headers: authHeaders(),
            });
            if (res.data?.success) setSlots(res.data.data || []);
            else setSlots([]);
        } catch {
            setSlots([]);
            message.error("Failed to fetch time slots");
        } finally {
            setLoading(false);
        }
    }

  async function createSlot(values) {
  try {
    if (!selectedSemester) {
      message.warning("Select semester first");
      return;
    }

    setCreating(true);

    const payload = {
      semester: selectedSemester,
      day: values.day,
      startTime: String(values.startTime).trim(),
      endTime: String(values.endTime).trim(),
      label: values.label ? String(values.label).trim() : "",
    };

    const res = await axios.post(`${API}/api/timeslots`, payload, {
      headers: authHeaders(),
    });

    if (res.data?.success) {
      message.success("Time slot created");
      form.resetFields();
      setModalOpen(false);
      fetchSlots();
    } else {
      message.error(res.data?.error || "Failed to create time slot");
    }
  } catch (e) {
    message.error(e.response?.data?.error || "Failed to create time slot");
  } finally {
    setCreating(false);
  }
}


    async function deleteSlot(id) {
        try {
            const res = await axios.delete(`${API}/api/timeslots/${id}`, { headers: authHeaders() });
            if (res.data?.success) {
                message.success("Time slot deleted");
                fetchSlots();
            } else {
                message.error("Failed to delete time slot");
            }
        } catch {
            message.error("Failed to delete time slot");
        }
    }

    const columns = [
        { title: "Day", dataIndex: "day", key: "day", render: (v) => <Tag color="blue">{v}</Tag> },
        { title: "Start", dataIndex: "startTime", key: "startTime" },
        { title: "End", dataIndex: "endTime", key: "endTime" },
        { title: "Label", dataIndex: "label", key: "label", render: (v) => v || "—" },
        {
            title: "Actions",
            key: "actions",
            render: (_, row) => (
                <Popconfirm title="Delete slot?" okText="Delete" okType="danger" onConfirm={() => deleteSlot(row._id)}>
                    <Button danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Time Slots</Title>
                    <Text type="secondary">Create time slots per semester. Generator needs these.</Text>
                </div>

                <Card
                    title="Select Semester"
                    extra={
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchSemesters} />
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                                Add Time Slot
                            </Button>
                        </Space>
                    }
                >
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
                </Card>

                <Card title={`Time Slots (${slots.length})`} loading={loading}>
                    <Table rowKey="_id" columns={columns} dataSource={slots} pagination={{ pageSize: 10 }} />
                </Card>
            </Space>

            <Modal
                title="Create Time Slot"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                okText="Create"
                confirmLoading={creating}
                onOk={() => form.submit()}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={createSlot}
                    initialValues={{ day: "Sunday" }}
                >
                    <Form.Item name="day" label="Day" rules={[{ required: true }]}>
                        <Select>
                            {DAYS.map((d) => (
                                <Option key={d} value={d}>{d}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="startTime"
                        label="Start Time"
                        rules={[
                            { required: true, message: "Enter start time" },
                            { pattern: /^\d{2}:\d{2}$/, message: "Format must be HH:MM" },
                        ]}
                    >
                        <Input placeholder="09:00" />
                    </Form.Item>

                    <Form.Item
                        name="endTime"
                        label="End Time"
                        rules={[
                            { required: true, message: "Enter end time" },
                            { pattern: /^\d{2}:\d{2}$/, message: "Format must be HH:MM" },
                        ]}
                    >
                        <Input placeholder="10:15" />
                    </Form.Item>

                    <Form.Item name="label" label="Label (optional)">
                        <Input placeholder="e.g. Slot A" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
