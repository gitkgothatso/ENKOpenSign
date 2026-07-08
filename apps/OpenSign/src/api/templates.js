import { http } from "./httpClient";

export function uploadTemplate(userId, { file, title, description }) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  if (description) form.append("description", description);
  return http.post("/templates", { params: { userId }, form });
}

export function saveTemplateFromDocument(documentId, userId, title) {
  return http.post(`/templates/save-from-document/${documentId}`, {
    body: { userId, title }
  });
}

export function listTemplates(userId, folderId) {
  return http.get("/templates", { params: { userId, folderId } });
}

export function getTemplate(id, userId) {
  return http.get(`/templates/${id}`, { params: { userId } });
}

export function getTemplateFile(id, userId) {
  return http.get(`/templates/${id}/file`, {
    params: { userId },
    responseType: "blob"
  });
}

export function defineTemplateRoles(id, userId, roles) {
  return http.put(`/templates/${id}/roles`, {
    params: { userId },
    body: { roles }
  });
}

export function sendTemplate(id, { requesterId, requesterEmail, message, roleBindings }) {
  return http.post(`/templates/${id}/send`, {
    body: { requesterId, requesterEmail, message, roleBindings }
  });
}

export function deleteTemplate(id, userId) {
  return http.del(`/templates/${id}`, {
    params: { userId },
    responseType: "none"
  });
}

export function createTemplateLink(templateId, { userId, prefillValues, expiresAt }) {
  return http.post(`/templates/${templateId}/links`, {
    body: { userId, prefillValues, expiresAt }
  });
}

export function listTemplateLinks(templateId, userId) {
  return http.get(`/templates/${templateId}/links`, { params: { userId } });
}

export function deleteTemplateLink(templateId, linkId, userId) {
  return http.del(`/templates/${templateId}/links/${linkId}`, {
    params: { userId },
    responseType: "none"
  });
}

export function validateTemplateLink(token) {
  return http.get("/templates/links/validate", { params: { token }, auth: false });
}
