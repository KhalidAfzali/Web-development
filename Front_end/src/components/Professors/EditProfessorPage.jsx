import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, Button, Switch, InputNumber, Select, Spin, message } from "antd";
import axios from "axios";

export default function EditProfessorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () => ({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    [token]
  );

  const goLogin = useCallback(() => {
    message.error("Session expired. Please sign in again.");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    navigate("/login");
  }, [navigate]);

  const loadProfessor = useCallback(async () => {
    if (!token) {
      goLogin();
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`http://localhost:5000/api/doctors/${id}`, authHeaders);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to load professor");
      }

      const d = res.data.data;

      form.setFieldsValue({
        employeeId: d.employeeId || "",
        specialization: Array.isArray(d.specialization) ? d.specialization : [],
        building: d.office?.building || "",
        room: d.office?.room || "",
        maxCourses: typeof d.maxCourses === "number" ? d.maxCourses : 3,
        isAvailable: !!d.isAvailable,
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.response?.data?.error || e.message;

      if (status === 401) return goLogin();
      if (status === 403) {
        message.error("Permission denied. Admin access required.");
        return navigate("/unauthorized");
      }
      if (status === 404) {
        message.error("Professor not found.");
        return navigate("/admin/faculty");
      }

      message.error(msg || "Failed to load professor");
      navigate("/admin/faculty");
    } finally {
      setLoading(false);
    }
  }, [token, goLogin, id, authHeaders, form, navigate]);

  useEffect(() => {
    loadProfessor();
  }, [loadProfessor]);

  const onSave = async (values) => {
    if (!token) {
      goLogin();
      return;
    }

    try {
      setSaving(true);

      const payload = {
        employeeId: (values.employeeId || "").trim(),
        specialization: Array.isArray(values.specialization) ? values.specialization : [],
        office: {
          building: (values.building || "").trim(),
          room: (values.room || "").trim(),
        },
        maxCourses: Number(values.maxCourses || 3),
        isAvailable: !!values.isAvailable,
      };

      if (!payload.employeeId) {
        message.error("Employee ID is required.");
        return;
      }
      if (Number.isNaN(payload.maxCourses) || payload.maxCourses < 1 || payload.maxCourses > 10) {
        message.error("Max Courses must be between 1 and 10.");
        return;
      }

      const res = await axios.put(`http://localhost:5000/api/doctors/${id}`, payload, authHeaders);

      if (res.data?.success) {
        message.success("Professor updated successfully");
        navigate(`/admin/faculty/${id}`);
        return;
      }

      message.error(res.data?.message || "Failed to update professor");
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.response?.data?.error || "Failed to update professor";

      if (status === 401) return goLogin();
      if (status === 403) {
        message.error("Permission denied. Admin access required.");
        return navigate("/unauthorized");
      }
      if (status === 404) {
        message.error("Professor not found.");
        return navigate("/admin/faculty");
      }

      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <Card
        title="Edit Professor"
        extra={
          <Button onClick={() => navigate("/admin/faculty")} disabled={saving}>
            Back
          </Button>
        }
      >
        <Form layout="vertical" form={form} onFinish={onSave}>
          <Form.Item
            label="Employee ID"
            name="employeeId"
            rules={[{ required: true, message: "Employee ID is required" }]}
          >
            <Input placeholder="CS001" disabled={saving} />
          </Form.Item>

          <Form.Item label="Specialization" name="specialization">
            <Select
              mode="tags"
              placeholder="Add specializations (press Enter)"
              disabled={saving}
            />
          </Form.Item>

          <Form.Item label="Office Building" name="building">
            <Input placeholder="CS Building" disabled={saving} />
          </Form.Item>

          <Form.Item label="Office Room" name="room">
            <Input placeholder="CS-101" disabled={saving} />
          </Form.Item>

          <Form.Item label="Max Courses" name="maxCourses" initialValue={3}>
            <InputNumber min={1} max={10} style={{ width: "100%" }} disabled={saving} />
          </Form.Item>

          <Form.Item label="Available" name="isAvailable" valuePropName="checked" initialValue={true}>
            <Switch disabled={saving} />
          </Form.Item>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => navigate(`/admin/faculty/${id}`)} disabled={saving}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
