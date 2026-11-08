/** Anonymous, browser-local workspace key. No account is required. */
export const WORKSPACE_STORAGE_KEY = "mi4-aimirah-workspace";
export const WORKSPACE_HEADER = "x-mi4-workspace";

export function getWorkspaceKey(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9-]{16,64}$/.test(existing)) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ws-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, generated);
    return generated;
  } catch {
    return "shared-workspace";
  }
}

export function workspaceFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  headers.set(WORKSPACE_HEADER, getWorkspaceKey());
  return fetch(input, { ...init, headers });
}

export function parseWorkspaceKey(request: Request): string {
  const value = request.headers.get(WORKSPACE_HEADER) ?? "";
  return /^[a-zA-Z0-9-]{16,64}$/.test(value) ? value : "shared-workspace";
}
