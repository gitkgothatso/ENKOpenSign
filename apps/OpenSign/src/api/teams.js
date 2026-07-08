import { http } from "./httpClient";

export function createTeam(orgId, { name, parentTeamId, createdBy }) {
  return http.post(`/organizations/${orgId}/teams`, {
    body: { name, parentTeamId, createdBy }
  });
}

export function listTeams(orgId) {
  return http.get(`/organizations/${orgId}/teams`);
}

export function getTeam(orgId, teamId) {
  return http.get(`/organizations/${orgId}/teams/${teamId}`);
}

export function getTeamDescendants(orgId, teamId) {
  return http.get(`/organizations/${orgId}/teams/${teamId}/descendants`);
}

export function getTeamAncestors(orgId, teamId) {
  return http.get(`/organizations/${orgId}/teams/${teamId}/ancestors`);
}

export function moveTeam(orgId, teamId, newParentTeamId) {
  return http.put(`/organizations/${orgId}/teams/${teamId}/move`, {
    body: { newParentTeamId }
  });
}

export function addTeamMember(orgId, teamId, { userId, role }) {
  return http.post(`/organizations/${orgId}/teams/${teamId}/members`, {
    body: { userId, role }
  });
}

export function removeTeamMember(orgId, teamId, userId) {
  return http.del(`/organizations/${orgId}/teams/${teamId}/members/${userId}`, {
    responseType: "none"
  });
}

export function deleteTeam(orgId, teamId) {
  return http.del(`/organizations/${orgId}/teams/${teamId}`, {
    responseType: "none"
  });
}
