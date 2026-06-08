import express from "express";
import { createOrder, getOrders } from "../controllers/order.controller.js";
import { validate } from "../middlewares/validation.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.js";
import { createOrderSchema, getOrdersQuerySchema } from "../validators/order.validator.js";
import { orderRateLimiter } from "../middlewares/rateLimiter.js";
import { idempotency } from "../middlewares/idempotency.js";

const router = express.Router();

// All order operations require user authentication
router.use(authenticateJWT);

router.post(
  "/",
  orderRateLimiter,
  idempotency,
  authorizeRoles("ADMIN", "CUSTOMER"),
  validate(createOrderSchema),
  createOrder
);
router.get("/", validate(getOrdersQuerySchema), getOrders);

export default router;
