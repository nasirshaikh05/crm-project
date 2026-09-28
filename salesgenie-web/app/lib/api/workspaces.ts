import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type {
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  Workspace,
} from "./types";

export function getWorkspaces() {
  return apiRequest<Workspace[]>({
    method: "GET",
    url: API_ENDPOINTS.workspaces.list,
  });
}

export function getWorkspace(id: string) {
  return apiRequest<Workspace>({
    method: "GET",
    url: API_ENDPOINTS.workspaces.detail(id),
  });
}

export function createWorkspace(payload: CreateWorkspacePayload) {
  return apiRequest<Workspace>({
    method: "POST",
    url: API_ENDPOINTS.workspaces.create,
    data: payload,
  });
}

export function updateWorkspace(id: string, payload: UpdateWorkspacePayload) {
  return apiRequest<Workspace>({
    method: "PUT",
    url: API_ENDPOINTS.workspaces.update(id),
    data: payload,
  });
}

export function deleteWorkspace(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: API_ENDPOINTS.workspaces.delete(id),
  });
}

/** Content-Type is left unset so the browser adds the multipart boundary
 *  itself — see storage.ts's uploadFile for why. */
export function uploadLogo(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<Workspace>({
    method: "POST",
    url: API_ENDPOINTS.workspaces.uploadLogo(id),
    data: formData,
    headers: { "Content-Type": undefined },
  });
}
