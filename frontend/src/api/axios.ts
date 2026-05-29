import axios from "axios";

const API = "/api";

export const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_password");

  if (token) {
    config.headers["x-admin-password"] = token;
  }

  return config;
});
