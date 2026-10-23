const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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
    throw Object.assign(new Error(data.error?.message ?? "Request failed"), {
      code: data.error?.code,
      status: response.status,
    });
  }
  return data;
}

export async function login(studentId, password = "") {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: { studentId: studentId.trim(), ...(password ? { password } : {}) },
  });
  sessionStorage.setItem("token", result.token);
  return result.user;
}
