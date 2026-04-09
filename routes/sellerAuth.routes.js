import express from "express";
import {
    registerSeller,
    loginSeller,
    verifyEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
    refreshAccessToken,
    logoutSeller,
    getSellerProfile,
} from "../controllers/sellerAuth.controller.js";

import {
    registerSellerRules,
    loginSellerRules,
    verifyPhoneOtpRules,
    verifyEmailRules,
} from "../validators/seller.validators.js";

import { validate } from "../middleware/validate.middleware.js";
import { protectSeller } from "../middleware/sellerAuth.middleware.js";

const router = express.Router();

// ─── Public Routes ─────────────────────────────────────────────────────────────

// POST /api/v1/sellers/auth/register
router.post("/register", registerSellerRules, validate, registerSeller);

// POST /api/v1/sellers/auth/login
router.post("/login", loginSellerRules, validate, loginSeller);

// POST /api/v1/sellers/auth/verify-email
router.post("/verify-email", verifyEmailRules, validate, verifyEmail);

// POST /api/v1/sellers/auth/refresh-token  (uses HttpOnly cookie)
router.post("/refresh-token", refreshAccessToken);

// ─── Protected Routes (require valid access token) ─────────────────────────────

// POST /api/v1/sellers/auth/send-phone-otp
router.post("/send-phone-otp", protectSeller, sendPhoneOtp);

// POST /api/v1/sellers/auth/verify-phone-otp
router.post("/verify-phone-otp", protectSeller, verifyPhoneOtpRules, validate, verifyPhoneOtp);

// POST /api/v1/sellers/auth/logout
router.post("/logout", protectSeller, logoutSeller);

// GET /api/v1/sellers/auth/me
router.get("/me", protectSeller, getSellerProfile);

export default router;
