// utils/email.service.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmailOtp = async (email, otp, fullName) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification OTP</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
                .footer { text-align: center; padding-top: 20px; font-size: 12px; color: #6b7280; }
                .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Email Verification</h1>
                </div>
                <div class="content">
                    <p>Hello ${fullName},</p>
                    <p>Thank you for registering as a seller! Please use the following OTP to verify your email address:</p>
                    <div class="otp-code">${otp}</div>
                    <p>This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <p style="margin-top: 30px;">Best regards,<br>Your E-commerce Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Your E-commerce Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await transporter.sendMail({
        from: `"Daraz" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: "Verify Your Email Address - OTP Code",
        html,
    });
};

export const sendResendConfirmation = async (email, fullName) => {
    // Optional: Send confirmation that OTP was resent
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New OTP Sent</h2>
            <p>Hello ${fullName},</p>
            <p>A new verification OTP has been sent to your email address.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"E-commerce Platform" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: "New Verification OTP Sent",
        html,
    });
};
