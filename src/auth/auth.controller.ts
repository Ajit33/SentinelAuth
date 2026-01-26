import { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { authAttemptService } from "./security/auth-attempt.service.js";

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
     try {
     if(!email || !password){
      return res.status(401).json({
        message:"Please fill all the fields"
      })
    }
      const isBlocked=await authAttemptService.isBlocked(email);
      if(isBlocked){
        return res.status(429).json({
          message:"Too many failed login attempts. Please try again later."
        })
      }
      const result=await authService.login(email,password);
      if(result.message==="Login successful"){
        await authAttemptService.clearFailures(email);
        return res.status(200).json(result);
      }else{
        await authAttemptService.recordFailure(email);
        return res.status(401).json(result);
      }
     
    }
       catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
     }
}

