import prisma from "../config/database.js";
import {
    matchPassword,
    getSignedJwtToken,
    generateEmailVerificationOTP,
    generateResetPasswordOTP,
    updateLoginInfo,
    createUser,
    findUserByEmailWithPassword,
    findUserById,
} from "../services/userService.js";
import { sendEmail } from "../utils/emailService.js";
import crypto from "crypto";

// Token Response Helper
const sendTokenResponse = (user, statusCode, res, expiresDays) => {
    const token = getSignedJwtToken(user);

    const options = {
        expires: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
    };

    // Remove password from output
    const { password, ...userResponse } = user;

    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        token,
        user: userResponse,
    });
};

// @desc    Register a new user
export const register = async (req, res, next) => {
    try {
        const { name, email, password, acceptTerms } = req.body;

        console.log("📝 Registration attempt:", { name, email });

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password",
            });
        }

        if (!acceptTerms) {
            return res.status(400).json({
                success: false,
                message: "Please accept terms and conditions",
            });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        // Create user
        const user = await createUser({ name, email, password });

        console.log("✅ User created successfully:", user.id);

        // Generate OTP
        const { OTP, hashedOTP, OTPExpire } = generateEmailVerificationOTP();

        // Save OTP to user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationOTP: hashedOTP,
                emailVerificationOTPExpire: OTPExpire,
            },
        });

        console.log("🔑 Generated OTP:", OTP);

        // Send verification email
        try {
            await sendEmail({
                email: user.email,
                subject: "Email Verification OTP - Mini Moonira",
                template: "emailVerification",
                data: {
                    name: user.name,
                    otp: OTP,
                },
            });

            console.log("✅ Verification OTP sent to:", user.email);

            res.status(201).json({
                success: true,
                message: "Registration successful! OTP sent to your email.",
                userId: user.id,
                email: user.email,
                requiresVerification: true,
            });
        } catch (emailError) {
            console.error("❌ Email sending failed:", emailError.message);

            // For development - auto verify
            if (process.env.NODE_ENV === "development") {
                console.log("🛠️ DEVELOPMENT: Auto-verifying email due to SMTP failure");

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        isEmailVerified: true,
                        emailVerificationOTP: null,
                        emailVerificationOTPExpire: null,
                    },
                });

                sendTokenResponse(user, 201, res, 1);
            } else {
                // Clean up user
                await prisma.user.delete({
                    where: { id: user.id },
                });

                res.status(500).json({
                    success: false,
                    message: "Failed to send verification email. Please try again later.",
                });
            }
        }
    } catch (error) {
        console.error("❌ Registration error:", error);

        // Prisma unique constraint error
        if (error.code === "P2002") {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error during registration",
        });
    }
};

// @desc    Verify email with OTP
export const verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        console.log("🔐 Email verification attempt:", { email, otp });

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and OTP",
            });
        }

        // Hash OTP
        const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

        // Find user
        const user = await prisma.user.findFirst({
            where: {
                email,
                emailVerificationOTP: hashedOTP,
                emailVerificationOTPExpire: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP or OTP has expired",
            });
        }

        // Verify email
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailVerificationOTP: null,
                emailVerificationOTPExpire: null,
            },
        });

        console.log("✅ Email verified successfully for:", updatedUser.email);
        sendTokenResponse(updatedUser, 200, res, 1);
    } catch (error) {
        console.error("❌ Email verification error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during email verification",
        });
    }
};

// @desc    Login user
export const login = async (req, res, next) => {
    try {
        const { email, password, rememberMe } = req.body;

        console.log("🔑 Login attempt:", { email });

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        // Check user
        const user = await findUserByEmailWithPassword(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check password
        const isMatch = await matchPassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check verification
        if (!user.isEmailVerified) {
            return res.status(401).json({
                success: false,
                message: "Please verify your email first. Check your inbox for OTP.",
            });
        }

        // Check account status
        if (user.status !== "ACTIVE") {
            return res.status(401).json({
                success: false,
                message: "Your account has been suspended. Please contact support.",
            });
        }

        // Update login info
        await updateLoginInfo(user.id);

        console.log("✅ Login successful for user:", user.id);

        const expiresDays = rememberMe ? 30 : 1;
        sendTokenResponse(user, 200, res, expiresDays);
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login",
        });
    }
};

// @desc    Forgot password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email",
            });
        }

        // Generate OTP
        const { OTP, hashedOTP, OTPExpire } = generateResetPasswordOTP();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordOTP: hashedOTP,
                resetPasswordOTPExpire: OTPExpire,
            },
        });

        console.log("📧 Password reset OTP for:", email, "OTP:", OTP);

        // Send email
        try {
            await sendEmail({
                email: user.email,
                subject: "Password Reset OTP - Mini Moonira",
                template: "passwordReset",
                data: {
                    name: user.name,
                    otp: OTP,
                },
            });

            res.status(200).json({
                success: true,
                message: "Password reset OTP sent successfully to your email",
            });
        } catch (emailError) {
            console.error("❌ Email sending error:", emailError.message);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordOTP: null,
                    resetPasswordOTPExpire: null,
                },
            });

            return res.status(500).json({
                success: false,
                message: "Failed to send OTP. Please try again.",
            });
        }
    } catch (error) {
        console.error("❌ Forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during password reset",
        });
    }
};

// @desc    Reset password with OTP
export const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide email, OTP and new password",
            });
        }

        // Hash OTP
        const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

        // Find user
        const user = await prisma.user.findFirst({
            where: {
                email,
                resetPasswordOTP: hashedOTP,
                resetPasswordOTPExpire: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP or OTP has expired",
            });
        }

        // Hash new password
        const { hashPassword } = await import("../services/userService.js");
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordOTP: null,
                resetPasswordOTPExpire: null,
            },
        });

        console.log("🔐 Password reset successful for:", user.email);

        res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password.",
        });
    } catch (error) {
        console.error("❌ Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during password reset",
        });
    }
};

// @desc    Get current user
export const getMe = async (req, res, next) => {
    try {
        const user = await findUserById(req.user.id);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("❌ Get me error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching user data",
        });
    }
};

// @desc    Update profile
export const updateProfile = async (req, res, next) => {
    try {
        const { name, phoneNumber, profilePicture, dateOfBirth, gender } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(name && { name }),
                ...(phoneNumber && { phoneNumber }),
                ...(profilePicture && { profilePicture }),
                ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                ...(gender && { gender }),
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                isEmailVerified: true,
                profilePicture: true,
                dateOfBirth: true,
                gender: true,
                preferences: true,
                lastLogin: true,
                loginCount: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user,
        });
    } catch (error) {
        console.error("❌ Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during profile update",
        });
    }
};

// @desc    Logout
export const logout = (req, res, next) => {
    res.cookie("token", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};

// @desc    Add shipping address
export const addShippingAddress = async (req, res, next) => {
    try {
        const newAddress = req.body;

        // If default, unset others
        if (newAddress.isDefault) {
            await prisma.shippingAddress.updateMany({
                where: {
                    userId: req.user.id,
                    isDefault: true,
                },
                data: { isDefault: false },
            });
        }

        // Add new address
        const address = await prisma.shippingAddress.create({
            data: {
                ...newAddress,
                userId: req.user.id,
            },
        });

        // Get all addresses
        const addresses = await prisma.shippingAddress.findMany({
            where: { userId: req.user.id },
        });

        res.status(200).json({
            success: true,
            message: "Shipping address added successfully",
            data: addresses,
        });
    } catch (error) {
        console.error("❌ Add shipping address error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during adding address",
        });
    }
};

// @desc    Update shipping address
export const updateShippingAddress = async (req, res, next) => {
    try {
        const { addressId } = req.params;
        const updateData = req.body;

        // Check address exists
        const address = await prisma.shippingAddress.findFirst({
            where: {
                id: parseInt(addressId),
                userId: req.user.id,
            },
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found or unauthorized",
            });
        }

        // If default, unset others
        if (updateData.isDefault) {
            await prisma.shippingAddress.updateMany({
                where: {
                    userId: req.user.id,
                    isDefault: true,
                    id: { not: parseInt(addressId) },
                },
                data: { isDefault: false },
            });
        }

        // Update address
        const updatedAddress = await prisma.shippingAddress.update({
            where: { id: parseInt(addressId) },
            data: updateData,
        });

        // Get all addresses
        const addresses = await prisma.shippingAddress.findMany({
            where: { userId: req.user.id },
        });

        res.status(200).json({
            success: true,
            message: "Shipping address updated successfully",
            data: addresses,
        });
    } catch (error) {
        console.error("❌ Update shipping address error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during updating address",
        });
    }
};

// @desc    Delete shipping address
export const deleteShippingAddress = async (req, res, next) => {
    try {
        const { addressId } = req.params;

        const address = await prisma.shippingAddress.findFirst({
            where: {
                id: parseInt(addressId),
                userId: req.user.id,
            },
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found or unauthorized",
            });
        }

        await prisma.shippingAddress.delete({
            where: { id: parseInt(addressId) },
        });

        // Get remaining addresses
        const addresses = await prisma.shippingAddress.findMany({
            where: { userId: req.user.id },
        });

        res.status(200).json({
            success: true,
            message: "Shipping address deleted successfully",
            data: addresses,
        });
    } catch (error) {
        console.error("❌ Delete shipping address error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during deleting address",
        });
    }
};
