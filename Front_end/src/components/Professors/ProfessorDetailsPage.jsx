import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Descriptions, Button, Tag, Spin, message } from "antd";
import axios from "axios";

export default function ProfessorDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctor();
    // eslint-disable-next-line
  }, [id]);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await axios.get(`http://localhost:5000/api/doctors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) setData(res.data.data);
      else message.error(res.data?.message || "Failed to load professor");
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load professor");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}><Spin /></div>;
  if (!data) return <div style={{ padding: 24 }}>Professor not found.</div>;

  const user = data.user || {};
  const profile = user.profile || {};
  const office = data.office || {};

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Professor Details"
        extra={
          <>
            <Button onClick={() => navigate("/admin/faculty")}>Back</Button>
            <Button
              type="primary"
              style={{ marginLeft: 8 }}
              onClick={() => navigate(`/admin/faculty/edit/${id}`)}
            >
              Edit
            </Button>
          </>
        }
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Name">
            {profile.firstName} {profile.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Employee ID">{data.employeeId}</Descriptions.Item>
          <Descriptions.Item label="Specialization">
            {(data.specialization || []).map((s, i) => (
              <Tag key={i}>{s}</Tag>
            ))}
          </Descriptions.Item>
          <Descriptions.Item label="Office">
            {office.building} {office.room}
          </Descriptions.Item>
          <Descriptions.Item label="Max Courses">{data.maxCourses}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={data.isAvailable ? "green" : "red"}>
              {data.isAvailable ? "Available" : "Unavailable"}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
