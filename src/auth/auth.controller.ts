import { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { authAttemptService } from "./security/auth-attempt.service.js";
import { TokenService } from "./security/token.service.js";
import { redis } from "../lib/redis.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function register(req: Request, res: Response) {
  const { name, age, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // 1. Create user
  const user = await authService.register(name, age, email, password, role);

  // 2. Issue tokens
  const accessToken = TokenService.generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = TokenService.generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // 3. Store refresh token (v1 simple model)
  await redis.set(
    `refreshToken:${user.id}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60 // 7 days
  );

  // 4. Set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 5. Return access token + user info
  return res.status(201).json({
    message: "Registration successful",
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}


export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Please fill all the fields",
      });
    }

    const isBlocked = await authAttemptService.isBlocked(email);
    if (isBlocked) {
      return res.status(429).json({
        message: "Too many failed login attempts. Please try again later.",
      });
    }

    const result = await authService.login(email, password);
     if(!result.user){
      return res.status(401).json({message:"Invalid email or password"});
    }
    if (result.message !== "Login successful") {
      await authAttemptService.recordFailure(email);
      return res.status(401).json(result);
    }

    // ✅ clear failed attempts
    await authAttemptService.clearFailures(email);
   
    const user = result?.user;

    // ✅ token payload (minimal, stable identifiers only)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // ✅ generate tokens
    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    // ✅ store refresh token in Redis
    await redis.set(
      `refreshToken:${user?.email}`,
      refreshToken,
      "EX",
      7 * 24 * 60 * 60 // seconds
    );

    // ✅ set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


export async function getProfile(req: AuthenticatedRequest, res: Response) {
  const user = req.user; 

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.status(200).json({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });
}
