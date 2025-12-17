import React, { useState } from "react";
import { Card, Form, Input, Button, message } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const api = axios.create({ baseURL: API_BASE });

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ newPassword, confirm }) => {
    if (newPassword !== confirm) {
      message.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/api/auth/reset-password/${token}`, { newPassword });
      if (res.data?.success) {
        message.success("Password reset successfully. Login now.");
        navigate("/login", { replace: true });
      } else {
        message.error(res.data?.message || "Reset failed");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Reset Password" style={{ maxWidth: 520, margin: "24px auto" }}>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6 }]}>
          <Input.Password />
        </Form.Item>

        <Form.Item name="confirm" label="Confirm New Password" rules={[{ required: true, min: 6 }]}>
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} block>
          Reset Password
        </Button>
      </Form>
    </Card>
  );
}
