"use client";

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError("Network error — check your connection.", 0);
  }

  let json: { success: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Unexpected server response.", res.status);
  }

  if (!res.ok) {
    throw new ApiError(json.error ?? "Request failed.", res.status);
  }

  return json.data as T;
}
