import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function SendEmail({ to, subject, html }: SendEmailParams) {
  try {
    await resend.emails.send({
      from: "onboarding@resend.com",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
