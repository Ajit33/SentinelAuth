import { Router } from "express";
import * as authController from "../src/auth/auth.controller.js";

const router = Router();

router.post("/register", authController.register);

export default router;

