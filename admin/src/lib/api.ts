import axios from 'axios';

const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE || '/api';
export const api = axios.create({
  baseURL: API_BASE,
});

// API origin is the server origin without the trailing /api segment when using absolute URLs.
// If API_BASE is relative (e.g. '/api'), fall back to current window origin.
export const API_ORIGIN: string = /^https?:\/\//i.test(API_BASE)
  ? API_BASE.replace(/\/?api\/?$/i, '')
  : window.location.origin;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function getToken() {
  return localStorage.getItem('token');
}
