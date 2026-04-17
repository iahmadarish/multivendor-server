import crypto from "crypto";

/**
 * Generate a 6-digit numeric OTP for email verification
 * @returns {Object} { otp, hashedOtp, expires }
 */
export const generateEmailOtp = () => {
    const otp = String(crypto.randomInt(100000, 999999));
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { otp, hashedOtp, expires };
};

/**
 * Generate a secure random email verification token.
 * Returns both the raw token (to be emailed) and
 * a hashed version (stored in DB).
 */
export const generateEmailVerificationToken = () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return { rawToken, hashedToken, expires };
};

/**
 * Generate a 6-digit numeric OTP for phone verification.
 * Returns both the raw OTP (to be sent via SMS) and
 * a hashed version (stored in DB).
 */
export const generatePhoneOtp = () => {
    // Cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { otp, hashedOtp, expires };
};

/**
 * Hash an incoming token for comparison with DB-stored hash.
 * @param {string} token - raw token from request
 * @returns {string} sha256 hex digest
 */
export const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};
