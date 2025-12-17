import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Select, Tag, message, Spin, Upload, Space, Divider } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const { TextArea } = Input;

export default function HeadMessagesPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [sending, setSending] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [file, setFile] = useState(null);

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

  // dropdown options
  const doctorOptions = doctors.map((d) => {
    const u = d.user || {};
    const p = u.profile || {};
    const name = `${p.firstName || ""} ${p.lastName || ""}`.trim() || u.username || "Doctor";
    return { value: d._id, label: `${name} (${u.email || "no-email"})` };
  });

  // watch recipients to enable "view details"
  const selectedRecipients = Form.useWatch("recipients", form);
  const canViewDetails = !sendToAll && Array.isArray(selectedRecipients) && selectedRecipients.length === 1;

  const goToDoctorDetails = () => {
    if (!canViewDetails) {
      message.info("Select exactly one doctor to view details.");
      return;
    }
    const doctorId = selectedRecipients[0];
    navigate(`/head/doctors/${doctorId}`);
  };

  const onFinish = async (values) => {
    try {
      setSending(true);

      const recipientDoctorIds = sendToAll ? doctors.map((d) => d._id) : values.recipients;

      if (!Array.isArray(recipientDoctorIds) || recipientDoctorIds.length === 0) {
        message.error("Select at least 1 doctor (or choose Send to all).");
        return;
      }

      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("body", values.body || "");
      formData.append("priority", values.priority || "Normal");
      recipientDoctorIds.forEach((id) => formData.append("receivers[]", id));
      if (file) formData.append("file", file);

      // NOTE: this is still admin endpoint (your current backend).
      // If you want "from head", backend must provide /api/head/messages.
      const res = await api.post("/api/admin/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        message.success("Message sent");
        form.resetFields();
        setFile(null);
        setSendToAll(false);
      } else {
        message.error(res.data?.message || "Failed to send");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loadingDoctors) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <Card title="Head of Department: Send Message">
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ priority: "Normal" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={sendToAll}
              onChange={(e) => {
                const checked = e.target.checked;
                setSendToAll(checked);
                if (checked) form.setFieldsValue({ recipients: [] });
              }}
            />
            <span>Send to all doctors</span>
          </div>

          {!sendToAll && (
            <>
              <Form.Item
                name="recipients"
                label="Recipients"
                rules={[{ required: true, message: "Select recipients" }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select doctors"
                  options={doctorOptions}
                  style={{ width: "100%" }}
                  maxTagCount="responsive"
                />
              </Form.Item>

              <Space>
                <Button onClick={goToDoctorDetails} disabled={!canViewDetails}>
                  View Doctor Details
                </Button>
                <Tag color={canViewDetails ? "blue" : "default"}>
                  Select 1 doctor to open details
                </Tag>
              </Space>

              <Divider style={{ margin: "12px 0" }} />
            </>
          )}

          <Form.Item name="priority" label="Priority">
            <Select
              options={[
                { value: "Normal", label: <Tag>Normal</Tag> },
                { value: "Important", label: <Tag color="red">Important</Tag> },
              ]}
            />
          </Form.Item>

          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title required" }]}>
            <Input maxLength={120} placeholder="Example: Department Notice" />
          </Form.Item>

          <Form.Item name="body" label="Message">
            <TextArea rows={6} maxLength={5000} placeholder="Write your message..." />
          </Form.Item>

          <Form.Item label="Attachment (optional)">
            <Upload
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              onRemove={() => setFile(null)}
              maxCount={1}
              fileList={file ? [file] : []}
            >
              <Button icon={<UploadOutlined />}>Choose file</Button>
            </Upload>
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={sending}>
            Send
          </Button>
        </Form>
      </Card>
    </div>
  );
}
