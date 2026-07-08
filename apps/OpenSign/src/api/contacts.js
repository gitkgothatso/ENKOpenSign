import { http } from "./httpClient";

export function createContact({ ownerId, name, email, phone }) {
  return http.post("/contacts", { body: { ownerId, name, email, phone } });
}

export function batchCreateContacts(ownerId, contacts) {
  return http.post("/contacts/batch", { body: { ownerId, contacts } });
}

export function listContacts(userId, search = "") {
  return http.get("/contacts", { params: { userId, search } });
}

export function getContact(id, userId) {
  return http.get(`/contacts/${id}`, { params: { userId } });
}

export function updateContact(id, userId, { name, email, phone }) {
  return http.put(`/contacts/${id}`, {
    params: { userId },
    body: { name, email, phone }
  });
}

export function deleteContact(id, userId) {
  return http.del(`/contacts/${id}`, {
    params: { userId },
    responseType: "none"
  });
}
