const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("ems-token");
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body instanceof FormData || typeof options.body === "string"
        ? options.body
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body)
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error && error.message !== "Failed to fetch"
        ? error.message
        : `Cannot reach the API at ${API_URL}. Check that the backend is running and the API URL is correct.`,
      0
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let result;
  if (contentType.includes("application/json")) {
    const text = await response.text();
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(`The API returned an invalid response (HTTP ${response.status}).`, response.status);
    }
  } else if (response.ok) {
    result = await response.blob();
  } else {
    result = { message: await response.text() };
  }
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("ems-token");
      window.dispatchEvent(new Event("ems:unauthorized"));
    }
    const details = result?.errors?.map((error) => error.msg).filter(Boolean).join(", ");
    const message = result?.message || result?.error || details || `Request failed (HTTP ${response.status}).`;
    throw new ApiError(details && !message.includes(details) ? `${message}: ${details}` : message, response.status);
  }
  return result;
}

export function getRows(result, key) {
  return result?.data ?? result?.[key] ?? [];
}
