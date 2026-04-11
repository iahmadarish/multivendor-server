import { body } from "express-validator";

// ============================================================
//  Registration & Auth Validators
// ============================================================

export const registerSellerRules = [
    body("fullName")
        .trim()
        .notEmpty()
        .withMessage("Full name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Full name must be between 2 and 100 characters"),

    body("shopName")
        .trim()
        .notEmpty()
        .withMessage("Shop name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Shop name must be between 2 and 100 characters"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("phone")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required")
        .matches(/^\+?[1-9]\d{6,14}$/)
        .withMessage("Please provide a valid phone number (e.g. +8801XXXXXXXXX)"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/\d/)
        .withMessage("Password must contain at least one number"),

    body("termsAccepted").equals("true").withMessage("You must accept the terms and conditions"),
    body("privacyPolicyAccepted").equals("true").withMessage("You must accept the privacy policy"),
];

export const loginSellerRules = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required"),
];

export const verifyPhoneOtpRules = [
    body("phone")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required")
        .matches(/^\+?[1-9]\d{6,14}$/)
        .withMessage("Please provide a valid phone number"),

    body("otp")
        .trim()
        .notEmpty()
        .withMessage("OTP is required")
        .isLength({ min: 6, max: 6 })
        .withMessage("OTP must be exactly 6 digits")
        .isNumeric()
        .withMessage("OTP must be numeric"),
];

export const verifyEmailOtpRules = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("otp")
        .trim()
        .notEmpty()
        .withMessage("OTP is required")
        .isLength({ min: 6, max: 6 })
        .withMessage("OTP must be exactly 6 digits")
        .isNumeric()
        .withMessage("OTP must be numeric"),
];

export const resendEmailOtpRules = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),
];

// ============================================================
//  Onboarding Validators (First-time setup — directly applied)
// ============================================================

export const businessInfoRules = [
    body("businessType")
        .optional()
        .isIn(["individual", "company"])
        .withMessage("Business type must be 'individual' or 'company'"),

    body("companyRegistrationNumber").optional().trim(),
    body("vatOrBinNumber").optional().trim(),
    body("country").optional().trim(),
];

export const financialInfoRules = [
    body("payoutMethod")
        .optional()
        .isIn(["bank", "mobile_banking", "payoneer"])
        .withMessage("Invalid payout method"),

    body("bankAccountName").optional().trim(),
    body("bankAccountNumber").optional().trim(),
    body("bankName").optional().trim(),

    body("chequeImage")
        .optional()
        .isURL()
        .withMessage("Cheque image must be a valid URL"),

    body("payoutSchedule")
        .optional()
        .isIn(["weekly", "monthly"])
        .withMessage("Payout schedule must be 'weekly' or 'monthly'"),
];

export const logisticsInfoRules = [
    body("shippingMethod")
        .optional()
        .isIn(["self", "platform"])
        .withMessage("Shipping method must be 'self' or 'platform'"),

    body("warehouseLocation").optional().trim(),
    body("returnAddress").optional().trim(),
    body("deliveryCoverageArea").optional().trim(),
];

export const storeInfoRules = [
    body("shopLogo").optional().isURL().withMessage("Shop logo must be a valid URL"),
    body("shopBanner").optional().isURL().withMessage("Shop banner must be a valid URL"),

    body("shopDescription")
        .optional()
        .isLength({ max: 2000 })
        .withMessage("Shop description cannot exceed 2000 characters"),

    body("socialLinks").optional().isArray().withMessage("Social links must be an array"),
    body("socialLinks.*").optional().isURL().withMessage("Each social link must be a valid URL"),
];

// ============================================================
//  Profile Update Validators (Post-onboarding — needs approval)
//  Onboarding rules এর মতোই, কিন্তু আলাদা রাখা হয়েছে যাতে
//  ভবিষ্যতে আলাদা rules দেওয়া যায় (যেমন কঠোর validation)।
// ============================================================

export const updateProfileRules = [
    body("fullName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Full name must be between 2 and 100 characters"),

    body("shopName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Shop name must be between 2 and 100 characters"),
];

export const updateBusinessRules = [
    body("businessType")
        .optional()
        .isIn(["individual", "company"])
        .withMessage("Business type must be 'individual' or 'company'"),

    body("companyRegistrationNumber").optional().trim(),
    body("vatOrBinNumber").optional().trim(),
    body("country").optional().trim(),
];

export const updateFinancialRules = [
    body("payoutMethod")
        .optional()
        .isIn(["bank", "mobile_banking", "payoneer"])
        .withMessage("Invalid payout method"),

    body("bankAccountName").optional().trim(),
    body("bankAccountNumber").optional().trim(),
    body("bankName").optional().trim(),

    body("chequeImage")
        .optional()
        .isURL()
        .withMessage("Cheque image must be a valid URL"),

    body("payoutSchedule")
        .optional()
        .isIn(["weekly", "monthly"])
        .withMessage("Payout schedule must be 'weekly' or 'monthly'"),
];

export const updateLogisticsRules = [
    body("shippingMethod")
        .optional()
        .isIn(["self", "platform"])
        .withMessage("Shipping method must be 'self' or 'platform'"),

    body("warehouseLocation").optional().trim(),
    body("returnAddress").optional().trim(),
    body("deliveryCoverageArea").optional().trim(),
];

export const updateStoreRules = [
    body("shopLogo").optional().isURL().withMessage("Shop logo must be a valid URL"),
    body("shopBanner").optional().isURL().withMessage("Shop banner must be a valid URL"),

    body("shopDescription")
        .optional()
        .isLength({ max: 2000 })
        .withMessage("Shop description cannot exceed 2000 characters"),

    body("socialLinks").optional().isArray().withMessage("Social links must be an array"),
    body("socialLinks.*").optional().isURL().withMessage("Each social link must be a valid URL"),
];

// ─── Identity Validation Rules (NID / Passport) ───────────────
export const identityInfoRules = [
    body("identityType")
        .optional()
        .isIn(["nid", "passport"])
        .withMessage("Identity type must be 'nid' or 'passport'"),

    body("identityNumber")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Identity number cannot be empty")
        .isLength({ min: 5, max: 30 })
        .withMessage("Identity number must be between 5 and 30 characters"),

    body("identityFrontImage")
        .optional()
        .isURL()
        .withMessage("Identity front image must be a valid URL"),

    body("identityBackImage")
        .optional()
        .isURL()
        .withMessage("Identity back image must be a valid URL"),

    // identityType দিলে অবশ্যই number ও front image লাগবে
    body("identityNumber").if(body("identityType").exists()).notEmpty().withMessage(
        "Identity number is required when identity type is provided",
    ),

    body("identityFrontImage").if(body("identityType").exists()).notEmpty().withMessage(
        "Identity front image is required when identity type is provided",
    ),
];