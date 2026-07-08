import { http } from "./httpClient";

export function getAuditLogs({ userId, entityType, entityId, startDate, endDate, eventType, page = 0, size = 50 } = {}) {
  return http.get("/audit", {
    params: { userId, entityType, entityId, startDate, endDate, eventType, page, size }
  });
}

export function getDocumentAuditLogs(documentId) {
  return http.get(`/audit/documents/${documentId}`);
}

export function getSignatureRequestAuditLogs(requestId) {
  return http.get(`/audit/signatures/requests/${requestId}`);
}
