import express from "express";

import {
    registerSeller,
    loginSeller,
    verifyEmailOtp,
    resendEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    refreshAccessToken,
    logoutSeller,
    getSellerProfile,
} from "./sellerAuth.controller.js";

import {
    updateBusinessInfo,
    updateFinancialInfo,
    updateLogisticsInfo,
    updateStoreInfo,
    getOnboardingStatus,
} from "./sellerOnboarding.controller.js";

// ─── নতুন: Profile Update (pending → admin approval) ─────────
import {
    requestProfileUpdate,
    requestBusinessUpdate,
    requestFinancialUpdate,
    requestLogisticsUpdate,
    requestStoreUpdate,
    requestIdentityUpdate,
    getMyPendingUpdates,
    cancelPendingUpdate,
} from "./sellerProfileUpdate.controller.js";

import {
    registerSellerRules,
    loginSellerRules,
    verifyPhoneOtpRules,
    verifyEmailOtpRules,
    resendEmailOtpRules,
    businessInfoRules,
    financialInfoRules,
    logisticsInfoRules,
    storeInfoRules,
    // নতুন validators
    updateProfileRules,
    updateBusinessRules,
    updateFinancialRules,
    updateLogisticsRules,
    updateStoreRules,
    identityInfoRules,
} from "../../validators/seller.validators.js";

import { validate } from "../../middleware/validate.middleware.js";
import { protectSeller } from "../../middleware/sellerAuth.middleware.js";

const router = express.Router();

// ============================================================
//  Public Routes — /api/v1/sellers/auth/
// ============================================================
router.post("/register", registerSellerRules, validate, registerSeller);
router.post("/login", loginSellerRules, validate, loginSeller);
router.post("/verify-email-otp", verifyEmailOtpRules, validate, verifyEmailOtp);
router.post("/resend-email-otp", resendEmailOtpRules, validate, resendEmailOtp);
router.post("/refresh-token", refreshAccessToken);

// ============================================================
//  Protected Routes — /api/v1/sellers/auth/
// ============================================================
router.post("/send-phone-otp", protectSeller, sendPhoneOtp);
router.post("/verify-phone-otp", protectSeller, verifyPhoneOtpRules, validate, verifyPhoneOtp);
router.post("/logout", protectSeller, logoutSeller);
router.get("/me", protectSeller, getSellerProfile);

// ============================================================
//  Onboarding Routes — /api/v1/sellers/auth/onboarding/
//  (First-time setup — directly applied, no approval needed)
// ============================================================
router.put("/onboarding/business", protectSeller, businessInfoRules, validate, updateBusinessInfo);
router.put("/onboarding/financial", protectSeller, financialInfoRules, validate, updateFinancialInfo);
router.put("/onboarding/logistics", protectSeller, logisticsInfoRules, validate, updateLogisticsInfo);
router.put("/onboarding/store", protectSeller, storeInfoRules, validate, updateStoreInfo);
router.get("/onboarding/status", protectSeller, getOnboardingStatus);

// ============================================================
//  Profile Update Routes — /api/v1/sellers/auth/profile/
//  (Post-onboarding update — goes to pending, needs admin approval)
// ============================================================

// Seller তার pending update গুলো দেখতে ও cancel করতে পারবে
router.get("/profile/pending-updates", protectSeller, getMyPendingUpdates);
router.delete("/profile/pending-updates/:updateId", protectSeller, cancelPendingUpdate);

// Section-wise update requests
router.put("/profile/update/profile", protectSeller, updateProfileRules, validate, requestProfileUpdate);
router.put("/profile/update/business", protectSeller, updateBusinessRules, validate, requestBusinessUpdate);
router.put("/profile/update/financial", protectSeller, updateFinancialRules, validate, requestFinancialUpdate);
router.put("/profile/update/logistics", protectSeller, updateLogisticsRules, validate, requestLogisticsUpdate);
router.put("/profile/update/store", protectSeller, updateStoreRules, validate, requestStoreUpdate);
router.put("/profile/update/identity", protectSeller, identityInfoRules, validate, requestIdentityUpdate);

export default router;