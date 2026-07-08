import { http } from "./httpClient";

export function createUserSubscription({ userId, tier, billingPeriod }) {
  return http.post("/subscriptions/users", { body: { userId, tier, billingPeriod } });
}

export function createOrganizationSubscription({ organizationId, tier, billingPeriod }) {
  return http.post("/subscriptions/organizations", {
    body: { organizationId, tier, billingPeriod }
  });
}

export function getUserSubscription(userId) {
  return http.get(`/subscriptions/users/${userId}`);
}

export function getUserUsage(userId) {
  return http.get(`/subscriptions/users/${userId}/usage`);
}

export function getOrganizationSubscription(organizationId) {
  return http.get(`/subscriptions/organizations/${organizationId}`);
}

export function upgradeSubscription(id, tier) {
  return http.put(`/subscriptions/${id}/upgrade`, { body: { tier } });
}

export function downgradeSubscription(id, tier) {
  return http.put(`/subscriptions/${id}/downgrade`, { body: { tier } });
}

export function renewSubscription(id) {
  return http.put(`/subscriptions/${id}/renew`);
}

export function cancelSubscription(id) {
  return http.put(`/subscriptions/${id}/cancel`);
}
