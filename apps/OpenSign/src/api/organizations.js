import { http } from "./httpClient";

export function createOrganization({ ownerId, name, contactEmail, description }) {
  return http.post("/organizations", {
    body: { ownerId, name, contactEmail, description }
  });
}

export function getMyOrganization(userId) {
  return http.get("/organizations/my", { params: { userId } });
}

export function inviteToOrganization(orgId, { inviterId, inviteeEmail }) {
  return http.post(`/organizations/${orgId}/invite`, {
    body: { inviterId, inviteeEmail },
    responseType: "none"
  });
}

export function validateInvitation(token) {
  return http.get("/organizations/invitations/validate", {
    params: { token },
    auth: false
  });
}

export function acceptInvitation({ token, userId }) {
  return http.post("/organizations/invitations/accept", {
    body: { token, userId },
    responseType: "none"
  });
}
