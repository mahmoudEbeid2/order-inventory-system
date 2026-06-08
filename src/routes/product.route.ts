import express from "express";
import { createProduct, updateProduct, deleteProduct, getProducts, getArchivedProducts, getProductById } from "../controllers/product.controller.js";
import { validate } from "../middlewares/validation.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.js";
import { createProductSchema, updateProductSchema, getProductsQuerySchema } from "../validators/product.validator.js";

import { idempotency } from "../middlewares/idempotency.js";

const router = express.Router();

// Public route to view products
router.get("/", validate(getProductsQuerySchema), getProducts);

// Admin-only routes
router.get("/archive", authenticateJWT, authorizeRoles("ADMIN"), validate(getProductsQuerySchema), getArchivedProducts);

// Public route to get a single product by ID
router.get("/:id", getProductById);

router.post("/", authenticateJWT, authorizeRoles("ADMIN"), idempotency, validate(createProductSchema), createProduct);
router.put("/:id", authenticateJWT, authorizeRoles("ADMIN"), validate(updateProductSchema), updateProduct);
router.delete("/:id", authenticateJWT, authorizeRoles("ADMIN"), deleteProduct);

export default router;
