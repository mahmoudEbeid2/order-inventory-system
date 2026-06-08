import express from "express";
import { swaggerUi, swaggerSpec } from "../../swagger.js";
import authRoutes from "./auth.route.js";
import productRoutes from "./product.route.js";
import orderRoutes from "./order.route.js";

const router = express.Router();

router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);

export default router;
