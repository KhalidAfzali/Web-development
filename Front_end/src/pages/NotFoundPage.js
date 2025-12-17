import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ padding: 40 }}>
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <Link to="/home">Go Home</Link>
    </div>
  );
}
