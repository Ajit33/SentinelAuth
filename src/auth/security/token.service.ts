import jwt, { SignOptions } from "jsonwebtoken";

export interface TokenPayload {
  userId: number;
  email: string;
  role?: string;
}

export class TokenService {
  private static accessTokenSecret = process.env.ACCESS_TOKEN_SECRET!;
  private static refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;

  private static accessTokenExpiry = "15m"; // keeps string format for jwt.sign
  private static refreshTokenExpiry = "7d"; // keeps string format for jwt.sign

  /**
   * Issue Access Token
   */
  static generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.accessTokenExpiry as any,
      issuer: "sentinel-auth",
      audience: "sentinel-auth-users",
    };

    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  /**
   * Issue Refresh Token
   */
  static generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.refreshTokenExpiry as any,
      issuer: "sentinel-auth",
      audience: "sentinel-auth-users",
    };

    return jwt.sign(payload, this.refreshTokenSecret, options);
  }

  /**
   * Verify Access Token
   */
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(
      token,
      this.accessTokenSecret
    ) as TokenPayload;
  }

  /**
   * Verify Refresh Token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(
      token,
      this.refreshTokenSecret
    ) as TokenPayload;
  }
}
