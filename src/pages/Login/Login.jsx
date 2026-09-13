import { useCallback, useMemo, useState } from "react";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Truck,
  Route,
  Receipt,
  Sparkles,
} from "lucide-react";

import "./Login.css";

/* =========================================================
   Config
   ========================================================= */
const LOGIN_KEY = "saoAutoTractorLoggedIn";
const TEMP_PASSWORD = "1234"; // TODO: real auth

const cx = (...classes) => classes.filter(Boolean).join(" ");

/* HD Tractor Image (Unsplash, free commercial license) */
const TRACTOR_IMAGE =
  "https://images.unsplash.com/photo-1605333998602-4c7b9b7b3e2f?auto=format&fit=crop&w=1200&q=85";

/* =========================================================
   Sub-components
   ========================================================= */

function BrandMark({ size = "default" }) {
  return (
    <div className={cx("brand", size === "lg" && "brand--lg")}>
      <div className="brand__mark" aria-hidden="true">
        <span>SA</span>
        <svg className="brand__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 16h2m12 0h2M6 16V9h3l2-3h5l2 3h3v7M8 16a2 2 0 104 0 2 2 0 00-4 0zm9 0a2 2 0 104 0 2 2 0 00-4 0z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="brand__text">
        <strong>SAO AUTO</strong>
        <span>TRACTOR</span>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }) {
  return (
    <li className="feature">
      <span className="feature__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <div className="feature__body">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
    </li>
  );
}

function LiveStat({ value, label }) {
  return (
    <div className="stat">
      <strong className="stat__num">{value}</strong>
      <span className="stat__label">{label}</span>
    </div>
  );
}

/* =========================================================
   Showcase (LEFT) — HD Tractor Photo
   ========================================================= */
function ShowcasePanel() {
  return (
    <aside className="showcase" aria-hidden="true">
      {/* HD Tractor Photo */}
      <div
        className="showcase__photo"
        style={{ backgroundImage: `url(${TRACTOR_IMAGE})` }}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="showcase__overlay" />

      {/* Film grain texture */}
      <div className="showcase__grain" />

      {/* Content */}
      <div className="showcase__content">
        <header className="showcase__header">
          <BrandMark size="lg" />
          <span className="showcase__badge">
            <span className="showcase__badge-dot" />
            Live · v2.4
          </span>
        </header>

        <div className="showcase__hero">
          <span className="showcase__eyebrow">
            <Sparkles size={12} strokeWidth={2} />
            TRANSPORT MANAGEMENT SYSTEM
          </span>

          <h1 className="showcase__title">
            Your tractor
            <br />
            <em>business, organized.</em>
          </h1>

          <p className="showcase__lede">
            Manage your fleet, trips, parties and billing —
            all from one calm, focused workspace.
          </p>

          <ul className="showcase__features">
            <FeatureItem
              icon={Truck}
              title="Fleet Management"
              desc="Every tractor, one dashboard"
            />
            <FeatureItem
              icon={Route}
              title="Trip Tracking"
              desc="Live routes & delivery logs"
            />
            <FeatureItem
              icon={Receipt}
              title="Billing & Parties"
              desc="Ledgers, invoices, receipts"
            />
          </ul>
        </div>

        <footer className="showcase__stats">
          <LiveStat value="24/7" label="Availability" />
          <div className="showcase__divider" />
          <LiveStat value="100%" label="Local control" />
          <div className="showcase__divider" />
          <LiveStat value="0 ms" label="Cloud lag" />
        </footer>
      </div>
    </aside>
  );
}

/* =========================================================
   Password Field
   ========================================================= */
function PasswordField({
  value,
  onChange,
  showPassword,
  onToggleShow,
  error,
  disabled,
}) {
  const inputId = "login-password";
  const errorId = `${inputId}-error`;

  return (
    <div className="field">
      <div className="field__top">
        <label htmlFor={inputId} className="field__label">
          Password
        </label>
        <span className="field__hint">
          <ShieldCheck size={12} strokeWidth={2} aria-hidden="true" />
          Encrypted
        </span>
      </div>

      <div className={cx("input", error && "input--error", disabled && "input--disabled")}>
        <LockKeyhole
          className="input__lead"
          size={17}
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder="Enter your password"
          autoComplete="current-password"
          autoFocus
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          className="input__toggle"
          onClick={onToggleShow}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff size={17} strokeWidth={1.9} />
          ) : (
            <Eye size={17} strokeWidth={1.9} />
          )}
        </button>
      </div>

      <div className={cx("field__error", error && "field__error--show")} aria-live="polite">
        {error && (
          <span id={errorId} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Main
   ========================================================= */
export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    setPassword(e.target.value);
    setError((prev) => (prev ? "" : prev));
  }, []);

  const handleToggleShow = useCallback(() => {
    setShowPassword((s) => !s);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      setError("");
      setIsSubmitting(true);

      window.setTimeout(() => {
        if (password === TEMP_PASSWORD) {
          localStorage.setItem(LOGIN_KEY, "true");
          onLogin?.();
          return;
        }
        setError("That password doesn't match. Please try again.");
        setIsSubmitting(false);
      }, 420);
    },
    [password, isSubmitting, onLogin],
  );

  const submitDisabled = useMemo(
    () => !password || isSubmitting,
    [password, isSubmitting],
  );

  return (
    <div className="login">
      <div className="login__bg-grid" aria-hidden="true" />

      <main className="login__shell">
        <ShowcasePanel />

        <section className="panel">
          <div className="panel__inner">
            {/* Mobile brand */}
            <div className="panel__mobile-brand">
              <BrandMark />
            </div>

            <header className="panel__header">
              <span className="eyebrow">SECURE ACCESS</span>
              <h2 className="panel__title">
                Welcome <em>back</em>
              </h2>
              <p className="panel__lede">
                Enter your password to continue to your workspace.
              </p>
            </header>

            <form className="form" onSubmit={handleSubmit} noValidate>
              <PasswordField
                value={password}
                onChange={handleChange}
                showPassword={showPassword}
                onToggleShow={handleToggleShow}
                error={error}
                disabled={isSubmitting}
              />

              <button
                type="submit"
                className="submit"
                disabled={submitDisabled}
              >
                <span className="submit__label">
                  {isSubmitting ? "Signing in" : "Sign in to dashboard"}
                </span>
                <span className="submit__icon" aria-hidden="true">
                  {isSubmitting ? (
                    <Loader2 size={16} strokeWidth={2.2} className="submit__spin" />
                  ) : (
                    <ArrowRight size={16} strokeWidth={2.2} />
                  )}
                </span>
              </button>
            </form>

            <div className="secure-note">
              <span className="secure-note__icon" aria-hidden="true">
                <ShieldCheck size={15} strokeWidth={2} />
              </span>
              <div className="secure-note__body">
                <strong>Private workspace</strong>
                <span>Authorized access only · Session stays on this device</span>
              </div>
            </div>

            <footer className="panel__footer">
              <span className="panel__footer-brand">SAO AUTO TRACTOR</span>
              <span className="panel__footer-dot" aria-hidden="true">·</span>
              <span className="panel__footer-sub">Transport Management System</span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}