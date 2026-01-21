import { Request, Response } from "express";
import * as authService from "./auth.service.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  return res.status(200).json(result);
}

