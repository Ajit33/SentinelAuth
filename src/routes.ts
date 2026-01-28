import { Router } from "express";
import * as authController from "../src/auth/auth.controller.js";
import { SignupRateLimiter } from "./middleware/ratelimiter.js";
import { authenticateAccessToken } from "./middleware/auth.middleware.js";

const router = Router();
router.post("/register",SignupRateLimiter(5, 15 * 60), authController.register);
router.post("/login",authController.login);
router.get("/profile",authenticateAccessToken, authController.getProfile);

export default router;

