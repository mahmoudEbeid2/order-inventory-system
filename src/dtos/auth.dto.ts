import type { Role } from "@prisma/client";

export interface AuthUserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponseDTO {
  user: AuthUserDTO;
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayloadDTO {
  id: string;
  email: string;
  role: Role;
}

export interface SignupInputDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginInputDTO {
  email: string;
  password: string;
}
