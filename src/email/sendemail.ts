import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<void> {

    console.log("56658586557")
    console.log(process.env.EMAIL_USER)
    console.log(process.env.EMAIL_PASS)
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("Email send failed:", error);
    throw new Error("EMAIL_SEND_FAILED");
  }
}
