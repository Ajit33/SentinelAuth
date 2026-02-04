// src/auth/auth.controller.ts

import { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { authAttemptService } from "./security/auth-attempt.service.js";
import { TokenService } from "./security/token.service.js";
import { redis } from "../lib/redis.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../email/email.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "../utils/errors.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, age, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw new BadRequestError("Missing required fields");
  }

  const user = await authService.register(name, age, email, password, role);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Store in Redis
  await redis.set(
    `verification_token:${verificationToken}`,
    user.id.toString(),
    "EX",
    24 * 60 * 60,
  );

  await sendVerificationEmail(email, verificationToken, name);

  return res.status(201).json({
    success: true,
    message:
      "Registration successful! Please check your email to verify your account.",
    data: {
      email: user.email,
      isVerified: user.isVerified,
    },
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    throw new BadRequestError("Verification token is required");
  }

  const userId = await redis.get(`verification_token:${token}`);

  if (!userId) {
    throw new BadRequestError("Invalid or expired verification token");
  }

  await authService.markUserAsVerified(parseInt(userId));

  // Delete token
  await redis.del(`verification_token:${token}`);

  const user = await authService.getUserById(parseInt(userId));

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";
  const sessionId = crypto.randomUUID();

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
    sessionId: sessionId,
  });

  const hashedRT = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await redis.set(
    `refreshToken:${user.id}:${sessionId}`,
    hashedRT,
    "EX",
    7 * 24 * 60 * 60,
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "Email verified successfully! You are now logged in.",
    data: {
      accessToken,
      user,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }
  const isBlocked = await authAttemptService.isBlocked(email);
  if (isBlocked) {
    throw new ForbiddenError(
      "Too many failed login attempts. Please try again later.",
    );
  }
  const user = await authService.login(email, password);
  await authAttemptService.clearFailures(email);
  if (!user.isVerified) {
    throw new ForbiddenError(
      "Please verify your email before logging in. Check your inbox for the verification link.",
    );
  }
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";
  const sessionId = crypto.randomUUID();

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
    sessionId: sessionId,
  });
  const hashedRT = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await redis.set(
    `refreshToken:${user.id}:${sessionId}`,
    hashedRT,
    "EX",
    7 * 24 * 60 * 60,
  );
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      user,
    },
  });
});
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError("Email is required");
    }
    const user = await authService.getUserByEmail(email);
    if (user.isVerified) {
      throw new BadRequestError("Email already verified. You can login now!");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await redis.set(
      `verification_token:${verificationToken}`,
      user.id.toString(),
      "EX",
      24 * 60 * 60,
    );

    // Send email
    await sendVerificationEmail(email, verificationToken, user.name);

    return res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  },
);
export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Unauthorized");
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  },
);
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token missing");
    }
    const decoded = TokenService.verifyRefreshToken(refreshToken);
    const currentIp =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    if (decoded.ip !== currentIp) {
      console.warn(
        `IP mismatch for user ${decoded.userId}: ${decoded.ip} vs ${currentIp}`,
      );
    }
    const storedHash = await redis.get(
      `refreshToken:${decoded.userId}:${decoded.sessionId}`,
    );

    const incomingHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    if (!storedHash || storedHash !== incomingHash) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Generate new tokens
    const newAccessToken = TokenService.generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    const newSessionId = crypto.randomUUID();

    const newRefreshToken = TokenService.generateRefreshToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      ip: currentIp,
      sessionId: newSessionId,
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
      7 * 24 * 60 * 60,
    );

    // Set cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  },
);
