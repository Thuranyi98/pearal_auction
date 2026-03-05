import crypto from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/prisma/client";

const SESSION_COOKIE = "pa_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-only-change-this-secret";

type SessionPayload = {
  userId: number;
  name: string;
  loginId: string;
  role: "ADMIN" | "OPERATOR";
  exp: number;
};

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(payload: string) {
  return toBase64Url(crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest());
}

function encodeSession(payload: SessionPayload) {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;

  try {
    const data = JSON.parse(fromBase64Url(body)) as SessionPayload;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algo, salt, stored] = encoded.split("$");
  if (algo !== "scrypt" || !salt || !stored) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(stored, "hex"));
}

export async function ensureDefaultUsers() {
  const count = await prisma.user.count();
  if (count > 0) return;

  await prisma.user.createMany({
    data: [
      {
        name: "Admin1",
        loginId: "admin1",
        passwordHash: hashPassword("admin123"),
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        name: "StaffA",
        loginId: "staffa",
        passwordHash: hashPassword("staff123"),
        role: "OPERATOR",
        status: "ACTIVE",
      },
    ],
  });
}

export async function createSession(user: {
  id: number;
  name: string;
  loginId: string;
  role: "ADMIN" | "OPERATOR";
}) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSession({ userId: user.id, name: user.name, loginId: user.loginId, role: user.role, exp });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "ADMIN") redirect("/");
  return session;
}
