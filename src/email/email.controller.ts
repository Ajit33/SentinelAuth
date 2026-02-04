import { Request, Response } from "express";
import { redis } from "../lib/redis.js"
import crypto from "crypto";
import { getUserById, markUserAsVerified } from "../auth/auth.service.js";
import { TokenService } from "../auth/security/token.service.js";

export const verifyEmail = async (req: Request, res: Response) => {
  console.log("keyyyyy")
  try {

    const token = req.query.token;


    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        message: "Verification token is required" 
      });
    }

    const userId = await redis.get(`verification_token:${token}`);
     console.log(userId)
    // ✅ 4. Check if token exists (not expired/invalid)
    if (!userId) {
      return res.status(400).json({ 
        message: "Invalid or expired verification token. Please request a new one." 
      });
    }

    // ✅ 5. Mark user as verified in database
    await markUserAsVerified(parseInt(userId));
    await redis.del(`verification_token:${token}`);

    // ✅ 7. Get updated user details
    const user = await getUserById(parseInt(userId));
    
    if (!user || Array.isArray(user) || 'message' in user) {
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