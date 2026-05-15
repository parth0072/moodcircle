const crypto = require('crypto');
const nodemailer = require('nodemailer');

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOTP(to, otp) {
  // Dev mode — log to console, no email sent
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[OTP] ${otp}  →  ${to}`);
    return;
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"MoodCircle" <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} is your MoodCircle code`,
    text: `Your MoodCircle login code is: ${otp}\n\nIt expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:22px">Your login code</h2>
        <p style="margin:0 0 24px;color:#71717A">Use this code to sign in to MoodCircle. It expires in 10 minutes.</p>
        <div style="background:#F5F5F7;border-radius:12px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:800;color:#6C47FF">${otp}</div>
        <p style="margin:24px 0 0;font-size:12px;color:#A1A1AA">If you didn't request this, you can safely ignore it.</p>
      </div>`,
  });
}

module.exports = { generateOTP, sendOTP };
