import { catchAsync } from "../utils/catchAsync.js";
import { authService } from "../services/auth.service.js";

export const signup = catchAsync(async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: result,
  });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
});

export const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: result,
  });
});
