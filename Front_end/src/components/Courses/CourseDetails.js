// src/components/courses/CourseDetails.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Modal, message } from "antd";

const CourseDetails = ({ course, onBack, onUpdateCourse, onDeleteCourse, isAdmin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dbCourse, setDbCourse] = useState(course);
  const [editedCourse, setEditedCourse] = useState(course);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const headers = useMemo(() => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }), [token]);

  // Always read fresh from DB when opening details or when course changes
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/courses/${course._id}`, headers);
        if (res.data?.success) {
          const fresh = normalizeCourse(res.data.data);
          setDbCourse(fresh);
          setEditedCourse(fresh);
        } else {
          const fallback = normalizeCourse(course);
          setDbCourse(fallback);
          setEditedCourse(fallback);
        }
      } catch {
        const fallback = normalizeCourse(course);
        setDbCourse(fallback);
        setEditedCourse(fallback);
      } finally {
        setLoading(false);
      }
    };
    if (course?._id) load();
    // eslint-disable-next-line
  }, [course?._id]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setEditedCourse(dbCourse);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      const payload = {
        courseCode: (editedCourse.courseCode || "").trim(),
        courseName: (editedCourse.courseName || "").trim(),
        description: (editedCourse.description || "").trim(),
        credits: Number(editedCourse.credits || 0),
        level: editedCourse.level || "Undergraduate",
        department: "Computer Science",
        maxStudents: editedCourse.maxStudents === "" || editedCourse.maxStudents == null
          ? undefined
          : Number(editedCourse.maxStudents),
        isActive: !!editedCourse.isActive,
        learningOutcomes: (editedCourse.learningOutcomes || [])
          .map((x) => (x || "").trim())
          .filter(Boolean),
      };

      if (!payload.courseCode || !payload.courseName) {
        message.error("Course Code and Course Name are required");
        return;
      }
      if (!payload.credits || payload.credits < 1) {
        message.error("Credits must be at least 1");
        return;
      }

      const updated = await onUpdateCourse(dbCourse._id, payload);
      const normalized = normalizeCourse(updated);

      setDbCourse(normalized);
      setEditedCourse(normalized);
      setIsEditing(false);
      message.success("Course updated successfully");
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to update course");
    }
  };

  const handleDelete = () => {
    if (!isAdmin) return;

    Modal.confirm({
      title: "Delete Course",
      content: "Are you sure you want to delete this course?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        onDeleteCourse(dbCourse._id);
        onBack();
      },
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditedCourse((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const updateOutcome = (index, value) => {
    setEditedCourse((prev) => {
      const next = [...(prev.learningOutcomes || [])];
      next[index] = value;
      return { ...prev, learningOutcomes: next };
    });
  };

  const addOutcome = () => {
    setEditedCourse((prev) => ({
      ...prev,
      learningOutcomes: [...(prev.learningOutcomes || []), ""],
    }));
  };

  const removeOutcome = (index) => {
    setEditedCourse((prev) => ({
      ...prev,
      learningOutcomes: (prev.learningOutcomes || []).filter((_, i) => i !== index),
    }));
  };

  const view = isEditing ? editedCourse : dbCourse;

  return (
    <div className="course-details">
      <div className="details-header">
        <button className="btn btn-back" onClick={onBack}>
          ← Back to List
        </button>

        {isAdmin && (
          <div className="details-actions">
            {!isEditing ? (
              <>
                <button className="btn btn-outline" onClick={handleEdit} disabled={loading}>
                  Edit Course
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                  Delete Course
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                  Save Changes
                </button>
                <button className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="details-content">
        <div className="details-main">
          <div className="course-title-section">
            {isEditing ? (
              <div className="editable-fields">
                <input
                  type="text"
                  name="courseCode"
                  value={view.courseCode}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Course Code"
                />
                <input
                  type="text"
                  name="courseName"
                  value={view.courseName}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Course Name"
                />
              </div>
            ) : (
              <h2>
                {dbCourse.courseCode} - {dbCourse.courseName}
              </h2>
            )}

            <span className={`status-badge ${dbCourse.isActive ? "active" : "inactive"}`}>
              {dbCourse.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="details-grid">
            <div className="details-section">
              <h3>Basic Information</h3>

              <div className="info-grid">
                <div className="info-item">
                  <strong>Course Code:</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      name="courseCode"
                      value={view.courseCode}
                      onChange={handleChange}
                      className="edit-input-sm"
                    />
                  ) : (
                    <span>{dbCourse.courseCode}</span>
                  )}
                </div>

                <div className="info-item">
                  <strong>Course Name:</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      name="courseName"
                      value={view.courseName}
                      onChange={handleChange}
                      className="edit-input-sm"
                    />
                  ) : (
                    <span>{dbCourse.courseName}</span>
                  )}
                </div>

                <div className="info-item">
                  <strong>Credits:</strong>
                  {isEditing ? (
                    <input
                      type="number"
                      name="credits"
                      value={view.credits}
                      onChange={handleChange}
                      className="edit-input-sm"
                      min="1"
                      max="6"
                    />
                  ) : (
                    <span>{dbCourse.credits}</span>
                  )}
                </div>

                <div className="info-item">
                  <strong>Department:</strong>
                  <span>Computer Science</span>
                </div>

                <div className="info-item">
                  <strong>Level:</strong>
                  {isEditing ? (
                    <select
                      name="level"
                      value={view.level}
                      onChange={handleChange}
                      className="edit-select"
                    >
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Graduate">Graduate</option>
                      <option value="PhD">PhD</option>
                    </select>
                  ) : (
                    <span>{dbCourse.level}</span>
                  )}
                </div>

                <div className="info-item">
                  <strong>Enrollment:</strong>
                  <span>
                    {dbCourse.currentEnrollment} / {dbCourse.maxStudents || "N/A"}
                  </span>
                </div>

                <div className="info-item">
                  <strong>Max Students:</strong>
                  {isEditing ? (
                    <input
                      type="number"
                      name="maxStudents"
                      value={view.maxStudents ?? ""}
                      onChange={handleChange}
                      className="edit-input-sm"
                      min="1"
                    />
                  ) : (
                    <span>{dbCourse.maxStudents || "N/A"}</span>
                  )}
                </div>

                <div className="info-item">
                  <strong>Status:</strong>
                  {isEditing ? (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={!!view.isActive}
                        onChange={handleChange}
                      />
                      Active
                    </label>
                  ) : (
                    <span>{dbCourse.isActive ? "Active" : "Inactive"}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>Description</h3>
              {isEditing ? (
                <textarea
                  name="description"
                  value={view.description || ""}
                  onChange={handleChange}
                  className="edit-textarea"
                  rows="4"
                  placeholder="Write course description"
                />
              ) : (
                <p>{dbCourse.description || "No description."}</p>
              )}
            </div>

            <div className="details-section">
              <h3>Learning Outcomes</h3>

              {isEditing ? (
                <div className="editable-list">
                  {(view.learningOutcomes || []).length === 0 && (
                    <div className="muted">No outcomes yet. Add one.</div>
                  )}

                  {(view.learningOutcomes || []).map((outcome, index) => (
                    <div key={index} className="list-item-edit">
                      <input
                        type="text"
                        value={outcome}
                        onChange={(e) => updateOutcome(index, e.target.value)}
                        className="edit-input-sm"
                        placeholder={`Outcome ${index + 1}`}
                      />
                      <button className="btn-remove" onClick={() => removeOutcome(index)} type="button">
                        ×
                      </button>
                    </div>
                  ))}

                  <button className="btn-add" onClick={addOutcome} type="button">
                    Add Outcome
                  </button>
                </div>
              ) : (
                <ul className="outcomes-list">
                  {(dbCourse.learningOutcomes || []).length === 0 ? (
                    <li className="muted">No outcomes.</li>
                  ) : (
                    dbCourse.learningOutcomes.map((o, i) => <li key={i}>{o}</li>)
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function normalizeCourse(c) {
  return {
    ...c,
    courseCode: c?.courseCode || "",
    courseName: c?.courseName || "",
    description: c?.description || "",
    credits: Number(c?.credits ?? 3),
    level: c?.level || "Undergraduate",
    department: c?.department || "Computer Science",
    currentEnrollment: Number(c?.currentEnrollment ?? 0),
    maxStudents: c?.maxStudents ?? "",
    learningOutcomes: Array.isArray(c?.learningOutcomes) ? c.learningOutcomes : [],
    isActive: c?.isActive !== false,
  };
}

export default CourseDetails;
