import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Switch,
  Space,
  message,
  Spin,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { Option } = Select;

const EditClassroomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClassroom();
    // eslint-disable-next-line
  }, [id]);

  const fetchClassroom = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const res = await axios.get(
        `http://localhost:5000/api/classrooms/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.data?.success) {
        message.error("Failed to load classroom");
        return;
      }

      const c = res.data.data;

      // ✅ IMPORTANT: match backend field names exactly
      form.setFieldsValue({
        roomNumber: c.roomNumber,
        building: c.building,
        type: c.type,
        capacity: c.capacity,
        facilities: c.facilities || [],
        isAvailable: c.isAvailable,
      });
    } catch (err) {
      message.error("Failed to load classroom");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // ✅ payload MUST match backend schema
      const payload = {
        roomNumber: values.roomNumber,
        building: values.building,
        type: values.type,
        capacity: values.capacity,
        facilities: values.facilities,
        isAvailable: values.isAvailable,
      };

      const token = localStorage.getItem("authToken");

      const res = await axios.put(
        `http://localhost:5000/api/classrooms/${id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        message.success("Classroom updated successfully");
        navigate("/admin/classrooms");
        return;
      }

      message.error(res.data?.message || "Update failed");
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24,marginLeft:200, marginRight:200 }}>
      <Card title="Edit Classroom">
        <Form layout="vertical" form={form}>
          <Form.Item
            name="roomNumber"
            label="Room Number"
            rules={[{ required: true, message: "Room Number is required" }]}
          >
            <Input placeholder="e.g. CS-201" />
          </Form.Item>

          <Form.Item
            name="building"
            label="Building"
            rules={[{ required: true, message: "Building is required" }]}
          >
            <Input placeholder="Computer Science Building" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Room Type"
            rules={[{ required: true, message: "Room Type is required" }]}
          >
            <Select placeholder="Select room type">
              <Option value="Lecture Hall">Lecture Hall</Option>
              <Option value="Lab">Lab</Option>
              <Option value="Tutorial">Tutorial</Option>
              <Option value="Seminar">Seminar</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="capacity"
            label="Capacity"
            rules={[{ required: true, message: "Capacity is required" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="facilities" label="Facilities">
            <Select mode="multiple" placeholder="Select facilities">
              <Option value="Projector">Projector</Option>
              <Option value="Whiteboard">Whiteboard</Option>
              <Option value="WiFi">WiFi</Option>
              <Option value="Computers">Computers</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isAvailable"
            label="Available"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate(-1)}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={onSave}
            >
              Save Changes
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default EditClassroomPage;
