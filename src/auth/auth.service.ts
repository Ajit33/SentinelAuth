import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import bcrypt from "bcrypt"

export async function register(name: string, age: number, email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(usersTable).values({
    name,
    age,
    email,
    password: hashedPassword,
  });

  return { message: "User registered successfully" };
}