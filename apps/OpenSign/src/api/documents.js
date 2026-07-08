import { http } from "./httpClient";

export function listDocuments(
  userId,
  { search, status, folderId, page = 0, pageSize = 10 } = {}
) {
  return http.get("/documents", {
    params: { userId, search, status, folderId, page, pageSize }
  });
}

export function getDocument(id, userId) {
  return http.get(`/documents/${id}`, { params: { userId } });
}

export function getDocumentForSigning(id, token) {
  return http.get(`/documents/${id}/for-signing`, {
    params: { token },
    auth: !token
  });
}

export function streamForSigning(id, token) {
  return http.get(`/documents/${id}/stream-for-signing`, {
    params: { token },
    responseType: "blob",
    auth: !token
  });
}

export function downloadDocument(id, userId) {
  return http.get(`/documents/${id}/download`, {
    params: { userId },
    responseType: "blob"
  });
}

export function viewDocument(id, userId) {
  return http.get(`/documents/${id}/view`, {
    params: { userId },
    responseType: "blob"
  });
}

export function downloadSignedDocument(id, userId) {
  return http.get(`/documents/${id}/signed`, {
    params: { userId },
    responseType: "blob"
  });
}

export function getCertificateOfCompletion(id, userId) {
  return http.get(`/documents/${id}/certificate`, {
    params: { userId },
    responseType: "blob"
  });
}

export function listDocumentVersions(id, userId) {
  return http.get(`/documents/${id}/versions`, { params: { userId } });
}

export function downloadDocumentVersion(id, version, userId) {
  return http.get(`/documents/${id}/versions/${version}`, {
    params: { userId },
    responseType: "blob"
  });
}

export function getDocumentAudit(id, userId) {
  return http.get(`/documents/${id}/audit`, { params: { userId } });
}

export function moveDocument(id, userId, folderId) {
  return http.put(`/documents/${id}/move`, {
    params: { userId },
    body: { folderId }
  });
}

export function duplicateDocument(id, userId) {
  return http.post(`/documents/${id}/duplicate`, { params: { userId } });
}

export function deleteDocument(id, userId) {
  return http.del(`/documents/${id}`, {
    params: { userId },
    responseType: "none"
  });
}

export function generateSignedVersion(id, userId) {
  return http.post(`/documents/${id}/generate-signed`, {
    params: { userId },
    responseType: "none"
  });
}

export function uploadDocument(
  userId,
  { file, title, description, classification, expiresAt }
) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  if (description) form.append("description", description);
  if (classification) form.append("classification", classification);
  if (expiresAt) form.append("expiresAt", expiresAt);
  return http.post("/documents", { params: { userId }, form });
}
