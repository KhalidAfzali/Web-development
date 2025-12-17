import React, { useEffect, useState } from "react";
import { Card, Table, Button, Modal, Form, Input, DatePicker, message, Tag } from "antd";
import axios from "axios";

export default function SemesterManagementPage() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchSemesters = async () => {
    const token = localStorage.getItem("authToken");
    const res = await axios.get("http://localhost:5000/api/admin/schedule/semesters", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setData(res.data.data);
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const createSemester = async (values) => {
    const token = localStorage.getItem("authToken");
    await axios.post("http://localhost:5000/api/admin/schedule/semesters", {
      ...values,
      code: `${values.name}-${values.year}`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    message.success("Semester created");
    setOpen(false);
    form.resetFields();
    fetchSemesters();
  };

  return (
    <Card title="Semester Management" extra={<Button onClick={() => setOpen(true)}>Add Semester</Button>}>
      <Table
        rowKey="_id"
        dataSource={data}
        columns={[
          { title: "Semester", render: r => `${r.name} ${r.year}` },
          { title: "Code", dataIndex: "code" },
          { title: "Status", render: r => <Tag color={r.isActive ? "green" : "orange"}>{r.isActive ? "Active" : "Draft"}</Tag> }
        ]}
      />

      <Modal open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={createSemester}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Fall / Spring" />
          </Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

