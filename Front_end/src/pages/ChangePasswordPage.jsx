import React, { useState } from "react";
import { Card, Form, Input, Button, message } from "antd";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function ChangePasswordPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ currentPassword, newPassword }) => {
    setLoading(true);
    try {
      const res = await api.put("/api/auth/change-password", { currentPassword, newPassword });
      if (res.data?.success) {
        message.success("Password updated");
        form.resetFields();
      } else {
        message.error(res.data?.message || "Failed to update password");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Change Password" style={{ maxWidth: 520, margin: "24px auto" }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>

        <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6 }]}>
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="confirm"
          label="Confirm New Password"
          dependencies={["newPassword"]}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} block>
          Update Password
        </Button>
      </Form>
    </Card>
  );
}
