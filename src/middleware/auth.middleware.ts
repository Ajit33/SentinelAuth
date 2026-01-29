import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { TokenPayload, TokenService } from "../auth/security/token.service.js";

// export interface JwtPayload {
//   userId: string;
//   email: string;
//   role: string;
// }

export interface AuthenticatedRequest extends Request {
  user?:TokenPayload 
}

export function authenticateAccessToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ message: "Access token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = TokenService.verifyAccessToken(
      token,
    );
   

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
}
