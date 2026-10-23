import { useEffect, useRef, useState } from "react";
import { login, register } from "../api";
import "../styles/auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
];
const emptyForm = { name: "", email: "", password: "", confirmPassword: "", accessCode: "" };

function validate(mode, role, form) {
  const errors = {};
  if (mode === "signup") {
    if (!form.name.trim()) errors.name = "Enter your full name.";
    if (!form.email.trim()) errors.email = "Enter your email address.";
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email, like name@college.edu.";
    if (!form.password) errors.password = "Create a password.";
    else if (form.password.length < 8) errors.password = "Use at least 8 characters.";
    if (!form.confirmPassword) errors.confirmPassword = "Re-enter your password.";
    else if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords don't match.";
  } else {
    if (!form.email.trim()) errors.email = "Enter your email or ID.";
    if (!form.password) errors.password = "Enter your password.";
  }
  return errors;
}

function Field({ id, label, error, hint, ...inputProps }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {hint && !error && <small className="auth-hint">{hint}</small>}
      {error && <small className="auth-field-error" id={`${id}-error`}>{error}</small>}
    </div>
  );
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const isSignup = mode === "signup";
  const roleLabel = role === "teacher" ? "teacher" : "student";

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    if (fieldErrors[field]) setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const switchMode = (nextMode) => {
    if (submitting || nextMode === mode) return;
    setMode(nextMode);
    setForm((previous) => ({ ...emptyForm, email: previous.email }));
    setFieldErrors({});
    setFormError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setFormError("");
    setSuccess("");

    const errors = validate(mode, role, form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const user = isSignup
        ? await register({ email: form.email, name: form.name, password: form.password, role, accessCode: form.accessCode })
        : await login({ loginId: form.email, password: form.password, role });

      setSuccess(isSignup ? "Account created. Taking you to your dashboard…" : "Logged in. Taking you to your dashboard…");
      redirectTimer.current = setTimeout(() => onAuthenticated(user), 700);
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <h1>Smart Attendance</h1>
          <p>Secure attendance for IIIT Dharwad</p>
        </header>

        <div className="auth-tabs" role="tablist" aria-label="Account">
          {[["login", "Log in"], ["signup", "Sign up"]].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={mode === value}
              aria-controls="auth-panel"
              className={mode === value ? "auth-tab active" : "auth-tab"}
              onClick={() => switchMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <form
          id="auth-panel"
          role="tabpanel"
          aria-labelledby={`tab-${mode}`}
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <fieldset className="auth-role" disabled={submitting}>
            <legend>{isSignup ? "I'm signing up as a" : "I'm logging in as a"}</legend>
            <div className="auth-role-toggle">
              {ROLES.map((item) => (
                <label key={item.value} className={role === item.value ? "selected" : ""}>
                  <input
                    type="radio"
                    name="role"
                    value={item.value}
                    checked={role === item.value}
                    onChange={() => setRole(item.value)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          {isSignup && (
            <Field
              id="auth-name"
              label="Full name"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={form.name}
              onChange={update("name")}
              error={fieldErrors.name}
            />
          )}

          <Field
            id="auth-email"
            label={isSignup ? "Email" : "Email or ID"}
            type={isSignup ? "email" : "text"}
            autoComplete="username"
            placeholder={isSignup ? "name@college.edu" : ""}
            value={form.email}
            onChange={update("email")}
            error={fieldErrors.email}
          />

          <Field
            id="auth-password"
            label="Password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={form.password}
            onChange={update("password")}
            error={fieldErrors.password}
            hint={isSignup ? "At least 8 characters." : undefined}
          />

          {isSignup && (
            <Field
              id="auth-confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              error={fieldErrors.confirmPassword}
            />
          )}

          {isSignup && role === "teacher" && (
            <Field
              id="auth-access-code"
              label="Teacher access code"
              type="password"
              autoComplete="off"
              value={form.accessCode}
              onChange={update("accessCode")}
              error={fieldErrors.accessCode}
              hint="Ask your department for the code if sign-up requires one."
            />
          )}

          {formError && <p className="auth-banner auth-banner-error" role="alert">{formError}</p>}
          {success && <p className="auth-banner auth-banner-success" role="status">{success}</p>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting
              ? (isSignup ? "Creating account…" : "Logging in…")
              : (isSignup ? `Create ${roleLabel} account` : `Log in as ${roleLabel}`)}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default AuthPage;
