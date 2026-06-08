import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/user.repository.js";
import { UnauthorizedError, ConflictError } from "../utils/errors.js";
import { generateTokens, verifyRefreshToken, generateAccessToken } from "../utils/token.js";
import type { AuthResponseDTO, SignupInputDTO, LoginInputDTO } from "../dtos/auth.dto.js";

export const authService = {
  async signup(data: SignupInputDTO): Promise<AuthResponseDTO> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Email is already registered");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "CUSTOMER",
    });

    const { accessToken, refreshToken } = generateTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  },

  async login(data: LoginInputDTO): Promise<AuthResponseDTO> {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const { accessToken, refreshToken } = generateTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  },

  async refresh(token: string): Promise<{ accessToken: string }> {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await userRepository.findById(decoded.id);
      
      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      const accessToken = generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  },
};
