import { getEnv } from "../constant/Utils";

const TOKEN_STORAGE_KEY = "enksign_token";

export function apiBaseUrl() {
  const env = getEnv();
  const configured =
    env?.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;
  return configured || "http://localhost:8080/api";
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  constructor(status, body) {
    const message =
      (body && (body.message || body.title || body.detail)) ||
      `Request failed with status ${status}`;
    super(message);
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path, params) {
  const url = new URL(
    path.startsWith("http") ? path : `${apiBaseUrl()}${path}`
  );
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function parseErrorBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

/**
 * Core request helper for enk-sign's REST API.
 *
 * @param {string} path - e.g. "/documents"
 * @param {object} options
 * @param {"GET"|"POST"|"PUT"|"DELETE"} [options.method]
 * @param {object} [options.params] - query string params
 * @param {object} [options.body] - JSON body (ignored if `form` is set)
 * @param {FormData} [options.form] - multipart form body
 * @param {"json"|"blob"|"none"} [options.responseType]
 * @param {boolean} [options.auth] - attach Authorization header (default true)
 */
export async function request(
  path,
  {
    method = "GET",
    params,
    body,
    form,
    responseType = "json",
    auth = true
  } = {}
) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let requestBody;
  if (form) {
    requestBody = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: requestBody
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204 || responseType === "none") {
    return null;
  }
  if (responseType === "blob") {
    return response.blob();
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return response.json();
}

export const http = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, options) => request(path, { ...options, method: "POST" }),
  put: (path, options) => request(path, { ...options, method: "PUT" }),
  del: (path, options) => request(path, { ...options, method: "DELETE" })
};
