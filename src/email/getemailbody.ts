

export async function getEmailBody(verificationToken: string): Promise<string> {
  const verificationUrl = `${process.env.URL}/verify-email?token=${verificationToken}`;

  return `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif;">
    <h1>Welcome!</h1>
    <p>Please verify your email address:</p>

    <!-- ✅ CLICKABLE LINK -->
    <a href="${verificationUrl}" target="_blank">
      Verify Email Address
    </a>

    <p>Or copy this link:</p>
    <p>${verificationUrl}</p>
  </body>
</html>
  `;
}
