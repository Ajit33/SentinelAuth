import { Request, Response } from "express";
import * as authService from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const {name,age,email,password} = req.body;
  if(!email || !password || !name ){
    return res.status(401).json("register need all the mandatory fields")
  }

  const result = await authService.register(name,age,email,password);

  return res.status(200).json(result);
}

export async function login(req:Request,res:Response){
     const {email,password}=req.body;
     if(!email || !password){
      return res.status(401).json({
        message:"Please fill all the fields"
      })
     }
     const result= await authService.login(email,password);
     return res.status(200).json(result)
}

