import { Request, Response } from "express";
import { redis } from "../lib/redis.js"
import crypto from "crypto";

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // ✅ 1. Get token from query params (not params!)
    const { token } = req.query;

    // ✅ 2. Validate token exists and is a string
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        message: "Verification token is required" 
      });
    }

    // ✅ 3. Get userId from Redis using the token
    const userId = await redis.get(`verification_token:${token}`);

    // ✅ 4. Check if token exists (not expired/invalid)
    if (!userId) {
      return res.status(400).json({ 
        message: "Invalid or expired verification token. Please request a new one." 
      });
    }

    // ✅ 5. Mark user as verified in database
    await authService.markUserAsVerified(parseInt(userId));

    // ✅ 6. Delete the verification token (one-time use)
    await redis.del(`verification_token:${token}`);

    // ✅ 7. Get updated user details
    const user = await authService.getUserById(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ 8. ISSUE TOKENS (Auto-login after verification)
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
                req.socket.remoteAddress || "unknown";
    const sessionId = crypto.randomUUID();

    // Generate access token
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate refresh token
    const refreshToken = TokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: ip,
      sessionId: sessionId
    });

    // Hash and store refresh token
    const hashedRT = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await redis.set(
      `refreshToken:${user.id}:${sessionId}`,
      hashedRT,
      "EX",
      7 * 24 * 60 * 60
    );

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ 9. Return success with tokens
    return res.status(200).json({
      message: "Email verified successfully! You are now logged in.",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true
      }
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ 
      message: "Verification failed. Please try again." 
    });
  }
};