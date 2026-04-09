import { body } from "express-validator";

// ─── Registration Validation Rules ────────────────────────────
export const registerSellerRules = [
    body("fullName")
        .trim()
        .notEmpty().withMessage("Full name is required")
        .isLength({ min: 2, max: 100 }).withMessage("Full name must be between 2 and 100 characters"),

    body("shopName")
        .trim()
        .notEmpty().withMessage("Shop name is required")
        .isLength({ min: 2, max: 100 }).withMessage("Shop name must be between 2 and 100 characters"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^\+?[1-9]\d{6,14}$/).withMessage("Please provide a valid phone number (e.g. +8801XXXXXXXXX)"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/\d/).withMessage("Password must contain at least one number"),

    body("termsAccepted")
        .equals("true").withMessage("You must accept the terms and conditions"),

    body("privacyPolicyAccepted")
        .equals("true").withMessage("You must accept the privacy policy"),
];

// ─── Login Validation Rules ────────────────────────────────────
export const loginSellerRules = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required"),
];

// ─── Phone OTP Verification Rules ─────────────────────────────
export const verifyPhoneOtpRules = [
    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^\+?[1-9]\d{6,14}$/).withMessage("Please provide a valid phone number"),

    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
        .isNumeric().withMessage("OTP must be numeric"),
];

// ─── Email Verification Rules ──────────────────────────────────
export const verifyEmailRules = [
    body("token")
        .trim()
        .notEmpty().withMessage("Verification token is required"),
];
