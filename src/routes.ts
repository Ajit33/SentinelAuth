import { Router } from "express";
import * as authController from "../src/auth/auth.controller.js";
import { SignupRateLimiter } from "./middleware/ratelimiter.js";
import { authenticateAccessToken } from "./middleware/auth.middleware.js";

const router = Router();

/**
 * =========================
 * Auth – Public Routes
 * =========================
 */
router.post(
  "/register",
  SignupRateLimiter(5, 15 * 60), // 5 requests / 15 min
  authController.register
);

router.post("/login", authController.login);

router.get("/verify-email", authController.verifyEmail);

router.post("/resend-verification", authController.resendVerification);

router.post("/forgot-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

router.get("/refresh", authController.refreshToken);

/**
 * =========================
 * Auth – Protected Routes
 * =========================
 */
router.get(
  "/profile",
  authenticateAccessToken,
  authController.getProfile
);

router.post(
  "/logout",
  authenticateAccessToken, // optional but recommended
  authController.logout
);

export default router;


