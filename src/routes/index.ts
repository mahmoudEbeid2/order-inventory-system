import express from "express";
import { swaggerUi, swaggerSpec } from "../../swagger.js";

const router = express.Router();

router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
