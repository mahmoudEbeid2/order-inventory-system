import express from "express";
import { createOrder, getOrders } from "../controllers/order.controller.js";
import { validate } from "../middlewares/validation.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.js";
import { createOrderSchema, getOrdersQuerySchema } from "../validators/order.validator.js";

const router = express.Router();

// All order operations require user authentication
router.use(authenticateJWT);

router.post("/", authorizeRoles("ADMIN", "CUSTOMER"), validate(createOrderSchema), createOrder);
router.get("/", validate(getOrdersQuerySchema), getOrders);

export default router;
