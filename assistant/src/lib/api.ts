import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

export const fmt = (kobo: number | string | bigint) =>
  `₦${(Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

export default api;
