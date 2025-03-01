import { FastifyRequest } from "fastify";
import { ParsedUrl } from "./types";

function isPreflightInfoRefs(req: FastifyRequest, u: ParsedUrl): boolean {
  return (
    req.method === "OPTIONS" &&
    u.pathname.endsWith("/info/refs") &&
    (u.query.service === "git-upload-pack" ||
      u.query.service === "git-receive-pack")
  );
}

function isInfoRefs(req: FastifyRequest, u: ParsedUrl): boolean {
  return (
    req.method === "GET" &&
    u.pathname.endsWith("/info/refs") &&
    (u.query.service === "git-upload-pack" ||
      u.query.service === "git-receive-pack")
  );
}

function isPreflightPull(req: FastifyRequest, u: ParsedUrl): boolean {
  const accessControlRequestHeaders = req.headers[
    "access-control-request-headers"
  ] as string;
  return (
    req.method === "OPTIONS" &&
    accessControlRequestHeaders?.includes("content-type") &&
    u.pathname.endsWith("git-upload-pack")
  );
}

function isPull(req: FastifyRequest, u: ParsedUrl): boolean {
  return (
    req.method === "POST" &&
    req.headers["content-type"] === "application/x-git-upload-pack-request" &&
    u.pathname.endsWith("git-upload-pack")
  );
}

function isPreflightPush(req: FastifyRequest, u: ParsedUrl): boolean {
  const accessControlRequestHeaders = req.headers[
    "access-control-request-headers"
  ] as string;
  return (
    req.method === "OPTIONS" &&
    accessControlRequestHeaders?.includes("content-type") &&
    u.pathname.endsWith("git-receive-pack")
  );
}

function isPush(req: FastifyRequest, u: ParsedUrl): boolean {
  return (
    req.method === "POST" &&
    req.headers["content-type"] === "application/x-git-receive-pack-request" &&
    u.pathname.endsWith("git-receive-pack")
  );
}

export function allowRequest(req: FastifyRequest, u: ParsedUrl): boolean {
  return (
    isPreflightInfoRefs(req, u) ||
    isInfoRefs(req, u) ||
    isPreflightPull(req, u) ||
    isPull(req, u) ||
    isPreflightPush(req, u) ||
    isPush(req, u)
  );
}
