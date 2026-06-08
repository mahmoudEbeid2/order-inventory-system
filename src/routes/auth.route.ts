import express from "express";
import { signup, login, refresh } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validation.js";
import { signupSchema, loginSchema, refreshTokenSchema } from "../validators/auth.validator.js";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refresh);

export default router;
