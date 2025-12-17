import React, { useEffect, useMemo, useState } from "react";
import { Card, List, Space, Typography, Tag, message, Spin, Button } from "antd";
import { BookOutlined, ReloadOutlined } from "@ant-design/icons";
import axios from "axios";
import "./MyCoursesPage.css";

const { Title, Text } = Typography;

const API = "http://localhost:5000";
function authHeaders() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

export default function MyCoursesPage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/schedules/me`, { headers: authHeaders() });
      if (res.data?.success) setSchedules(res.data.data || []);
      else setSchedules([]);
    } catch {
      message.error("Failed to load your courses");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  const myCourses = useMemo(() => {
    const map = new Map();
    schedules.forEach((s) => {
      const c = s.course;
      if (c?._id && !map.has(c._id)) map.set(c._id, c);
    });
    return Array.from(map.values());
  }, [schedules]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>My Courses</Title>
          <Text type="secondary">Courses pulled from your schedules only.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      </Space>

      <Card>
        <List
          dataSource={myCourses}
          locale={{ emptyText: "No courses found" }}
          renderItem={(c) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <BookOutlined />
                    <Text strong>{c.courseCode}</Text>
                    <Tag color="blue">{c.credits ? `${c.credits} credits` : "Course"}</Tag>
                  </Space>
                }
                description={<Text type="secondary">{c.courseName}</Text>}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
