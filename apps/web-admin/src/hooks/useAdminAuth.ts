'use client';

/**
 * useAdminAuth — real admin authentication against Nest:
 * POST /api/v1/admin/auth/login -> {mfaRequired|mfaSetupRequired}
 * POST /api/v1/admin/auth/mfa/verify|activate -> HttpOnly session cookies.
 * The server-issued role drives UI permissions (never client-assumed).
 */
import { useState, useCallback } from 'react';
import { useAdminStore } from '../stores/adminStore';
import { useUIStore } from '../stores/uiStore';
import { API_BASE_URL } from '@/constants';

export type AdminLoginResult =
  | { ok: true; loggedIn: true }
  | { ok: true; loggedIn: false; mfa: true; challengeToken: string }
  | {
      ok: true;
      loggedIn: false;
      setup: true;
      setupToken: string;
      otpauthUrl: string;
    }
  | { ok: false };

const apiPost = async (path: string, body: unknown) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

export const useAdminAuth = () => {
  const { setAdminUser, setRole } = useAdminStore();
  const { setIsLoading } = useUIStore();
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback(
    (admin: { id: string; username: string; role: string }) => {
      setAdminUser(admin);
      setRole(admin.role as any);
    },
    [setAdminUser, setRole],
  );

  const login = useCallback(
    async (username: string, password: string): Promise<AdminLoginResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiPost('/api/v1/admin/auth/login', { username, password });
        if (data?.admin) {
          applySession(data.admin);
          return { ok: true, loggedIn: true };
        }
        if (data?.mfaRequired && data?.challengeToken) {
          return { ok: true, loggedIn: false, mfa: true, challengeToken: data.challengeToken };
        }
        if (data?.mfaSetupRequired && data?.setupToken) {
          return {
            ok: true,
            loggedIn: false,
            setup: true,
            setupToken: data.setupToken,
            otpauthUrl: data.otpauthUrl || '',
          };
        }
        throw new Error('เข้าสู่ระบบไม่สำเร็จ');
      } catch (err: any) {
        setError(err.message);
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, setIsLoading],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiPost('/api/v1/admin/auth/mfa/verify', { challengeToken, code });
        if (!data?.admin) throw new Error('ยืนยันไม่สำเร็จ');
        applySession(data.admin);
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, setIsLoading],
  );

  const activateMfa = useCallback(
    async (setupToken: string, code: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiPost('/api/v1/admin/auth/mfa/activate', { setupToken, code });
        if (!data?.admin) throw new Error('เปิดใช้งานไม่สำเร็จ');
        applySession(data.admin);
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, setIsLoading],
  );

  const logout = useCallback(async () => {
    try {
      await apiPost('/api/v1/admin/auth/logout', {});
    } catch {
      // Local logout must still complete.
    } finally {
      setAdminUser(null);
      setRole('AUDITOR');
    }
  }, [setAdminUser, setRole]);

  return { login, verifyMfa, activateMfa, logout, error, setError };
};
