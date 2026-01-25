import { eq } from "drizzle-orm";
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