import { Router } from "express";
import * as authController from "../src/auth/auth.controller.js";
import { SignupRateLimiter } from "./middleware/ratelimiter.js";

const router = Router();
router.post("/register",SignupRateLimiter(5, 15 * 60), authController.register);
// router.post("/login",)

export default router;

