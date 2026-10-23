const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const AUTH_EXPIRED_EVENT = "auth:expired";

export const hasToken = () => Boolean(sessionStorage.getItem("token"));

export async function api(path, { method = "GET", body } = {}) {
  const token = sessionStorage.getItem("token");
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // An expired or revoked token on a protected call sends the user back to the login screen.
    if (response.status === 401 && token && !path.startsWith("/api/auth/")) {
      sessionStorage.removeItem("token");
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw Object.assign(new Error(data.error?.message ?? "Request failed"), {
      code: data.error?.code,
      status: response.status,
    });
  }
  return data;
}

/** Log in with an email (or institute ID) and password. `role` is optional but recommended. */
export async function login({ loginId, password, role }) {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: { loginId: loginId.trim(), password, ...(role ? { role } : {}) },
  });
  sessionStorage.setItem("token", result.token);
  return result.user;
}

/** Create an account and sign in. Teachers also send the access code. */
export async function register({ email, name, password, role, accessCode }) {
  const result = await api("/api/auth/register", {
    method: "POST",
    body: {
      email: email.trim(),
      name: name.trim(),
      password,
      role,
      ...(role === "teacher" && accessCode ? { accessCode } : {}),
    },
  });
  sessionStorage.setItem("token", result.token);
  return result.user;
}

/** Restore the signed-in user from a saved token, or return null. */
export async function fetchCurrentUser() {
  if (!hasToken()) return null;
  try {
    const result = await api("/api/auth/me");
    return result.user;
  } catch (err) {
    if (err.status === 401) sessionStorage.removeItem("token");
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem("token");
}
