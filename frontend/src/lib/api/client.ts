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

/**
 * This is a fetch wrapper that uses HTTP only cookies to be attached with requests
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const defaultHeaders: HeadersInit =
    rest.body instanceof FormData ? {} : { "Content-Type": "application/json" };

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : undefined;

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
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new ApiError(
      response.status,
      message || "Something went wrong. Please try again.",
      body,
    );
  }

  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return body.data as T;
  }

  return body as T;
}

type QueryValue = string | number | boolean | undefined | null;

export function buildQueryString<T extends Record<string, QueryValue>>(
  query: T,
): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
