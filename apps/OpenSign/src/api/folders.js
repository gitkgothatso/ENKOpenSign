import { http } from "./httpClient";

export function createFolder({ name, ownerId, organizationId, parentFolderId }) {
  return http.post("/folders", {
    body: { name, ownerId, organizationId, parentFolderId }
  });
}

export function listFolders(userId, parentFolderId) {
  return http.get("/folders", { params: { userId, parentFolderId } });
}

export function getFolder(id, userId) {
  return http.get(`/folders/${id}`, { params: { userId } });
}

export function renameFolder(id, userId, name) {
  return http.put(`/folders/${id}/rename`, {
    params: { userId },
    body: { name }
  });
}

export function moveFolder(id, userId, newParentFolderId) {
  return http.put(`/folders/${id}/move`, {
    params: { userId },
    body: { newParentFolderId }
  });
}

export function deleteFolder(id, userId) {
  return http.del(`/folders/${id}`, {
    params: { userId },
    responseType: "none"
  });
}
