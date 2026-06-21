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

const request = (path: string, options: RequestInit, headers: Record<string, string>) =>
  fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

export const apiFetch = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
    ...((options.headers as Record<string, string>) || {}),
  };

  let response = await request(path, options, headers);
  if (response.status === 401 && !path.includes('/auth/refresh')) {
    const refreshResponse = await request(
      '/api/v1/auth/refresh',
      { method: 'POST', body: JSON.stringify({}) },
      headers,
    );
    if (refreshResponse.ok) response = await request(path, options, headers);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message || `HTTP ${response.status}`, response.status);
  return data as T;
};
