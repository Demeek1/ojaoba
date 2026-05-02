import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ojaoba_admin_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fmt = (kobo: number | string | bigint) =>
  `₦${(Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

export default api;
