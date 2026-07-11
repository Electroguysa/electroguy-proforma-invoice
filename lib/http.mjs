import { getAdminPassword } from "./config.mjs";

export function requireAdmin(req, res) {
  const password = req.headers["x-electroguy-admin-key"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (!password || password !== getAdminPassword()) {
    sendJson(res, 401, { error: "Unauthorized. Enter the ElectroGuy invoice app password." });
    return false;
  }
  return true;
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

export function sendError(res, error, status = 500) {
  console.error(error);
  sendJson(res, status, { error: error?.message || "Unexpected server error" });
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.statusCode = 405;
  res.setHeader("Allow", allowed.join(", "));
  res.end("Method not allowed");
  return false;
}
