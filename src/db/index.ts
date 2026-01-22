import { drizzle } from "drizzle-orm/neon-http";
import "dotenv/config";

// If you are using Neon HTTP driver
export const db = drizzle(process.env.DATABASE_URL!);
