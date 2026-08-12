/* global Headers, Request, Response, URL */

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=()",
  );

  if (headers.get("content-type")?.includes("text/html")) {
    headers.set("Cache-Control", "no-cache");
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

const worker = {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    const isMissingRoute =
      response.status === 404 ||
      (response.status >= 300 && response.status < 400);

    if (isMissingRoute && request.method === "GET" && acceptsHtml) {
      const indexUrl = new URL("/", request.url);
      response = await env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return withSecurityHeaders(response);
  },
};

export default worker;
