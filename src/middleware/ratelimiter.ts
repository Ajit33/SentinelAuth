import { NextFunction, Request ,Response } from "express";
import { redis } from "../lib/redis.js";


export function SignupRateLimiter(
    limit=10,
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


export function loginrateLimiter(
    limit=10,
    windowSeconds = 15 * 60 ){
        return async function (req: Request, res: Response, next: NextFunction) {
            try {
              const ip =
                req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
                req.socket.remoteAddress;
                const loginIdentity=req.body.email;
                if(!loginIdentity){
                    return res.status(400).json({message:"Login identity missing"})
                }
              if (!ip) {
                return res.status(400).json({ message: "IP not found" });
              }
              const loginKeyPart=loginIdentity.replace(/[@.]/g,"_");
              const key = `ratelimit:login:ip:${ip}`;
              const count = await redis.incr(key);
              const loginCountKey=`ratelimit:login:identity:${loginKeyPart}`;
              const identityCount=await redis.incr(loginCountKey);
             if(identityCount===1){
                await redis.expire(loginCountKey,windowSeconds);
             }
              // first request -> set timer
              if (count === 1) {
                await redis.expire(key, windowSeconds);
              }
              // too many requests
              if (count > limit || identityCount>limit) {
                const ttl = await redis.ttl(key);
                return res.status(429).json({
                  message: "Too many login attempts. Try again later.",
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