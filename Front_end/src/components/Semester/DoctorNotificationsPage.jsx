import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, List, Tag, Button, Modal, Input, Tabs, message, Spin } from "antd";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function DoctorNotificationsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const openId = params.get("open");

  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState([]);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      const res = await api.get("/api/doctor/messages");
      setMsgs(res.data?.data || []);
    } catch (e) {
      const s = e?.response?.status;
      if (s === 401 || s === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        navigate("/login", { replace: true });
        return;
      }
      message.error(e?.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.post(`/api/doctor/messages/${id}/read`);
      setMsgs((prev) => prev.map((m) => (m._id === id ? { ...m, isRead: true } : m)));
    } catch {}
  };

  const openMsg = async (m) => {
    setActive(m);
    setOpen(true);
    if (!m.isRead) await markRead(m._id);
  };

  // auto open from URL ?open=
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!openId) return;
      try {
        const res = await api.get(`/api/doctor/messages/${openId}`);
        const m = res.data?.data;
        if (m) openMsg(m);
      } catch {
        // ignore
      }
    };
    run();
    // eslint-disable-next-line
  }, [openId]);

  const unreadCount = useMemo(() => msgs.filter((m) => !m.isRead).length, [msgs]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = msgs.slice();

    if (tab === "unread") list = list.filter((m) => !m.isRead);
    if (tab === "important") list = list.filter((m) => m.priority === "Important");

    if (text) {
      list = list.filter((m) => {
        const sender =
          `${m.sender?.profile?.firstName || ""} ${m.sender?.profile?.lastName || ""}`.trim() ||
          m.sender?.username ||
          "Admin";
        return (
          String(m.title || "").toLowerCase().includes(text) ||
          String(m.body || "").toLowerCase().includes(text) ||
          String(sender).toLowerCase().includes(text)
        );
      });
    }
    return list;
  }, [msgs, tab, q]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Notifications</span>
            <Tag>{msgs.length} total</Tag>
            {unreadCount > 0 && <Tag color="blue">{unreadCount} unread</Tag>}
          </div>
        }
        extra={<Button onClick={load}>Refresh</Button>}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Input
            placeholder="Search notifications..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
            style={{ maxWidth: 420 }}
          />
        </div>

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "all", label: "All" },
            { key: "unread", label: `Unread (${unreadCount})` },
            { key: "important", label: "Important" },
          ]}
        />

        <List
          dataSource={filtered}
          locale={{ emptyText: "No notifications" }}
          renderItem={(m) => {
            const senderName =
              `${m.sender?.profile?.firstName || ""} ${m.sender?.profile?.lastName || ""}`.trim() ||
              m.sender?.username ||
              "Admin";

            return (
              <List.Item
                style={{
                  cursor: "pointer",
                  background: m.isRead ? "transparent" : "rgba(24,144,255,0.06)",
                  borderRadius: 10,
                  paddingInline: 12,
                  marginBottom: 8,
                }}
                onClick={() => openMsg(m)}
                actions={[
                  m.priority === "Important" ? <Tag color="red">Important</Tag> : <Tag>Normal</Tag>,
                  m.isRead ? <Tag>Read</Tag> : <Tag color="blue">Unread</Tag>,
                ]}
              >
                <List.Item.Meta
                  title={m.title}
                  description={
                    <>
                      <div style={{ color: "#666" }}>
                        From: {senderName} • {new Date(m.createdAt).toLocaleString()}
                      </div>
                      <div style={{ color: "#999" }}>
                        {String(m.body || "").slice(0, 90)}
                        {String(m.body || "").length > 90 ? "..." : ""}
                      </div>
                    </>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <Modal
        open={open}
        title={active?.title || "Notification"}
        onCancel={() => setOpen(false)}
        footer={<Button onClick={() => setOpen(false)}>Close</Button>}
      >
        {active && (
          <>
            <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {active.priority === "Important" ? <Tag color="red">Important</Tag> : <Tag>Normal</Tag>}
              {active.isRead ? <Tag>Read</Tag> : <Tag color="blue">Unread</Tag>}
              <Tag>{new Date(active.createdAt).toLocaleString()}</Tag>
            </div>

            <div style={{ marginBottom: 10, color: "#666" }}>
              From:{" "}
              {`${active.sender?.profile?.firstName || ""} ${active.sender?.profile?.lastName || ""}`.trim() ||
                active.sender?.username ||
                "Admin"}
            </div>

            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {active.body}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
