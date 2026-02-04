// src/auth/auth.service.ts

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import bcrypt from "bcrypt";
import { 
  ConflictError, 
  UnauthorizedError, 
  NotFoundError 
} from "../utils/errors.js";

/**
 * Register new user
 * @throws {ConflictError} If email already exists
 */
export async function register(
  name: string,
  age: number,
  email: string,
  password: string,
  role: string
) {
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new ConflictError("Email already registered"); 
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_COST) || 10
  );


  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      age,
      email,
      password: hashedPassword,
      role,

    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isVerified: usersTable.isVerified,
    });

  return user;
}

/**
 * Login user
 * @throws {UnauthorizedError} If credentials are invalid
 */
export async function login(email: string, password: string) {
  // ❌ REMOVE try-catch - let errors bubble up

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password"); 
  }

  // 2. Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Mark user as verified
 * @throws {NotFoundError} If user not found
 */
export async function markUserAsVerified(userId: number): Promise<void> {
  const result = await db
    .update(usersTable)
    .set({ isVerified: true })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id });
   console.log(result)
  if (result.length === 0) {
    throw new NotFoundError("User not found"); 
  }
}

/**
 * Get user by ID
 * @throws {NotFoundError} If user not found
 */
export async function getUserById(userId: number) {
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isVerified: usersTable.isVerified,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

/**
 * Get user by email
 * @throws {NotFoundError} If user not found
 */
export async function getUserByEmail(email: string) {
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isVerified: usersTable.isVerified,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    throw new NotFoundError("User not found"); 
  }

  return user;
}




