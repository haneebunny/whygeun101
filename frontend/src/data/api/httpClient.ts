"use client";

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL || "";
  let clean = url.trim();
  if (clean.endsWith("/api")) {
    clean = clean.slice(0, -4);
  }
  if (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  return clean;
};

export const httpClient = {
  async request(path: string, options: RequestInit = {}) {
    const baseUrl = getBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${baseUrl}${cleanPath}`;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    
    // Set headers: Don't set Content-Type: application/json if body is FormData
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  },
};
