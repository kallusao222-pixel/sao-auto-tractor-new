import { useState } from "react";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Truck,
} from "lucide-react";

import "./Login.css";

const LOGIN_KEY = "saoAutoTractorLoggedIn";

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    /*
     * Temporary login credential.
     * We'll move this into Settings/authentication
     * once the complete login system is connected.
     */
    if (password === "1234") {
      localStorage.setItem(LOGIN_KEY, "true");
      onLogin();
      return;
    }

    setError("Incorrect password. Please try again.");
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (error) {
      setError("");
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />

      <main className="login-container">
        {/* LEFT — BRAND PANEL */}
        <section className="login-showcase">
          <div className="login-showcase-inner">
            <div className="login-brand">
              <div className="login-brand-mark">
                SA
              </div>

              <div className="login-brand-text">
                <strong>SAO AUTO</strong>
                <span>TRACTOR</span>
              </div>
            </div>

            <div className="login-showcase-content">
              <span className="login-eyebrow">
                TRANSPORT MANAGEMENT
              </span>

              <h1>
                Your transport
                <br />
                <em>business, organized.</em>
              </h1>

              <p>
                Manage tractors, trips, parties and
                business records from one simple workspace.
              </p>
            </div>

            <div className="login-showcase-bottom">
              <div className="login-mini-card">
                <div className="login-mini-icon">
                  <Truck size={18} strokeWidth={1.8} />
                </div>

                <div>
                  <strong>Transport Management</strong>
                  <span>Everything in one place</span>
                </div>
              </div>

              <div className="login-showcase-line" />
            </div>
          </div>

          <div className="login-decoration login-decoration-one" />
          <div className="login-decoration login-decoration-two" />
        </section>

        {/* RIGHT — LOGIN PANEL */}
        <section className="login-panel">
          <div className="login-panel-inner">
            {/* MOBILE BRAND */}
            <div className="login-mobile-brand">
              <div className="login-brand-mark">
                SA
              </div>

              <div className="login-brand-text">
                <strong>SAO AUTO</strong>
                <span>TRACTOR</span>
              </div>
            </div>

            {/* HEADING */}
            <div className="login-heading">
              <span className="login-eyebrow">
                BUSINESS MANAGEMENT SYSTEM
              </span>

              <h2>Welcome back</h2>

              <p>
                Enter your password to continue to
                your workspace.
              </p>
            </div>

            {/* FORM */}
            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="login-password">
                    Password
                  </label>

                  <span className="login-secure-label">
                    <ShieldCheck
                      size={13}
                      strokeWidth={1.9}
                    />
                    Secure
                  </span>
                </div>

                <div
                  className={[
                    "login-input-wrap",
                    error ? "has-error" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <LockKeyhole
                    className="login-input-icon"
                    size={18}
                    strokeWidth={1.8}
                  />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    autoFocus
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={18}
                        strokeWidth={1.8}
                      />
                    ) : (
                      <Eye
                        size={18}
                        strokeWidth={1.8}
                      />
                    )}
                  </button>
                </div>

                {error && (
                  <span className="login-error">
                    {error}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="login-submit"
              >
                <span>Sign in</span>

                <span className="login-submit-icon">
                  <ArrowRight
                    size={17}
                    strokeWidth={1.9}
                  />
                </span>
              </button>
            </form>

            {/* SECURITY NOTE */}
            <div className="login-security-note">
              <div className="login-security-icon">
                <ShieldCheck
                  size={17}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <strong>Private workspace</strong>
                <span>
                  Authorized access only
                </span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="login-footer">
              <span>SAO AUTO TRACTOR</span>
              <small>Transport Management System</small>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;