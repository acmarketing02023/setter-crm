import nodemailer from "nodemailer";

// Optional real-time alerts. No-ops if SLACK_WEBHOOK_URL isn't configured,
// so this is safe to call from any code path without extra guards.
export async function notifySlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Best-effort only — never let a notification failure break the caller.
  }
}

// Lead-facing confirmation email, sent via Gmail SMTP (App Password auth).
// No-ops if GMAIL_USER / GMAIL_APP_PASSWORD aren't configured, so this is
// safe to call from any code path without extra guards. Best-effort only —
// a failed send should never break booking creation.
export async function sendLeadConfirmationEmail(
  to: string,
  opts: { name: string; scheduledAt: Date }
) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !to) return;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const when = opts.scheduledAt.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    await transporter.sendMail({
      from: `"AC Marketing" <${user}>`,
      to,
      subject: "You're booked in — AC Marketing",
      text: `Hi ${opts.name},\n\nThanks for booking a call with AC Marketing. We've got you down for ${when}, and we'll call you at that time to confirm.\n\nTalk soon,\nAC Marketing`,
      html: `<p>Hi ${opts.name},</p><p>Thanks for booking a call with AC Marketing. We've got you down for <strong>${when}</strong>, and we'll call you at that time to confirm.</p><p>Talk soon,<br/>AC Marketing</p>`,
    });
  } catch {
    // Best-effort only — never let a notification failure break the caller.
  }
}
