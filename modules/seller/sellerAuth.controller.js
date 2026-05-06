import SellerModel from "./Seller.model.js";
import prisma from "../../config/database.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../../utils/jwt.utils.js";
import { generatePhoneOtp, hashToken, generateEmailOtp } from "../../utils/token.utils.js";
import { sendEmailOtp, sendResendConfirmation } from "../../utils/email.service.js";

//  attach HttpOnly refresh-token cookie
const attachRefreshCookie = (res, token) => {
    res.cookie("sellerRefreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

//clear refresh-token cookie
const clearRefreshCookie = (res) => {
    res.clearCookie("sellerRefreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
};

// ============================================================
//  @desc    Register a new seller
//  @route   POST /api/v1/sellers/auth/register
//  @access  Public
// ============================================================
export const registerSeller = async (req, res, next) => {
    try {
        const { fullName, shopName, email, phone, password, termsAccepted, privacyPolicyAccepted } =
            req.body;

        // Checking for duplicate
        const existingSeller = await prisma.seller.findFirst({
            where: {
                OR: [
                    { email: email.toLowerCase() },
                    { phone },
                ],
            },
        });

        if (existingSeller) {
            const field = existingSeller.email === email.toLowerCase() ? "email" : "phone";
            return res.status(409).json({
                success: false,
                message: `A seller account with this ${field} already exists. Please select a different  email or number or contact with authority`,
            });
        }

        // Generate email OTP
        const { otp, hashedOtp, expires } = generateEmailOtp();

        // Create seller
        const seller = await SellerModel.create({
            fullName,
            shopName,
            email,
            phone,
            password,
            termsAccepted: termsAccepted === "true" || termsAccepted === true,
            privacyPolicyAccepted: privacyPolicyAccepted === "true" || privacyPolicyAccepted === true,
            emailOtp: hashedOtp,
            emailOtpExpires: expires,
        });

        // Send real OTP via email
        await sendEmailOtp(email, otp, fullName);

        return res.status(201).json({
            success: true,
            message: "Seller account created successfully. Please verify your email with the OTP sent to your inbox.",
            data: {
                seller: SellerModel.toSafeObject(seller),
            },
        });
    } catch (error) {
        // Prisma unique constraint error
        if (error.code === "P2002") {
            const field = error.meta?.target?.[0] || "field";
            return res.status(409).json({
                success: false,
                message: `A seller with this ${field} already exists.`,
            });
        }
        next(error);
    }
};

// ============================================================
//  @desc    Login
//  @route   POST /api/v1/sellers/auth/login
//  @access  Public
// ============================================================
export const loginSeller = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find seller with password
        const seller = await prisma.seller.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!seller) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const isMatch = await SellerModel.comparePassword(password, seller.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // Block if email not verified
        if (!seller.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in. Check your inbox for the OTP.",
            });
        }

        if (seller.status === "suspended") {
            return res.status(403).json({
                success: false,
                message: "Your seller account has been suspended. Contact support.",
            });
        }

        const accessToken = generateAccessToken(seller.id);
        const refreshToken = generateRefreshToken(seller.id);

        // Store hashed refresh token
        await prisma.seller.update({
            where: { id: seller.id },
            data: { refreshToken: hashToken(refreshToken) },
        });

        attachRefreshCookie(res, refreshToken);

        // Check profile completion
        const hasBusinessInfo = seller.businessType && 
            (seller.businessType === "individual" || seller.companyRegistrationNumber);
        const hasFinancialInfo = seller.payoutMethod && seller.bankAccountNumber;
        const hasStoreInfo = seller.shopLogo || seller.shopDescription;
        const hasIdentityInfo = seller.identityType && seller.identityNumber && seller.identityFrontImage;
        const isProfileComplete = !!(hasBusinessInfo && hasFinancialInfo && hasStoreInfo && hasIdentityInfo);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                seller: SellerModel.toSafeObject(seller),
                accessToken,
                isProfileComplete,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Verify email with OTP
//  @route   POST /api/v1/sellers/auth/verify-email-otp
//  @access  Public
// ============================================================
export const verifyEmailOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required.",
            });
        }

        const hashedOtp = hashToken(otp);

        const seller = await SellerModel.findForEmailVerification(email, hashedOtp);

        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP or OTP has expired. Please request a new one.",
            });
        }

        // Mark email as verified and clear OTP fields
        await prisma.seller.update({
            where: { id: seller.id },
            data: {
                isEmailVerified: true,
                emailOtp: null,
                emailOtpExpires: null,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You may now log in.",
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Resend email OTP
//  @route   POST /api/v1/sellers/auth/resend-email-otp
//  @access  Public
// ============================================================
export const resendEmailOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const seller = await SellerModel.findByEmail(email);

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "No seller account found with this email.",
            });
        }

        if (seller.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified.",
            });
        }

        // Generate new OTP
        const { otp, hashedOtp, expires } = generateEmailOtp();

        await prisma.seller.update({
            where: { id: seller.id },
            data: {
                emailOtp: hashedOtp,
                emailOtpExpires: expires,
            },
        });

        // Send new OTP via email
        await sendEmailOtp(email, otp, seller.fullName);
        await sendResendConfirmation(email, seller.fullName);

        return res.status(200).json({
            success: true,
            message: "New verification OTP sent to your email. Valid for 10 minutes.",
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Send phone OTP
//  @route   POST /api/v1/sellers/auth/send-phone-otp
//  @access  Private (seller must be logged in)
// ============================================================
export const sendPhoneOtp = async (req, res, next) => {
    try {
        const seller = await SellerModel.findById(parseInt(req.seller.id));

        if (seller.isPhoneVerified) {
            return res.status(400).json({
                success: false,
                message: "Your phone number is already verified.",
            });
        }

        const { otp, hashedOtp, expires } = generatePhoneOtp();

        await prisma.seller.update({
            where: { id: seller.id },
            data: {
                phoneOtp: hashedOtp,
                phoneOtpExpires: expires,
            },
        });

        return res.status(200).json({
            success: true,
            message: `OTP sent to ${seller.phone}. Valid for 10 minutes.`,
            ...(process.env.NODE_ENV !== "production" && { dev_otp: otp }),
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Verify phone OTP
//  @route   POST /api/v1/sellers/auth/verify-phone-otp
//  @access  Private
// ============================================================
export const verifyPhoneOtp = async (req, res, next) => {
    try {
        const { otp } = req.body;
        const hashedOtp = hashToken(otp);

        const seller = await SellerModel.findForPhoneVerification(
            parseInt(req.seller.id),
            hashedOtp
        );

        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "OTP is invalid or has expired.",
            });
        }

        await prisma.seller.update({
            where: { id: seller.id },
            data: {
                isPhoneVerified: true,
                phoneOtp: null,
                phoneOtpExpires: null,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Phone number verified successfully.",
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Refresh access token
//  @route   POST /api/v1/sellers/auth/refresh-token
//  @access  Public
// ============================================================
export const refreshAccessToken = async (req, res, next) => {
    try {
        const token = req.cookies?.sellerRefreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No refresh token found.",
            });
        }

        // Verify token signature
        const decoded = verifyRefreshToken(token);

        // Check against DB-stored hash
        const hashedToken = hashToken(token);
        const seller = await prisma.seller.findFirst({
            where: {
                id: parseInt(decoded.id),
                refreshToken: hashedToken,
            },
        });

        if (!seller) {
            clearRefreshCookie(res);
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token. Please log in again.",
            });
        }

        // Rotate tokens
        const newAccessToken = generateAccessToken(seller.id);
        const newRefreshToken = generateRefreshToken(seller.id);

        await prisma.seller.update({
            where: { id: seller.id },
            data: { refreshToken: hashToken(newRefreshToken) },
        });

        attachRefreshCookie(res, newRefreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed.",
            data: { accessToken: newAccessToken },
        });
    } catch (error) {
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            clearRefreshCookie(res);
            return res.status(401).json({
                success: false,
                message: "Refresh token expired or invalid. Please log in again.",
            });
        }
        next(error);
    }
};

// ============================================================
//  @desc    Logout seller
//  @route   POST /api/v1/sellers/auth/logout
//  @access  Private
// ============================================================
export const logoutSeller = async (req, res, next) => {
    try {
        await prisma.seller.update({
            where: { id: parseInt(req.seller.id) },
            data: { refreshToken: null },
        });

        clearRefreshCookie(res);

        return res.status(200).json({
            success: true,
            message: "Logged out successfully.",
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Get current logged-in seller profile
//  @route   GET /api/v1/sellers/auth/me
//  @access  Private
// ============================================================
export const getSellerProfile = async (req, res, next) => {
    try {
        const seller = await SellerModel.findById(parseInt(req.seller.id));

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: { seller: SellerModel.toSafeObject(seller) },
        });
    } catch (error) {
        next(error);
    }
};