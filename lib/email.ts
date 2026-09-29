import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function SendEmail({ to, subject, html }: SendEmailParams) {
  const from = process.env.AUTH_EMAIL_FROM;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!from) {
    throw new Error("AUTH_EMAIL_FROM is not configured");
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
