import { getToken, clearToken } from "./httpClient";

export { getToken };

function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function isAuthenticated() {
  const token = getToken();
  return !!token && !isTokenExpired(token);
}

export function getUsernameFromToken() {
  const token = getToken();
  if (!token) return null;
  return decodeJwt(token)?.sub || null;
}

export function logout() {
  clearToken();
  localStorage.removeItem("currentUser");
}
