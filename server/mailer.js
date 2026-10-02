const nodemailer = require("nodemailer");

// Email is optional. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM to send real
// emails (for Gmail: smtp.gmail.com, port 465, and an App Password).
let transport;

const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransport = () => {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
};

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const sendPasswordReset = async ({ to, name, url }) => {
  await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your Awesome ToDo's password",
    text: `Hi ${name},\n\nUse this link to choose a new password. It works once and expires in 30 minutes:\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f1d3a">
      <h2 style="color:#1f63e6">Reset your password</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Use the button below to choose a new password. The link works once and expires in 30 minutes.</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#1f63e6;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
      <p style="color:#5b6785;font-size:13px">If you didn't ask for this, you can ignore this email.</p>
    </div>`,
  });
};

module.exports = { isConfigured, sendPasswordReset };
