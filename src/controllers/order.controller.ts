import { catchAsync } from "../utils/catchAsync.js";
import { orderService } from "../services/order.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export const createOrder = catchAsync(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const email = req.user!.email;

  const result = await orderService.createOrder(userId, email, req.body);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: result,
  });
});

export const getOrders = catchAsync(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const result = await orderService.getOrders(userId, userRole, req.query);

  res.status(200).json({
    success: true,
    message: "Orders fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});
