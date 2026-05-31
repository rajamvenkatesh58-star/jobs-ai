import axios from "axios";

// Fallback to hardcoded URL to guard against BOM-corrupted env vars
const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
const BASE = raw && raw.startsWith("http") ? raw : "https://backend-production-6bf69.up.railway.app";
export const BASE_URL = `${BASE}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
