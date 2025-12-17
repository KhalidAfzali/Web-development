import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Select, Input, Button, TimePicker, message, Space, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

const dayOptions = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const typeOptions = ["Lecture","Lab","Tutorial","Seminar"];

const EditSchedulePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const token = useMemo(() => localStorage.getItem("authToken"), []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [schedRes, semRes, docRes, courseRes, roomRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/schedules/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/admin/schedule/semesters", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/doctors", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/courses", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/classrooms", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!schedRes.data?.success) throw new Error("Failed to load schedule");

        setSemesters(semRes.data?.data || []);
        setProfessors(docRes.data?.data || []);
        setCourses(courseRes.data?.data || []);
        setClassrooms(roomRes.data?.data || []);

        const s = schedRes.data.data;
        const slot = s.scheduleSlots?.[0] || {};

        form.setFieldsValue({
          semester: s.semester?._id || s.semester,
          course: s.course?._id || s.course,
          professor: s.doctor?._id || s.doctor,
          classroom: s.classroom?._id || s.classroom,
          day: slot.day,
          type: slot.type,
          startTime: slot.startTime ? dayjs(slot.startTime, "HH:mm") : null,
          endTime: slot.endTime ? dayjs(slot.endTime, "HH:mm") : null,
          notes: s.notes || "",
          status: s.status || "Draft",
        });
      } catch (e) {
        console.error(e);
        message.error("Failed to load edit page data");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id, token, form]);

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        semester: values.semester,
        course: values.course,
        doctor: values.professor,
        classroom: values.classroom,
        scheduleSlots: [
          {
            day: values.day,
            type: values.type,
            startTime: values.startTime.format("HH:mm"),
            endTime: values.endTime.format("HH:mm"),
          },
        ],
        status: values.status,
        notes: values.notes || "",
      };

      const res = await axios.put(`http://localhost:5000/api/schedules/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        message.success("Schedule updated");
        navigate("/admin/schedule/view");
        return;
      }

      message.error(res.data?.message || "Update failed");
    } catch (e) {
      if (e?.errorFields) return; // validation error
      console.error(e);
      message.error(e.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Edit Schedule</Title>
          <Text type="secondary">Update schedule details then save.</Text>
        </div>

        <Card loading={loading}>
          <Form form={form} layout="vertical">
            <Form.Item name="semester" label="Semester" rules={[{ required: true }]}>
              <Select placeholder="Select semester" showSearch optionFilterProp="children">
                {semesters.map((s) => (
                  <Select.Option key={s._id} value={s._id}>{s.name} {s.year}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="course" label="Course" rules={[{ required: true }]}>
              <Select placeholder="Select course" showSearch optionFilterProp="children">
                {courses.map((c) => (
                  <Select.Option key={c._id} value={c._id}>{c.courseCode} - {c.courseName}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="professor" label="Professor" rules={[{ required: true }]}>
              <Select placeholder="Select professor" showSearch optionFilterProp="children">
                {professors.map((p) => (
                  <Select.Option key={p._id} value={p._id}>
                    {p.user?.profile?.firstName} {p.user?.profile?.lastName} ({p.employeeId})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="classroom" label="Classroom" rules={[{ required: true }]}>
              <Select placeholder="Select classroom" showSearch optionFilterProp="children">
                {classrooms.map((r) => (
                  <Select.Option key={r._id} value={r._id}>
                    {r.building} {r.roomNumber} ({r.capacity} seats)
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Space style={{ width: "100%" }} size={16} wrap>
              <Form.Item name="day" label="Day" rules={[{ required: true }]} style={{ minWidth: 180 }}>
                <Select placeholder="Day">
                  {dayOptions.map((d) => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="type" label="Type" rules={[{ required: true }]} style={{ minWidth: 180 }}>
                <Select placeholder="Type">
                  {typeOptions.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                </Select>
              </Form.Item>

              <Form.Item name="startTime" label="Start" rules={[{ required: true }]} style={{ minWidth: 160 }}>
                <TimePicker format="HH:mm" />
              </Form.Item>

              <Form.Item name="endTime" label="End" rules={[{ required: true }]} style={{ minWidth: 160 }}>
                <TimePicker format="HH:mm" />
              </Form.Item>
            </Space>

            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Draft">Draft</Select.Option>
                <Select.Option value="Published">Published</Select.Option>
                <Select.Option value="Validated">Validated</Select.Option>
                <Select.Option value="Cancelled">Cancelled</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} />
            </Form.Item>

            <Space>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="primary" loading={saving} onClick={onSave}>Save Changes</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </div>
  );
};

export default EditSchedulePage;
