import { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { authAttemptService } from "./security/auth-attempt.service.js";
import { TokenService } from "./security/token.service.js";
import { redis } from "../lib/redis.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import crypto from "crypto";

export async function register(req: Request, res: Response) {
  const { name, age, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";
  
  const sessionId = crypto.randomUUID();

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
    ip: ip,
    sessionId: sessionId
  });

  // 3. Store refresh token hash
  const hashedRT = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await redis.set(
    `refreshToken:${user.id}:${sessionId}`,
    hashedRT,
    "EX",
    7 * 24 * 60 * 60, // 7 days
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
    if (!result.user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (result.message !== "Login successful") {
      await authAttemptService.recordFailure(email);
      return res.status(401).json(result);
    }

    // ✅ clear failed attempts
    await authAttemptService.clearFailures(email);

    const user = result?.user;

    // ✅ Extract IP address
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    // ✅ Generate unique session ID for this login
    const sessionId = crypto.randomUUID();

    // ✅ token payload (minimal, stable identifiers only)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
   
    const refreshTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: ip,
      sessionId: sessionId
    };
    
    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(refreshTokenPayload);

    const hashedRT = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Store with sessionId in key for multi-session support
    await redis.set(
      `refreshToken:${user.id}:${sessionId}`,
      hashedRT,
      "EX",
      7 * 24 * 60 * 60, // seconds
    );

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

export async function refreshToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const decoded = TokenService.verifyRefreshToken(refreshToken);

    // Get IP from request
    const currentIp =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    // Verify IP hasn't changed (optional security check)
    if (decoded.ip !== currentIp) {
      console.warn(`IP mismatch for user ${decoded.userId}: ${decoded.ip} vs ${currentIp}`);
      // You can choose to reject or just log this
      // return res.status(401).json({ message: "IP address mismatch" });
    }

    // Check stored hash using sessionId
    const storedHash = await redis.get(
      `refreshToken:${decoded.userId}:${decoded.sessionId}`
    );

    const incomingHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    if (!storedHash || storedHash !== incomingHash) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = TokenService.generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    // Generate new session ID for rotation
    const newSessionId = crypto.randomUUID();

    const newRefreshToken = TokenService.generateRefreshToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      ip: currentIp,
      sessionId: newSessionId
    });

    const newRefreshHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    // Delete old session
    await redis.del(`refreshToken:${decoded.userId}:${decoded.sessionId}`);

    // Store new session
    await redis.set(
      `refreshToken:${decoded.userId}:${newSessionId}`,
      newRefreshHash,
      "EX",
      7 * 24 * 60 * 60
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch {
    return res.status(401).json({
      message: "Invalid or expired refresh token",
    });
  }
}