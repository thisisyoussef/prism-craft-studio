export function getCanonicalUrl(pathname: string): string | undefined {
  const baseFromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (baseFromEnv && typeof baseFromEnv === "string") {
    return `${baseFromEnv.replace(/\/$/, "")}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
  }
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin.replace(/\/$/, "");
    return `${origin}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
  }
  return undefined;
}

