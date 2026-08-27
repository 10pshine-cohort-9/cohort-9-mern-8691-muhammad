import { z } from "zod";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions extends RequestInit {
  auth?: boolean;
}

interface ApiErrorBody {
  message?: string | string[];
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    (typeof value.message === "string" || Array.isArray(value.message))
  );
}

function isSuccessEnvelope(
  value: unknown,
): value is { success: true; data: unknown } {
  return isRecord(value) && value.success === true && "data" in value;
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const defaultHeaders: HeadersInit =
    rest.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  const requestHeaders = new Headers(defaultHeaders);

  if (headers) {
    new Headers(headers).forEach((value, key) => {
      requestHeaders.set(key, value);
    });
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: requestHeaders,
    });
  } catch (error) {
    throw new ApiError(
      0,
      error instanceof Error
        ? error.message
        : "Unable to connect to the server. Please try again.",
      error,
    );
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  let body: unknown;

  if (isJson) {
    try {
      body = await response.json();
    } catch (error) {
      throw new ApiError(
        response.status,
        "The server returned an invalid JSON response.",
        error,
      );
    }
  }

  if (
    response.status === 401 &&
    auth &&
    !path.includes("/auth/login") &&
    !path.includes("/auth/sign-up")
  ) {
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/login") &&
      !window.location.pathname.includes("/signup")
    ) {
      window.location.replace("/login");
    }
  }

  if (!response.ok) {
    let message: string | undefined;
    if (isErrorBody(body)) {
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else {
        message = body.message;
      }
    }
    throw new ApiError(
      response.status,
      message || "Something went wrong. Please try again.",
      body,
    );
  }

  if (response.status === 204) {
    const result = schema.safeParse(undefined);
    if (!result.success) {
      throw new ApiError(
        response.status,
        "The server returned an unexpected empty response.",
        result.error,
      );
    }
    return result.data;
  }
  }

  if (!isSuccessEnvelope(body)) {
    throw new ApiError(
      response.status,
      "The server returned an invalid response.",
      body,
    );
  }

  const result = schema.safeParse(body.data);
  if (!result.success) {
    throw new ApiError(
      response.status,
      "The server returned data in an unexpected format.",
      result.error,
    );
  }

  return result.data;
}

export type QueryValue = string | number | boolean | Date | undefined | null;

export function buildQueryString<T extends Record<string, QueryValue>>(
  query: T,
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (value instanceof Date) {
        params.set(key, value.toISOString());
      } else {
        params.set(key, String(value));
      }
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
