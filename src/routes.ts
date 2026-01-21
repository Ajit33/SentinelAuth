import { Router } from "express";
import * as authController from "../src/auth/auth.controller.js";

const router = Router();

router.post("/signin", authController.login);

export default router;

