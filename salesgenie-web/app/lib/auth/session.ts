import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  REFRESH_TOKEN_KEY,
} from "@/app/lib/api/client";
import type { AuthUser } from "@/app/lib/api/types";

/** `user` is optional because switch-workspace only returns fresh tokens,
 *  not a user object — callers there pass the merged user themselves (see
 *  updateSessionWorkspace). */
export function saveSession(tokens: {
  accessToken: string;
  refreshToken: string;
  user?: AuthUser;
}) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(tokens.user));
  }
}

/** Merges the newly active workspace into the stored session user, since
 *  POST /auth/switch-workspace only returns tokens, not a user object. */
export function updateSessionWorkspace(workspaceId: string, workspaceName: string) {
  const current = getSessionUser();
  const updated: AuthUser = {
    id: current?.id ?? "",
    email: current?.email ?? "",
    workspaceId,
    workspaceName,
  };
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
}

/** Merges a freshly-fetched/updated profile into the stored session user —
 *  mirrors updateSessionWorkspace's pattern, since login itself never
 *  returns firstName/lastName (see AuthUser's doc comment). `email` is
 *  optional since the initial post-login fetch only ever changes the name. */
export function updateSessionProfile(
  firstName: string | null,
  lastName: string | null,
  email?: string,
) {
  const current = getSessionUser();
  if (!current) return;
  const updated: AuthUser = { ...current, firstName, lastName, email: email ?? current.email };
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getSessionUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
