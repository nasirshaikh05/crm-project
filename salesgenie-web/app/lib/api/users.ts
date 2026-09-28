import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { UpdateUserPayload, UserProfile } from "./types";

export function getMe() {
  return apiRequest<UserProfile>({ method: "GET", url: API_ENDPOINTS.users.me });
}

export function updateMe(payload: UpdateUserPayload) {
  return apiRequest<UserProfile>({
    method: "PATCH",
    url: API_ENDPOINTS.users.me,
    data: payload,
  });
}
