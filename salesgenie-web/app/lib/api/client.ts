import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/";

if (!process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NODE_ENV !== "production") {
  console.warn(
    "[api] NEXT_PUBLIC_API_BASE_URL is not set — falling back to http://localhost:3000/",
  );
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const AUTH_TOKEN_KEY = "auth_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const AUTH_USER_KEY = "auth_user";

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[api] -> ${config.method?.toUpperCase()} ${config.url}`);
  }

  return config;
});

export interface ApiError {
  status: number | null;
  message: string;
  details?: unknown;
}

function normalizeError(error: AxiosError<{ message?: string; error?: string }>): ApiError {
  const status = error.response?.status ?? null;
  const message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong. Please try again.";
  return { status, message, details: error.response?.data };
}

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

// Access tokens expire after 15 minutes (see auth.module.ts); refresh
// tokens last 7 days. Without this, every 15-minute expiry looked like a
// forced logout even though a perfectly valid refresh token was sitting
// unused in localStorage. Uses a bare axios call (not apiClient) so this
// never recurses through the interceptor it's called from.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${baseURL.replace(/\/$/, "")}/auth/refresh`,
    { refreshToken: storedRefreshToken },
  );
  window.localStorage.setItem(AUTH_TOKEN_KEY, response.data.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
  return response.data.accessToken;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `[api] <- ${response.config.method?.toUpperCase()} ${response.config.url} ${response.status}`,
      );
    }
    return response;
  },
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status ?? null;
    const originalRequest = error.config as RetryableConfig | undefined;

    if (process.env.NODE_ENV === "development") {
      console.error(
        `[api] <- ${error.config?.method?.toUpperCase()} ${error.config?.url} failed (${status}):`,
        normalizeError(error).message,
      );
    }

    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (
      status === 401 &&
      typeof window !== "undefined" &&
      originalRequest &&
      !originalRequest._retriedAfterRefresh &&
      !isAuthEndpoint
    ) {
      originalRequest._retriedAfterRefresh = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient.request(originalRequest);
      } catch {
        refreshPromise = null;
        clearSessionAndRedirect();
        return Promise.reject(normalizeError(error));
      }
    }

    if (status === 401 && typeof window !== "undefined") {
      clearSessionAndRedirect();
    }

    return Promise.reject(normalizeError(error));
  },
);

/** Typed wrapper so callers get `T` back directly instead of an AxiosResponse. */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}
