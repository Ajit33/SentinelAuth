import { getEmailBody} from "./getemailbody.js"
import { sendEmail } from "./sendemail.js";



 export const sendVerificationEmail = async (email:string, verificationToken:string, name:string): Promise<{message: string}> => {
     const emailbody=await getEmailBody(verificationToken);
     const subject="verify your email"
     await sendEmail({ to:email,subject:subject,html:emailbody})
      return {message:"verification sent"}
}
