import express from "express";

// auth controllers
import {
    registerSeller,
    loginSeller,
    verifyEmailOtp, // ✅ NEW
    resendEmailOtp, // ✅ NEW
    sendPhoneOtp,
    verifyPhoneOtp,
    refreshAccessToken,
    logoutSeller,
    getSellerProfile,
} from "../controllers/sellerAuth.controller.js";

// onboarding controllers
import {
    updateBusinessInfo,
    updateFinancialInfo,
    updateLogisticsInfo,
    updateStoreInfo,
    getOnboardingStatus,
} from "../controllers/sellerOnboarding.controller.js";

import {
    businessInfoRules,
    financialInfoRules,
    logisticsInfoRules,
    storeInfoRules,
} from "../validators/seller.validators.js";

import {
    registerSellerRules,
    loginSellerRules,
    verifyPhoneOtpRules,
    verifyEmailOtpRules, // ✅ NEW
    resendEmailOtpRules, // ✅ NEW
} from "../validators/seller.validators.js";

import { validate } from "../middleware/validate.middleware.js";
import { protectSeller } from "../middleware/sellerAuth.middleware.js";

const router = express.Router();

//! ─── Public Routes : /api/v1/sellers/auth/ ─────────────────────────────────────────────────────────────
router.post("/register", registerSellerRules, validate, registerSeller);
router.post("/login", loginSellerRules, validate, loginSeller);

//! ✅ NEW Email OTP Routes: /api/v1/sellers/auth/
router.post("/verify-email-otp", verifyEmailOtpRules, validate, verifyEmailOtp);
router.post("/resend-email-otp", resendEmailOtpRules, validate, resendEmailOtp);

// POST /api/v1/sellers/auth/refresh-token  (uses HttpOnly cookie)
router.post("/refresh-token", refreshAccessToken);

//! ─── Protected Routes (require valid access token): /api/v1/sellers/auth/ ─────────────────────────────
router.post("/send-phone-otp", protectSeller, sendPhoneOtp);
router.post("/verify-phone-otp", protectSeller, verifyPhoneOtpRules, validate, verifyPhoneOtp);
router.post("/logout", protectSeller, logoutSeller);
router.get("/me", protectSeller, getSellerProfile);

//! ─── Onboarding Routes (Protected): /api/v1/sellers/auth/onboarding ────────────────────────────
router.put("/onboarding/business", protectSeller, businessInfoRules, validate, updateBusinessInfo);
router.put(
    "/onboarding/financial",
    protectSeller,
    financialInfoRules,
    validate,
    updateFinancialInfo,
);
router.put(
    "/onboarding/logistics",
    protectSeller,
    logisticsInfoRules,
    validate,
    updateLogisticsInfo,
);
router.put("/onboarding/store", protectSeller, storeInfoRules, validate, updateStoreInfo);
router.get("/onboarding/status", protectSeller, getOnboardingStatus);

export default router;
