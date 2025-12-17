import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, DatePicker, Select, Button, message } from "antd";
import axios from "axios";
import dayjs from "dayjs";

const API = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const { Option } = Select;

export default function HeadMeetingsPage() {
  const [form] = Form.useForm();
  const [doctors, setDoctors] = useState([]);

  const api = useMemo(() => {
    const a = axios.create({ baseURL: API });
    a.interceptors.request.use((c) => {
      c.headers.Authorization = `Bearer ${localStorage.getItem("authToken")}`;
      return c;
    });
    return a;
  }, []);

  useEffect(() => {
    api.get("/api/admin/head/doctors").then(res => {
      setDoctors(res.data.data || []);
    });
  }, [api]);

  const submit = async (values) => {
    try {
      await api.post("/api/head/meetings", {
        title: values.title,
        description: values.description,
        datetime: values.datetime.toISOString(),
        participants: values.participants
      });
      message.success("Meeting created");
      form.resetFields();
    } catch {
      message.error("Failed to create meeting");
    }
  };

  return (
    <Card title="Schedule Meeting">
      <Form layout="vertical" form={form} onFinish={submit}>
        <Form.Item name="title" label="Title" required>
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="datetime" label="Date & Time" required>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="participants" label="Doctors" required>
          <Select mode="multiple" placeholder="Select doctors">
            {doctors.map(d => (
              <Option key={d._id} value={d._id}>
                {d.user.profile.firstName} {d.user.profile.lastName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Button type="primary" htmlType="submit">
          Create Meeting
        </Button>
      </Form>
    </Card>
  );
}
