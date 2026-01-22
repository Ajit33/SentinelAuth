import { Request, Response } from "express";
import * as authService from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const {name,age,email,password} = req.body;
  if(!email || !password || !name ){
    return res.status(401).json("log in failed please try again")
  }

  const result = await authService.register(name,age,email,password);

  return res.status(200).json(result);
}

