import Seller from "./Seller.model.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../../utils/jwt.utils.js";
import { generatePhoneOtp, hashToken, generateEmailOtp } from "../../utils/token.utils.js";
import { sendEmailOtp, sendResendConfirmation } from "../../utils/email.service.js";

// ─── Helper: attach HttpOnly refresh-token cookie ─────────────
const attachRefreshCookie = (res, token) => {
    res.cookie("sellerRefreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

// ─── Helper: clear refresh-token cookie ───────────────────────
const clearRefreshCookie = (res) => {
    res.clearCookie("sellerRefreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
};

// ============================================================
//  @desc    Register a new seller (UPDATED)
//  @route   POST /api/v1/sellers/auth/register
//  @access  Public
// ============================================================
export const registerSeller = async (req, res, next) => {
    try {
        const { fullName, shopName, email, phone, password, termsAccepted, privacyPolicyAccepted } =
            req.body;

        // Check for duplicate
        const existingSeller = await Seller.findOne({
            $or: [{ email }, { phone }],
        });

        if (existingSeller) {
            const field = existingSeller.email === email ? "email" : "phone";
            return res.status(409).json({
                success: false,
                message: `A seller account with this ${field} already exists.`,
            });
        }

        // Generate email OTP instead of token
        const { otp, hashedOtp, expires } = generateEmailOtp();

        // Create seller
        const seller = await Seller.create({
            fullName,
            shopName,
            email,
            phone,
            password,
            termsAccepted: termsAccepted === "true" || termsAccepted === true,
            privacyPolicyAccepted:
                privacyPolicyAccepted === "true" || privacyPolicyAccepted === true,
            sellerAgreementAcceptedAt: new Date(),
            emailOtp: hashedOtp, 
            emailOtpExpires: expires, 
        });

        // Send real OTP via email
        await sendEmailOtp(email, otp, fullName);

        return res.status(201).json({
            success: true,
            message:
                "Seller account created successfully. Please verify your email with the OTP sent to your inbox.",
            data: {
                seller: seller.toSafeObject(),
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `A seller with this ${field} already exists.`,
            });
        }
        next(error);
    }
};

// ============================================================
//  @desc    Login (UPDATED - with email verification check)
//  @route   POST /api/v1/sellers/auth/login
//  @access  Public
// ============================================================
export const loginSeller = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const seller = await Seller.findOne({ email }).select("+password +refreshToken");
        if (!seller) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const isMatch = await seller.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // NEW: Block if email not verified
        if (!seller.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message:
                    "Please verify your email before logging in. Check your inbox for the OTP.",
            });
        }

        if (seller.status === "suspended") {
            return res.status(403).json({
                success: false,
                message: "Your seller account has been suspended. Contact support.",
            });
        }

        const accessToken = generateAccessToken(seller._id);
        const refreshToken = generateRefreshToken(seller._id);

        seller.refreshToken = hashToken(refreshToken);
        await seller.save({ validateBeforeSave: false });

        attachRefreshCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                seller: seller.toSafeObject(),
                accessToken,
                isProfileComplete: seller.isProfileComplete, // Send profile completion status
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Verify email with OTP (NEW)
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

        const seller = await Seller.findOne({
            email,
            emailOtp: hashedOtp,
            emailOtpExpires: { $gt: Date.now() },
        }).select("+emailOtp +emailOtpExpires");

        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP or OTP has expired. Please request a new one.",
            });
        }

        // Mark email as verified and clear OTP fields
        seller.isEmailVerified = true;
        seller.emailOtp = undefined;
        seller.emailOtpExpires = undefined;
        await seller.save({ validateBeforeSave: false });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You may now log in.",
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Resend email OTP (NEW)
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

        const seller = await Seller.findOne({ email }).select("+emailOtp +emailOtpExpires");

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

        seller.emailOtp = hashedOtp;
        seller.emailOtpExpires = expires;
        await seller.save({ validateBeforeSave: false });

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
//  @desc    Verify seller email via token
//  @route   POST /api/v1/sellers/auth/verify-email
//  @access  Public
// ============================================================
// export const verifyEmail = async (req, res, next) => {
//     try {
//         const { token } = req.body;

//         // Hash the incoming raw token for DB lookup
//         const hashedToken = hashToken(token);

//         const seller = await Seller.findOne({
//             emailVerificationToken: hashedToken,
//             emailVerificationExpires: { $gt: Date.now() },
//         }).select("+emailVerificationToken +emailVerificationExpires");

//         if (!seller) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email verification token is invalid or has expired.",
//             });
//         }

//         // Mark email as verified and clear token
//         seller.isEmailVerified = true;
//         seller.emailVerificationToken = undefined;
//         seller.emailVerificationExpires = undefined;
//         await seller.save({ validateBeforeSave: false });

//         return res.status(200).json({
//             success: true,
//             message: "Email verified successfully. You may now log in.",
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// ============================================================
//  @desc    Send phone OTP
//  @route   POST /api/v1/sellers/auth/send-phone-otp
//  @access  Private (seller must be logged in)
// ============================================================
export const sendPhoneOtp = async (req, res, next) => {
    try {
        const seller = await Seller.findById(req.seller._id).select("+phoneOtp +phoneOtpExpires");

        if (seller.isPhoneVerified) {
            return res.status(400).json({
                success: false,
                message: "Your phone number is already verified.",
            });
        }

        const { otp, hashedOtp, expires } = generatePhoneOtp();

        seller.phoneOtp = hashedOtp;
        seller.phoneOtpExpires = expires;
        await seller.save({ validateBeforeSave: false });

        // [MOCK] Log OTP — replace with Twilio / AWS SNS / local gateway in production
        console.log(`\n📱 [MOCK SMS] Send to ${seller.phone}:`);
        console.log(`   Your OTP: ${otp} (valid for 10 minutes)\n`);

        return res.status(200).json({
            success: true,
            message: `OTP sent to ${seller.phone}. Valid for 10 minutes.`,
            // ⚠️  Remove 'dev_otp' before going to production!
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

        const seller = await Seller.findOne({
            _id: req.seller._id,
            phoneOtp: hashedOtp,
            phoneOtpExpires: { $gt: Date.now() },
        }).select("+phoneOtp +phoneOtpExpires");

        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "OTP is invalid or has expired.",
            });
        }

        seller.isPhoneVerified = true;
        seller.phoneOtp = undefined;
        seller.phoneOtpExpires = undefined;
        await seller.save({ validateBeforeSave: false });

        return res.status(200).json({
            success: true,
            message: "Phone number verified successfully.",
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Refresh access token using refresh token cookie
//  @route   POST /api/v1/sellers/auth/refresh-token
//  @access  Public (uses HttpOnly cookie)
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
        const seller = await Seller.findOne({
            _id: decoded.id,
            refreshToken: hashedToken,
        }).select("+refreshToken");

        if (!seller) {
            clearRefreshCookie(res);
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token. Please log in again.",
            });
        }

        // Rotate tokens (token rotation pattern)
        const newAccessToken = generateAccessToken(seller._id);
        const newRefreshToken = generateRefreshToken(seller._id);

        seller.refreshToken = hashToken(newRefreshToken);
        await seller.save({ validateBeforeSave: false });

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
//  @desc    Logout seller (clear refresh token)
//  @route   POST /api/v1/sellers/auth/logout
//  @access  Private
// ============================================================
export const logoutSeller = async (req, res, next) => {
    try {
        // Remove refresh token from DB
        await Seller.findByIdAndUpdate(
            req.seller._id,
            { $unset: { refreshToken: "" } },
            { new: true },
        );

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
        const seller = await Seller.findById(req.seller._id);

        return res.status(200).json({
            success: true,
            data: { seller: seller.toSafeObject() },
        });
    } catch (error) {
        next(error);
    }
};
