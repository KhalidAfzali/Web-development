import React from "react";
import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div style={{ padding: 40 }}>
      <h2>Unauthorized</h2>
      <p>You do not have access to this page.</p>
      <Link to="/home">Go Home</Link>
    </div>
  );
}
