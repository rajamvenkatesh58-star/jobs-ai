const RAILWAY = "https://backend-production-6bf69.up.railway.app";

export default async function handler(req, res) {
  const path = req.url;
  const target = `${RAILWAY}${path}`;

  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
  };
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "object" && req.headers["content-type"]?.includes("json")) {
      body = JSON.stringify(req.body);
    } else if (typeof req.body === "string") {
      body = req.body;
    } else if (req.headers["content-type"]?.includes("x-www-form-urlencoded")) {
      body = Object.entries(req.body || {})
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
    }
  }

  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type") || "";
    res.status(response.status);

    if (contentType.includes("json")) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (err) {
    res.status(502).json({ detail: "Proxy error: " + err.message });
  }
}
