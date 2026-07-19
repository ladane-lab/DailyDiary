export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  return fetch(`${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`, options);
};
