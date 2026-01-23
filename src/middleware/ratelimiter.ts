import { NextFunction, Request ,Response } from "express";
import { redis } from "../lib/redis.js";


export function SignupRateLimiter(
    limit=5,
    windowSeconds = 15 * 60
) {return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        req.socket.remoteAddress;

      if (!ip) {
        return res.status(400).json({ message: "IP not found" });
      }

      const key = `ratelimit:signup:ip:${ip}`;

      const count = await redis.incr(key);

      // first request -> set timer
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // too many requests
      if (count > limit) {
        const ttl = await redis.ttl(key);

        return res.status(429).json({
          message: "Too many signup attempts. Try again later.",
          retryAfterSeconds: ttl,
        });
      }

      next();
    } catch (err) {
      // fail-open (don't block if redis fails)
      next();
    }
  };
}