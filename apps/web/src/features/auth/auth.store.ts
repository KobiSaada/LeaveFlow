import type { LoginRequest, PublicUser, UserRole } from '@leaveflow/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/features/auth/auth.api';

const STORAGE_KEY = 'leaveflow.session';

interface Session {
  token: string;
  user: PublicUser;
  expiresAt: number;
}

/**
 * sessionStorage, not localStorage: a session is per tab, so a reviewer can sign in as a requester
 * in one tab and a validator in another. (Production would prefer an httpOnly cookie.)
 */
function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the session simply lasts for this page load.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(readSession());

  const isAuthenticated = computed(
    () => session.value !== null && session.value.expiresAt > Date.now(),
  );
  const user = computed(() => session.value?.user ?? null);
  const role = computed<UserRole | null>(() => session.value?.user.role ?? null);
  const token = computed(() => (isAuthenticated.value ? session.value!.token : null));
  const homeRoute = computed(() => (role.value === 'VALIDATOR' ? '/dashboard' : '/requests'));

  async function login(credentials: LoginRequest): Promise<void> {
    const res = await authApi.login(credentials);
    session.value = {
      token: res.accessToken,
      user: res.user,
      expiresAt: Date.now() + res.expiresIn * 1000,
    };
    writeSession(session.value);
  }

  function logout(): void {
    session.value = null;
    writeSession(null);
  }

  /**
   * `Date.now()` is not reactive, so computed state cannot notice expiry by itself.
   * The router calls this on every navigation to drop a session whose token has expired.
   */
  function dropExpiredSession(): void {
    if (session.value && session.value.expiresAt <= Date.now()) logout();
  }

  return {
    session,
    isAuthenticated,
    user,
    role,
    token,
    homeRoute,
    login,
    logout,
    dropExpiredSession,
  };
});
