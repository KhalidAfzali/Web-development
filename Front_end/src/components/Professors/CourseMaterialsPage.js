// components/CourseMaterialsPage.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Button,
  Upload,
  message,
  Modal,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  UploadOutlined,
  FileOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import "./CourseMaterialsPage.css";

const { Option } = Select;
const { Text } = Typography;

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const prettySize = (bytes) => {
  const n = Number(bytes || 0);
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const getFileTypeTagColor = (t) => {
  const x = String(t || "").toLowerCase();
  if (x === "slides") return "blue";
  if (x === "assignment") return "green";
  if (x === "notes") return "gold";
  if (x === "syllabus") return "purple";
  return "default";
};

export default function CourseMaterialsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [materials, setMaterials] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "slides",
    isPublic: true,
    file: null,
  });

  const selectedCourseObj = useMemo(
    () => courses.find((c) => String(c._id) === String(selectedCourse)),
    [courses, selectedCourse]
  );

  const loadDoctorCourses = async () => {
    setLoadingCourses(true);
    try {
      // doctor role already restricted by backend in /api/schedules
      const res = await api.get("/api/schedules");
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load schedules");

      const schedules = res.data.data || [];
      const map = new Map();

      for (const sch of schedules) {
        const c = sch.course;
        if (c && c._id && !map.has(String(c._id))) map.set(String(c._id), c);
      }

      const list = Array.from(map.values());
      setCourses(list);

      // pick first course by default
      if (!selectedCourse && list.length) setSelectedCourse(list[0]._id);
    } catch (e) {
      message.error(e.response?.data?.message || e.message || "Failed to load your courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadMaterials = async (courseId) => {
    if (!courseId) return;
    setLoadingMaterials(true);
    try {
      const res = await api.get(`/api/materials/course/${courseId}`);
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load materials");
      setMaterials(res.data.data || []);
    } catch (e) {
      message.error(e.response?.data?.message || e.message || "Failed to fetch materials");
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadDoctorCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) loadMaterials(selectedCourse);
  }, [selectedCourse]);

  const resetModal = () => {
    setForm({ title: "", description: "", type: "slides", isPublic: true, file: null });
  };

  const doUpload = async () => {
    if (!selectedCourse) return message.error("Select a course first");
    if (!form.title.trim()) return message.error("Title is required");
    if (!form.file) return message.error("Select a file");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", form.file);
      fd.append("title", form.title.trim());
      fd.append("description", form.description || "");
      fd.append("courseId", selectedCourse);
      fd.append("type", form.type);
      fd.append("isPublic", String(form.isPublic));

      // IMPORTANT:
      // This requires backend route /api/materials/upload to use multer and controller to read req.file.
      const res = await api.post("/api/materials/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        message.success("Material uploaded");
        setModalOpen(false);
        resetModal();
        loadMaterials(selectedCourse);
      } else {
        message.error(res.data?.message || "Upload failed");
      }
    } catch (e) {
      message.error(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadMaterial = async (row) => {
    try {
      const res = await api.get(`/api/materials/${row._id}/download`, { responseType: "blob" });

      const blob = new Blob([res.data], { type: row.mimeType || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = row.originalName || row.fileName || "material";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      message.success("Download started");
    } catch (e) {
      message.error(e.response?.data?.message || "Download failed");
    }
  };

  const deleteMaterial = (row) => {
    Modal.confirm({
      title: "Delete Material",
      content: `Delete "${row.title}"?`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await api.delete(`/api/materials/${row._id}`);
          if (res.data?.success) {
            message.success("Material deleted");
            loadMaterials(selectedCourse);
          } else {
            message.error(res.data?.message || "Delete failed");
          }
        } catch (e) {
          message.error(e.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const columns = [
    {
      title: "Material",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div className="material-info">
          <FileOutlined style={{ fontSize: 22, color: "#1890ff", marginRight: 10 }} />
          <div>
            <div style={{ fontWeight: 600 }}>{text}</div>
            <div style={{ color: "#666", fontSize: 12 }}>{record.description || ""}</div>
            <div style={{ color: "#999", fontSize: 11 }}>
              {(record.originalName || record.fileName) || "file"} • {prettySize(record.fileSize)}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Course",
      key: "course",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.course?.courseCode || selectedCourseObj?.courseCode || "N/A"}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {record.course?.courseName || selectedCourseObj?.courseName || ""}
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color={getFileTypeTagColor(type)}>{type || "other"}</Tag>,
    },
    {
      title: "Uploaded",
      key: "createdAt",
      render: (_, record) => (record.createdAt ? new Date(record.createdAt).toLocaleString() : "N/A"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Download">
            <Button type="text" icon={<DownloadOutlined />} onClick={() => downloadMaterial(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteMaterial(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="course-materials-page">
      <div className="page-header">
        <div>
          <h1>Course Materials</h1>
          <p>Upload, download, and delete materials for your courses</p>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadDoctorCourses();
              if (selectedCourse) loadMaterials(selectedCourse);
            }}
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={!courses.length}
          >
            Upload Material
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }} loading={loadingCourses}>
        <Space wrap>
          <div style={{ minWidth: 360 }}>
            <div style={{ fontSize: 12, color: "#777", marginBottom: 6 }}>Selected Course</div>
            <Select
              style={{ width: "100%" }}
              placeholder="Select course"
              value={selectedCourse || undefined}
              onChange={setSelectedCourse}
            >
              {courses.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.courseCode} - {c.courseName}
                </Option>
              ))}
            </Select>
          </div>

          {!courses.length && (
            <Text type="secondary">
              No courses found. Make sure you have schedules assigned to you.
            </Text>
          )}
        </Space>
      </Card>

      <Card loading={loadingMaterials}>
        <Table columns={columns} dataSource={materials} rowKey="_id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title="Upload New Material"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          resetModal();
        }}
        onOk={doUpload}
        okText="Upload"
        confirmLoading={uploading}
        okButtonProps={{ disabled: !selectedCourse || !form.title.trim() || !form.file }}
        destroyOnClose
      >
        <div className="upload-form">
          <div className="form-group">
            <label>Course</label>
            <Select value={selectedCourse || undefined} onChange={setSelectedCourse} style={{ width: "100%" }}>
              {courses.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.courseCode} - {c.courseName}
                </Option>
              ))}
            </Select>
          </div>

          <div className="form-group">
            <label>Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Lecture 1 Slides"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <Input.TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short description..."
            />
          </div>

          <div className="form-group">
            <label>Material Type</label>
            <Select value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))} style={{ width: "100%" }}>
              <Option value="slides">slides</Option>
              <Option value="assignment">assignment</Option>
              <Option value="notes">notes</Option>
              <Option value="syllabus">syllabus</Option>
              <Option value="other">other</Option>
            </Select>
          </div>

          <div className="form-group">
            <label>File</label>
            <Upload
              beforeUpload={(file) => {
                setForm((p) => ({ ...p, file }));
                return false; // stop auto upload
              }}
              maxCount={1}
              showUploadList
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </div>
        </div>
      </Modal>
    </div>
  );
}
