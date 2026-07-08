import { http } from "./httpClient";

export function getCurrentUser() {
  return http.get("/account/me");
}

export function getProfile(userId) {
  return http.get(`/account/profile/${userId}`);
}

export function updateProfile(userId, { firstName, lastName }) {
  return http.put(`/account/profile/${userId}`, {
    body: { firstName, lastName }
  });
}

export function getPreferences(userId) {
  return http.get("/account/preferences", { params: { userId } });
}

export function updatePreferences(userId, updates) {
  return http.put("/account/preferences", {
    params: { userId },
    body: updates
  });
}
