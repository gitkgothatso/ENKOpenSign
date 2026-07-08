import { http } from "./httpClient";

export function createSignatureRequest({
  documentId,
  requesterId,
  requesterEmail,
  message,
  steps
}) {
  return http.post("/signatures/requests", {
    body: { documentId, requesterId, requesterEmail, message, steps },
    auth: false
  });
}

export function getSignatureRequest(id, token) {
  return http.get(`/signatures/requests/${id}`, {
    params: { token },
    auth: false
  });
}

export function getRequestsByRequester(
  userId,
  { status, search, page = 0, pageSize = 10 } = {}
) {
  return http.get(`/signatures/requests/requester/${userId}`, {
    params: { status, search, page, pageSize },
    auth: false
  });
}

export function getRequestsBySigner(
  userId,
  { status, search, page = 0, pageSize = 10 } = {}
) {
  return http.get(`/signatures/requests/signer/${userId}`, {
    params: { status, search, page, pageSize },
    auth: false
  });
}

export function sign(token, signaturePayload) {
  return http.post("/signatures/sign", {
    params: { token },
    body: signaturePayload,
    auth: !token
  });
}

export function getRequestAudit(id) {
  return http.get(`/signatures/requests/${id}/audit`, { auth: false });
}

export function rejectRequest(id, token, { signerId, reason }) {
  return http.post(`/signatures/requests/${id}/reject`, {
    params: { token },
    body: { signerId, reason },
    auth: false,
    responseType: "none"
  });
}

export function cancelRequest(id, requesterId) {
  return http.post(`/signatures/requests/${id}/cancel`, {
    body: { requesterId },
    auth: false,
    responseType: "none"
  });
}

export function resendRequest(id) {
  return http.post(`/signatures/requests/${id}/resend`, {
    auth: false,
    responseType: "none"
  });
}

export function bulkSend({
  templateId,
  requesterId,
  requesterEmail,
  message,
  variableRoleName,
  fixedRoleBindings,
  recipients
}) {
  return http.post("/signatures/bulk", {
    body: {
      templateId,
      requesterId,
      requesterEmail,
      message,
      variableRoleName,
      fixedRoleBindings,
      recipients
    }
  });
}

export function uploadSavedSignature(userId, { file, type, makeDefault = false }) {
  const form = new FormData();
  form.append("file", file);
  form.append("userId", userId);
  form.append("type", type);
  form.append("makeDefault", makeDefault);
  return http.post("/signatures/saved", { form });
}

export function listSavedSignatures(userId, type) {
  return http.get("/signatures/saved", { params: { userId, type } });
}

export function getSavedSignatureImage(id, userId) {
  return http.get(`/signatures/saved/${id}/image`, {
    params: { userId },
    responseType: "blob"
  });
}

export function makeSavedSignatureDefault(id, userId) {
  return http.put(`/signatures/saved/${id}/default`, {
    params: { userId },
    responseType: "none"
  });
}

export function deleteSavedSignature(id, userId) {
  return http.del(`/signatures/saved/${id}`, {
    params: { userId },
    responseType: "none"
  });
}
