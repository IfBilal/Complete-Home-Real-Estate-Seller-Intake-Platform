import nodemailer from "nodemailer";
import { adminSupabase } from "../supabase/admin";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `Complete Home <${process.env.GMAIL_USER}>`;

export async function sendAdminAlert(
  submissionId: string,
  humanId: string,
  firstName: string,
  lastName: string,
  address: string,
  sellerEmail: string
): Promise<void> {
  const { data: admins } = await adminSupabase
    .from("admin_users")
    .select("email")
    .eq("status", "active");

  const recipients = (admins ?? []).map(a => a.email).filter(Boolean);
  if (recipients.length === 0) return;

  let status = "sent";
  let errorMessage: string | null = null;

  try {
    await transporter.sendMail({
      from:    FROM,
      to:      recipients,
      subject: `New Intake — ${humanId} — ${address}`,
      html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#E8541A;padding:16px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">New Seller Submission</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px">Submission ID</td><td style="padding:8px 0;font-weight:600">${humanId}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Seller</td><td style="padding:8px 0;font-weight:600">${firstName} ${lastName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Address</td><td style="padding:8px 0;font-weight:600">${address}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0">${sellerEmail}</td></tr>
    </table>
  </div>
</div>`,
    });
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error("Admin alert failed:", e);
  }

  await adminSupabase.from("email_log").insert({
    submission_id: submissionId,
    email_type:    "admin_alert",
    recipient:     recipients.join(", "),
    resend_id:     null,
    status,
    error_message: errorMessage,
  });
}

export async function sendSellerConfirmation(
  submissionId: string,
  sellerEmail: string,
  firstName: string,
  humanId: string
): Promise<void> {
  let status = "sent";
  let errorMessage: string | null = null;

  try {
    await transporter.sendMail({
      from:    FROM,
      to:      sellerEmail,
      subject: `We received your submission — ${humanId}`,
      html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#1C1008;padding:16px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">Complete Home</h1>
  </div>
  <div style="padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <h2 style="color:#1C1008;margin:0 0 16px">Hi ${firstName}, thanks for your submission!</h2>
    <p style="color:#374151;line-height:1.6">We've received your property review request (<strong>${humanId}</strong>). Our team will respond within 48 hours with a market analysis and private offer.</p>
    <div style="background:#fff7f5;border-left:4px solid #E8541A;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
      <strong style="color:#1C1008">What happens next:</strong>
      <ol style="color:#374151;margin:8px 0 0;padding-left:20px;line-height:1.8">
        <li>Our team reviews your submission and photos</li>
        <li>We run a full market analysis on your property</li>
        <li>You receive a private offer with no obligation to accept</li>
      </ol>
    </div>
    <p style="color:#6b7280;font-size:14px;margin-top:24px">Questions? Reply to this email or call (678) 815-9233.</p>
  </div>
</div>`,
    });
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error("Seller confirmation failed:", e);
  }

  await adminSupabase.from("email_log").insert({
    submission_id: submissionId,
    email_type:    "seller_confirmation",
    recipient:     sellerEmail,
    resend_id:     null,
    status,
    error_message: errorMessage,
  });
}
