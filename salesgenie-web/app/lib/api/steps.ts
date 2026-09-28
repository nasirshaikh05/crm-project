import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type {
  ButtonTransition,
  CreateButtonTransitionPayload,
  CreateStepButtonPayload,
  CreateStepPayload,
  Step,
  StepButton,
  StepDetail,
  UpdateStepButtonPayload,
  UpdateStepPayload,
} from "./types";

export function getSteps() {
  return apiRequest<Step[]>({
    method: "GET",
    url: API_ENDPOINTS.steps.list,
  });
}

export function getStep(id: string) {
  return apiRequest<StepDetail>({
    method: "GET",
    url: API_ENDPOINTS.steps.detail(id),
  });
}

export function createStep(payload: CreateStepPayload) {
  return apiRequest<Step>({
    method: "POST",
    url: API_ENDPOINTS.steps.create,
    data: payload,
  });
}

export function updateStep(id: string, payload: UpdateStepPayload) {
  return apiRequest<Step>({
    method: "PUT",
    url: API_ENDPOINTS.steps.update(id),
    data: payload,
  });
}

export function deleteStep(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: API_ENDPOINTS.steps.delete(id),
  });
}

export function addStepButton(stepId: string, payload: CreateStepButtonPayload) {
  return apiRequest<StepButton>({
    method: "POST",
    url: API_ENDPOINTS.steps.addButton(stepId),
    data: payload,
  });
}

export function updateStepButton(
  buttonId: string,
  payload: UpdateStepButtonPayload,
) {
  return apiRequest<StepButton>({
    method: "PUT",
    url: API_ENDPOINTS.steps.updateButton(buttonId),
    data: payload,
  });
}

export function createButtonTransition(
  buttonId: string,
  payload: CreateButtonTransitionPayload,
) {
  return apiRequest<ButtonTransition>({
    method: "POST",
    url: API_ENDPOINTS.steps.createTransition(buttonId),
    data: payload,
  });
}
