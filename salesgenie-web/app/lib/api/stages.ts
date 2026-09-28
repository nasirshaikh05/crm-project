import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { CreateStagePayload, Stage, UpdateStagePayload } from "./types";

export function getStages() {
  return apiRequest<Stage[]>({
    method: "GET",
    url: API_ENDPOINTS.stages.list,
  });
}

export function getStagesByQueue(queueId: string) {
  return apiRequest<Stage[]>({
    method: "GET",
    url: API_ENDPOINTS.stages.byQueue(queueId),
  });
}

export function createStage(payload: CreateStagePayload) {
  return apiRequest<Stage>({
    method: "POST",
    url: API_ENDPOINTS.stages.create,
    data: payload,
  });
}

export function updateStage(id: string, payload: UpdateStagePayload) {
  return apiRequest<Stage>({
    method: "PUT",
    url: API_ENDPOINTS.stages.update(id),
    data: payload,
  });
}

export function deleteStage(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: API_ENDPOINTS.stages.delete(id),
  });
}
