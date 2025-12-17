import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, Button, Select, message, Tag } from "antd";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function AdminSendMessagePage() {
  const [form] = Form.useForm();
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [sending, setSending] = useState(false);
  const [doctors, setDoctors] = useState([]);

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
    const loadDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const res = await api.get("/api/admin/messages/doctors");
        setDoctors(res.data?.data || []);
      } catch (e) {
        message.error(e.response?.data?.message || "Failed to load doctors");
      } finally {
        setLoadingDoctors(false);
      }
    };
    loadDoctors();
  }, [api]);

  const doctorOptions = doctors.map((d) => {
    const u = d.user || {};
    const p = u.profile || {};
    const name = `${p.firstName || ""} ${p.lastName || ""}`.trim() || u.username || "Doctor";
    const label = `${name} (${u.email || "no-email"})`;
    return { value: d._id, label };
  });

  const onFinish = async (values) => {
    try {
      setSending(true);

      const recipientDoctorIds = values.recipients === "ALL"
        ? doctors.map((d) => d._id)
        : values.recipients;

      const payload = {
        recipientDoctorIds,
        title: values.title,
        body: values.body,
        priority: values.priority,
      };

      const res = await api.post("/api/admin/messages", payload);

      if (res.data?.success) {
        message.success("Message sent");
        form.resetFields();
      } else {
        message.error(res.data?.message || "Failed to send");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <Card title="Send Message to Doctors">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="recipients"
            label="Recipients"
            rules={[{ required: true, message: "Select recipients" }]}
          >
            <Select
              mode="multiple"
              loading={loadingDoctors}
              placeholder="Select one or many doctors"
              options={doctorOptions}
              style={{ width: "100%" }}
              maxTagCount="responsive"
              dropdownRender={(menu) => (
                <>
                  <div style={{ padding: 8 }}>
                    <Button
                      type="link"
                      onClick={() => form.setFieldsValue({ recipients: "ALL" })}
                      disabled={loadingDoctors || doctors.length === 0}
                    >
                      Send to ALL doctors
                    </Button>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Or select specific doctors below.
                    </div>
                  </div>
                  {menu}
                </>
              )}
            />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="Normal">
            <Select
              options={[
                { value: "Normal", label: <Tag>Normal</Tag> },
                { value: "Important", label: <Tag color="red">Important</Tag> },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Title required" }]}
          >
            <Input maxLength={120} placeholder="Example: Schedule update" />
          </Form.Item>

          <Form.Item
            name="body"
            label="Message"
            rules={[{ required: true, message: "Message required" }]}
          >
            <Input.TextArea rows={6} maxLength={5000} placeholder="Write your message..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={sending}>
            Send
          </Button>
        </Form>
      </Card>
    </div>
  );
}
