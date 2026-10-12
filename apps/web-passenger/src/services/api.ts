import { API_BASE_URL } from '@/constants';

const getDeviceId = () => {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem('gozipp_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('gozipp_device_id', deviceId);
  }
  return deviceId;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const request = (path: string, options: RequestInit, headers: Record<string, string>) => {
  // In browser, use relative path to route through Next.js same-origin API proxy (eliminates CORS and Failed to fetch)
  const url = typeof window !== 'undefined' ? path : `${API_BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

export const apiFetch = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gozipp_access_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let response = await request(path, options, headers);
  if (response.status === 401 && !path.includes('/auth/refresh')) {
    const refreshResponse = await request(
      '/api/v1/auth/refresh',
      { method: 'POST', body: JSON.stringify({}) },
      headers,
    );
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json().catch(() => ({}));
      if (refreshData.accessToken && typeof window !== 'undefined') {
        localStorage.setItem('gozipp_access_token', refreshData.accessToken);
        headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
      }
      response = await request(path, options, headers);
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message || `HTTP ${response.status}`, response.status);
  return data as T;
};
