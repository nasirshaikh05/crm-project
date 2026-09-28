import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type {
  AuthTokens,
  LoginPayload,
  RefreshTokens,
  RegisterPayload,
  RegisteredUser,
  SwitchWorkspaceTokens,
} from "./types";

export function register(payload: RegisterPayload) {
  return apiRequest<RegisteredUser>({
    method: "POST",
    url: API_ENDPOINTS.auth.register,
    data: payload,
  });
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthTokens>({
    method: "POST",
    url: API_ENDPOINTS.auth.login,
    data: payload,
  });
}

/** Public endpoint — exchanges the long-lived refresh token for a fresh
 *  access/refresh pair. client.ts's 401 interceptor calls this same
 *  backend route directly via a bare axios request instead of through this
 *  function, to avoid recursing through its own interceptor; this export
 *  is for any other caller that wants a typed way to hit it. */
export function refresh(refreshToken: string) {
  return apiRequest<RefreshTokens>({
    method: "POST",
    url: API_ENDPOINTS.auth.refresh,
    data: { refreshToken },
  });
}

/** Switches which workspace the session's tokens are scoped to — no `user`
 *  field comes back, only fresh tokens, since the caller already knows
 *  which workspace it asked to switch to. */
export function switchWorkspace(workspaceId: string) {
  return apiRequest<SwitchWorkspaceTokens>({
    method: "POST",
    url: API_ENDPOINTS.auth.switchWorkspace,
    data: { workspaceId },
  });
}

export function signout() {
  return apiRequest<{ message: string }>({
    method: "POST",
    url: API_ENDPOINTS.auth.signout,
  });
}
