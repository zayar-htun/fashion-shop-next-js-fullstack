const DEFAULT_REDIRECT_URL = "/";

export function sanitizeCallbackUrl(
  callbackUrl: FormDataEntryValue | string | null | undefined,
  fallbackUrl: string = DEFAULT_REDIRECT_URL,
) {
  if (!callbackUrl || typeof callbackUrl !== "string") {
    return fallbackUrl;
  }

  const trimmedUrl = callbackUrl.trim();

  if (!trimmedUrl.startsWith("/") || trimmedUrl.startsWith("//")) {
    return fallbackUrl;
  }

  if (trimmedUrl.includes("\\") || trimmedUrl.includes("@")) {
    return fallbackUrl;
  }

  try {
    const url = new URL(trimmedUrl, "http://localhost:3000");
    if (url.origin !== "http://localhost:3000") {
      return fallbackUrl;
    }
    return url.pathname + url.search + url.hash; // http://localhost:3000/path?query=1#hash => /path?query=1#hash
  } catch {
    return fallbackUrl;
  }

  return trimmedUrl;
}
