import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import bcrypt from "bcrypt"
export async function register(
  name: string,
  age: number,
  email: string,
  password: string,
  role: string
) {
  // 1. Check existing user
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("User already exists");
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_COST) || 10
  );

  // 3. Insert + return user
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
      email: usersTable.email,
      role: usersTable.role,
    });

  return user;
}


export async function login(email:string,password:string){
    try {
       const [user]=await db.select().from(usersTable).where(eq(usersTable.email,email)).limit(1);
       if(!user){
        return {message:"Invalid email or password"}
       }
       const isPasswordVaild=await bcrypt.compare(password,user.password);
       if(!isPasswordVaild){
        return {message:"Invalid email or password"}
       }
        return {message:"Login successful"};
    } catch (error) {
      return {message:"Login failed"};
    }
}