import React, { useState } from 'react';

import { useAuth } from '../Context/AuthContext';
import Header from '../Layout/Header';
import './Login.css';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const result = await login(email, password);

      if (result.success) {
        const user = result.user;

        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        } else {
          localStorage.removeItem('rememberEmail');
        }

        // Navigate based on role
        // Navigate based on role
        const role = String(user?.role || "").toLowerCase();

        if (role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else if (role === "doctor" || role === "head") {
          navigate("/professor/dashboard", { replace: true });
        } else {
          navigate("/unauthorized", { replace: true });
        }

      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError(error.message || 'Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="login-page">
      <Header />
      <div className="login-background">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="logo">
                <div className="logo-icon">
                  <i className="bi bi-cpu-fill"></i>
                </div>
                <div className="logo-text">
                  <h2>CS Scheduling</h2>
                  <p>University Portal</p>
                </div>
              </div>
            </div>

            <div className="login-form-section">
              <div className="form-header">
                <h3>Welcome Back</h3>
                <p>Sign in to your account</p>
              </div>

              {error && (
                <div className="error-alert">
                  <i className="bi bi-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-wrapper">
                    <i className="bi bi-envelope"></i>
                    <input
                      type="email"
                      id="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <i className="bi bi-lock"></i>
                    <input
                      type="password"
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-options">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Remember me
                  </label>

                  <Link to="/forgot-password" className="forgot-password">
                    Forgot password?
                  </Link>
                </div>


                <button
                  type="submit"
                  className="login-button"
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right"></i>
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;