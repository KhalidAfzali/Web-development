import React, { useEffect, useMemo, useState } from "react";
import { Card, Spin, message, Tag, Table, Button, Space, Descriptions, Divider } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function HeadDoctorDetailsPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // head endpoint
        const dRes = await api.get(`/api/head/doctors/${doctorId}`);
        const doc = dRes.data?.data || null;
        if (!doc) throw new Error("Doctor not found");
        setDoctor(doc);

        // IMPORTANT: schedule endpoint expects Doctor._id
        const sRes = await api.get(`/api/schedules/professor/${doc._id}`);
        setSchedules(sRes.data?.data || []);
      } catch (e) {
        message.error(e.response?.data?.message || e.message || "Failed to load doctor details");
        setDoctor(null);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) load();
  }, [api, doctorId]);

  const flatSlots = schedules.flatMap((sched) =>
    (sched.scheduleSlots || []).map((slot) => ({
      key: `${sched._id}-${slot._id || `${slot.day}-${slot.startTime}`}`,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      courseCode: sched.course?.courseCode || "—",
      courseName: sched.course?.courseName || "—",
      classroom: sched.classroom?.roomNumber || "—",
      building: sched.classroom?.building || "—",
    }))
  );

  const columns = [
    { title: "Day", dataIndex: "day" },
    { title: "Time", render: (_, r) => `${r.startTime} - ${r.endTime}` },
    { title: "Course", render: (_, r) => `${r.courseCode} - ${r.courseName}` },
    { title: "Location", render: (_, r) => `${r.building} ${r.classroom}` },
    { title: "Type", dataIndex: "type" },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <Space style={{ marginBottom: 12 }}>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </Space>
        <Card>
          <p>Doctor not found.</p>
        </Card>
      </div>
    );
  }

  const u = doctor.user || {};
  const p = u.profile || {};
  const name = `${p.firstName || ""} ${p.lastName || ""}`.trim() || u.username || "Doctor";

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={() => navigate(-1)}>Back</Button>
        <Button type="primary" onClick={() => navigate("/head/messages")}>
          Go to Head Messages
        </Button>
      </Space>

      <Card title={`Doctor Details: Dr. ${name}`}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <Tag color="blue">{u.email || "no-email"}</Tag>
          <Tag color="purple">{doctor.department || p.department || "Computer Science"}</Tag>
          <Tag color={u.role === "head" ? "gold" : "green"}>{u.role || "doctor"}</Tag>
          <Tag>Total classes: {flatSlots.length}</Tag>
        </div>

        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Doctor ID">{doctor._id}</Descriptions.Item>
          <Descriptions.Item label="User ID">{u._id || "—"}</Descriptions.Item>

          <Descriptions.Item label="Username">{u.username || "—"}</Descriptions.Item>
          <Descriptions.Item label="Email">{u.email || "—"}</Descriptions.Item>

          <Descriptions.Item label="First Name">{p.firstName || "—"}</Descriptions.Item>
          <Descriptions.Item label="Last Name">{p.lastName || "—"}</Descriptions.Item>

          <Descriptions.Item label="Phone">{p.phone || "—"}</Descriptions.Item>
          <Descriptions.Item label="Department">{doctor.department || p.department || "—"}</Descriptions.Item>

          <Descriptions.Item label="Specialization">
            {Array.isArray(doctor.specialization)
              ? doctor.specialization.join(", ")
              : doctor.specialization || (Array.isArray(p.specialization) ? p.specialization.join(", ") : p.specialization) || "—"}
          </Descriptions.Item>

          <Descriptions.Item label="Office">
            {doctor.office
              ? `${doctor.office.building || ""} ${doctor.office.room || ""}`.trim()
              : p.office
              ? `${p.office.building || ""} ${p.office.room || ""}`.trim()
              : "—"}
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {doctor.createdAt ? new Date(doctor.createdAt).toLocaleString() : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="User Created At">
            {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Table columns={columns} dataSource={flatSlots} pagination={{ pageSize: 8 }} />
      </Card>
    </div>
  );
}
