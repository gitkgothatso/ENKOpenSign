import { http } from "./httpClient";

export function login({ username, password, rememberMe }) {
  return http.post("/authenticate", {
    body: { username, password, rememberMe },
    auth: false
  });
}

export function register({ email, username, password, firstName, lastName }) {
  return http.post("/register", {
    body: { email, username, password, firstName, lastName },
    auth: false,
    responseType: "none"
  });
}

export function activate(key) {
  return http.get("/activate", {
    params: { key },
    auth: false,
    responseType: "none"
  });
}

export function requestPasswordReset(email) {
  return http.post("/account/reset-password/init", {
    body: { email },
    auth: false,
    responseType: "none"
  });
}

export function finishPasswordReset({ resetKey, newPassword }) {
  return http.post("/account/reset-password/finish", {
    body: { resetKey, newPassword },
    auth: false,
    responseType: "none"
  });
}

export function changePassword({ userId, currentPassword, newPassword }) {
  return http.post("/account/change-password", {
    body: { userId, currentPassword, newPassword },
    responseType: "none"
  });
}
