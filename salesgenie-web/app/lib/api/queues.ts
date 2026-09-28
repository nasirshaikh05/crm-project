import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { CreateQueuePayload, Queue, UpdateQueuePayload } from "./types";

export function getQueues() {
  return apiRequest<Queue[]>({
    method: "GET",
    url: API_ENDPOINTS.queues.list,
  });
}

export function getQueue(id: string) {
  return apiRequest<Queue>({
    method: "GET",
    url: API_ENDPOINTS.queues.detail(id),
  });
}

export function createQueue(payload: CreateQueuePayload) {
  return apiRequest<Queue>({
    method: "POST",
    url: API_ENDPOINTS.queues.create,
    data: payload,
  });
}

export function updateQueue(id: string, payload: UpdateQueuePayload) {
  return apiRequest<Queue>({
    method: "PUT",
    url: API_ENDPOINTS.queues.update(id),
    data: payload,
  });
}

export function deleteQueue(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: API_ENDPOINTS.queues.delete(id),
  });
}
