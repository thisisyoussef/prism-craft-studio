import axios from 'axios';

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:4000/api';
const TOKEN_KEY = 'pcs_token';
const GUEST_TOKEN_KEY = 'pcs_guest_token';

const api = axios.create({
  baseURL: API_BASE,
});

export function setAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
  delete api.defaults.headers.common['Authorization'];
}

export function setGuestToken(token: string) {
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  } catch {}
  // Use a separate header for guest
  (api.defaults.headers.common as any)['X-Guest-Auth'] = token;
}

export function clearGuestToken() {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {}
  delete (api.defaults.headers.common as any)['X-Guest-Auth'];
}

// Initialize from existing token
try {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) {
    api.defaults.headers.common['Authorization'] = `Bearer ${existing}`;
  }
  const guestExisting = localStorage.getItem(GUEST_TOKEN_KEY);
  if (guestExisting) {
    (api.defaults.headers.common as any)['X-Guest-Auth'] = guestExisting;
  }
} catch {}

export default api;
