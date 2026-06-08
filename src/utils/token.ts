import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import type { JWTPayloadDTO } from "../dtos/auth.dto.js";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in your environment variables (.env)");
}

export const JWT_ACCESS_SECRET = accessSecret;
export const JWT_REFRESH_SECRET = refreshSecret;
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

export const generateTokens = (user: User) => {
  const payload: JWTPayloadDTO = { id: user.id, email: user.email, role: user.role };
  
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY as any,
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JWTPayloadDTO => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as JWTPayloadDTO;
};

export const verifyRefreshToken = (token: string): { id: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
};

export const generateAccessToken = (user: User): string => {
  const payload: JWTPayloadDTO = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as any,
  });
};
