import type { ErrorCode, FieldError, ProblemDetails } from '@leaveflow/contracts';
import axios, { AxiosError, type AxiosInstance } from 'axios';

/** A failed API call, normalised from RFC 9457 Problem Details (or a network failure). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly fieldErrors: Record<string, string> = {},
    readonly requestId?: string,
    readonly problem?: ProblemDetails,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isProblem(data: unknown): data is ProblemDetails {
  return typeof data === 'object' && data !== null && 'code' in data && 'status' in data;
}

/** Pure mapping, unit-tested: any Axios failure → ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data;
    if (error.response && isProblem(data)) {
      const fieldErrors = Object.fromEntries(
        (data.errors ?? []).map((e: FieldError) => [e.field, e.message]),
      );
      return new ApiError(data.status, data.code, data.title, fieldErrors, data.requestId, data);
    }
    if (error.response) {
      return new ApiError(
        error.response.status,
        'INTERNAL_ERROR',
        'Something went wrong. Please try again.',
      );
    }
  }
  return new ApiError(
    0,
    'NETWORK_ERROR',
    'Cannot reach the server. Check your connection and try again.',
  );
}

interface HttpHooks {
  getToken: () => string | null;
  /** Called on 401 for an authenticated call (expired or revoked session). */
  onUnauthorized: () => void;
}

let hooks: HttpHooks = { getToken: () => null, onUnauthorized: () => undefined };

/** Wired once at start-up (avoids an import cycle between the client and the auth store). */
export function configureHttp(next: HttpHooks): void {
  hooks = next;
}

export const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = hooks.getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  config.headers.set('X-Request-Id', crypto.randomUUID());
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const sentToken = error instanceof AxiosError && Boolean(error.config?.headers?.Authorization);
    // Never retry a mutation automatically: the user re-authenticates and decides.
    if (apiError.status === 401 && sentToken) hooks.onUnauthorized();
    return Promise.reject(apiError);
  },
);
