import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, Button, message, Row, Col, Spin } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const DoctorProfilePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("authToken") || "", []);
  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userData") || "{}");
    } catch {
      return {};
    }
  }, []);

  const userId = userData?._id;

  useEffect(() => {
    if (!token) {
      message.error("No auth token. Please login again.");
      setLoading(false);
      return;
    }
    if (!userId) {
      message.error("Missing user id. Please login again.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/doctors/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data?.success) throw new Error(res.data?.message || "Failed to load profile");

        const d = res.data.data;
        setDoctor(d);

        form.setFieldsValue({
          firstName: d?.user?.profile?.firstName || "",
          lastName: d?.user?.profile?.lastName || "",
          email: d?.user?.email || "",
          employeeId: d?.employeeId || "",
          officeBuilding: d?.office?.building || "",
          officeRoom: d?.office?.room || "",
          specialization: Array.isArray(d?.specialization) ? d.specialization.join(", ") : "",
        });
      } catch (e) {
        message.error(e.response?.data?.message || e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, token, form]);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <Card title="My Profile" bordered>
        {loading ? (
          <Spin />
        ) : (
          <Form layout="vertical" form={form}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="First Name" name="firstName">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Last Name" name="lastName">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Email" name="email">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Employee ID" name="employeeId">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Office Building" name="officeBuilding">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Office Room" name="officeRoom">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Specialization" name="specialization">
              <Input disabled />
            </Form.Item>

            {doctor?._id && (
              <div style={{ color: "#888", fontSize: 12 }}>
                DoctorId: {doctor._id}
              </div>
            )}

            <Button onClick={() => navigate("/professor/dashboard")}>
      Back to Dashboard
    </Button>
          </Form>
        )}
      </Card>
     

      
    </div>
  );
};

export default DoctorProfilePage;
