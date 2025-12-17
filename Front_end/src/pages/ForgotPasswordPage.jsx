import React, { useState } from "react";
import { Card, Form, Input, Button, message, Alert, Steps } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const api = axios.create({ baseURL: API_BASE });

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const [devToken, setDevToken] = useState("");
  const [devLink, setDevLink] = useState("");

  const onRequestToken = async ({ email }) => {
    setLoadingEmail(true);
    setDevToken("");
    setDevLink("");
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      message.success(res.data?.message || "If email exists, token created");

      if (res.data?.devToken) setDevToken(res.data.devToken);
      if (res.data?.devResetLink) setDevLink(res.data.devResetLink);

      setStep(1);
    } catch (e) {
      message.error(e.response?.data?.message || "Failed to request token");
    } finally {
      setLoadingEmail(false);
    }
  };

  const onResetPassword = async ({ token, newPassword }) => {
    setLoadingReset(true);
    try {
      const res = await api.post(`/api/auth/reset-password/${token}`, { newPassword });

      if (res.data?.success) {
        message.success("Password reset successfully. Login now.");
        // IMPORTANT: go to login page
        navigate("/login", { replace: true });
      } else {
        message.error(res.data?.message || "Reset failed");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Reset failed");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <Card title="Forgot Password" style={{ maxWidth: 520, margin: "24px auto" }}>
      <Steps
        current={step}
        items={[
          { title: "Email" },
          { title: "Token + New Password" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {step === 0 && (
        <Form layout="vertical" onFinish={onRequestToken}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="your@email.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loadingEmail} block>
            Create Reset Token
          </Button>
        </Form>
      )}

      {step === 1 && (
        <>
          {(devToken || devLink) && (
            <Alert
              style={{ marginBottom: 16 }}
              type="info"
              showIcon
              message="DEV MODE"
              description={
                <div>
                  {devToken && (
                    <div style={{ marginBottom: 8 }}>
                      <b>Token:</b> <span style={{ wordBreak: "break-all" }}>{devToken}</span>
                    </div>
                  )}
                  {devLink && (
                    <div>
                      <b>Link:</b> <span style={{ wordBreak: "break-all" }}>{devLink}</span>
                    </div>
                  )}
                </div>
              }
            />
          )}

          <Form layout="vertical" onFinish={onResetPassword}>
            <Form.Item
              name="token"
              label="Token"
              rules={[{ required: true, message: "Token is required" }]}
              initialValue={devToken || ""}
            >
              <Input placeholder="Paste token here" />
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

            <Button type="primary" htmlType="submit" loading={loadingReset} block>
              Reset Password
            </Button>

            <Button style={{ marginTop: 8 }} onClick={() => setStep(0)} block>
              Back
            </Button>
          </Form>
        </>
      )}
    </Card>
  );
}
