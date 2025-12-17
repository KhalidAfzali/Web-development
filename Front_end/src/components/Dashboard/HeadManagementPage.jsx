import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Select, Button, Tag, message, Spin, Space, Typography, Divider } from "antd";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function HeadManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [currentHead, setCurrentHead] = useState(null);

  // selectedDoctorId should be Doctor._id (because /set/:doctorId expects a doctorId)
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  const api = useMemo(() => {
    const a = axios.create({ baseURL: API });
    a.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return a;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [dRes, hRes] = await Promise.all([
        api.get("/api/admin/head/doctors"),
        api.get("/api/admin/head/current"),
      ]);

      const docs = dRes.data?.data || [];
      const headUser = hRes.data?.data || null;

      setDoctors(docs);
      setCurrentHead(headUser);

      // Convert head User -> Doctor._id for Select value
      if (headUser?._id) {
        const headDoctor = docs.find((d) => String(d?.user?._id) === String(headUser._id));
        setSelectedDoctorId(headDoctor ? headDoctor._id : null);
      } else {
        setSelectedDoctorId(null);
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load head data");
      setDoctors([]);
      setCurrentHead(null);
      setSelectedDoctorId(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetHead = async () => {
    if (!selectedDoctorId) return;

    try {
      setSaving(true);
      await api.patch(`/api/admin/head/set/${selectedDoctorId}`);
      message.success("Head of department updated");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to set head");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveHead = async () => {
    try {
      setSaving(true);
      await api.patch("/api/admin/head/remove");
      message.success("Head removed");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to remove head");
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

  const currentHeadLabel = currentHead
    ? `${currentHead.profile?.firstName || ""} ${currentHead.profile?.lastName || ""}`.trim() ||
      currentHead.username ||
      currentHead.email
    : null;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Head of Department (Admin)"
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 20 }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Typography.Text strong>Current Head: </Typography.Text>
            {currentHead ? (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {currentHeadLabel}
              </Tag>
            ) : (
              <Tag style={{ marginLeft: 8 }}>No Head Assigned</Tag>
            )}
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <div>
            <Typography.Text strong>Select Doctor:</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Select
                style={{ width: 520, maxWidth: "100%" }}
                placeholder="Select doctor as head"
                value={selectedDoctorId}
                onChange={setSelectedDoctorId}
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={saving}
                options={doctors.map((d) => {
                  const fn = d?.user?.profile?.firstName || "";
                  const ln = d?.user?.profile?.lastName || "";
                  const email = d?.user?.email || "";
                  const label = `Dr. ${`${fn} ${ln}`.trim()} (${email})`;
                  return { value: d._id, label };
                })}
              />
            </div>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              This will change the user role to <b>head</b>. Old head becomes <b>doctor</b>.
            </Typography.Text>
          </div>

          <Space wrap>
            <Button
              type="primary"
              onClick={handleSetHead}
              disabled={!selectedDoctorId || saving}
              loading={saving}
            >
              Set / Change Head
            </Button>

            <Button
              danger
              onClick={handleRemoveHead}
              disabled={!currentHead || saving}
              loading={saving}
            >
              Remove Head
            </Button>

            <Button onClick={load} disabled={saving}>
              Refresh
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
