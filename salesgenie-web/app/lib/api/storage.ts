import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Uploads a file (e.g. an email attachment) and returns its public URL.
 *  Content-Type is left unset so the browser adds the multipart boundary
 *  itself — the api client's default "application/json" header would
 *  otherwise override it and break upload parsing on the backend. */
export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ url: string }>({
    method: "POST",
    url: API_ENDPOINTS.storage.upload,
    data: formData,
    headers: { "Content-Type": undefined },
  });
}
