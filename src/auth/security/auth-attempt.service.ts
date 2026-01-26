import {redis} from "../../lib/redis.js";

const FAILURE_LIMIT = 5;
const FAILURE_WINDOW_SECONDS = 15 * 60; // 15 minutes
const COOLDOWN_SECONDS = 10 * 60; // 10 minutes

function normalizeIdentity(identity: string) {
  return identity.toLowerCase().replace(/[@.]/g, "_");
}

export const authAttemptService = {
  async recordFailure(identity: string) {
    const key = `auth:failures:${normalizeIdentity(identity)}`;

    const attempts = await redis.incr(key);

    if (attempts === 1) {
      await redis.expire(key, FAILURE_WINDOW_SECONDS);
    }
     console.log(`Failed login attempts for ${identity}: ${attempts}`);
    if (attempts >= FAILURE_LIMIT) {
      await redis.set(
        `auth:cooldown:${normalizeIdentity(identity)}`,
        "1",
        "EX",
        COOLDOWN_SECONDS
      );
    }
  },

  async clearFailures(identity: string) {
    const normalized = normalizeIdentity(identity);
    await redis.del(
      `auth:failures:${normalized}`,
      `auth:cooldown:${normalized}`
    );
  },

  async isBlocked(identity: string): Promise<boolean> {
    const key = `auth:cooldown:${normalizeIdentity(identity)}`;
    const blocked = await redis.exists(key);
    return blocked === 1;
  },
};
