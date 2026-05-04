import prisma from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

class UserModel {
    // Create a new user
    static async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        return prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email.toLowerCase(),
                password: hashedPassword,
            },
        });
    }

    // Find user by email
    static async findByEmail(email, includePassword = false) {
        // Prisma doesn't have select: false, we control password exposure manually
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    // Find user by ID
    static async findById(id) {
        return prisma.user.findUnique({
            where: { id },
        });
    }

    // Update user by ID
    static async updateById(id, data) {
        return prisma.user.update({
            where: { id },
            data,
        });
    }

    // Delete user by ID
    static async deleteById(id) {
        return prisma.user.delete({
            where: { id },
        });
    }

    // Find user with OTP for email verification
    static async findForEmailVerification(email, hashedOTP) {
        return prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                emailVerificationOTP: hashedOTP,
                emailVerificationOTPExpire: {
                    gt: new Date(),
                },
            },
        });
    }

    // Find user with OTP for password reset
    static async findForPasswordReset(email, hashedOTP) {
        return prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                resetPasswordOTP: hashedOTP,
                resetPasswordOTPExpire: {
                    gt: new Date(),
                },
            },
        });
    }

    // Match password
    static async matchPassword(enteredPassword, hashedPassword) {
        return bcrypt.compare(enteredPassword, hashedPassword);
    }

    // Generate JWT token (static utility)
    static getSignedJwtToken(user) {
        return jwt.sign(
            {
                id: user.id,
                role: user.role,
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE || "30d",
            },
        );
    }

    // Generate and save email verification OTP
    static async generateEmailVerificationOTP(userId) {
        const OTP = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash("sha256").update(OTP).digest("hex");
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationOTP: hashedOTP,
                emailVerificationOTPExpire: otpExpire,
            },
        });

        return OTP;
    }

    // Generate and save password reset OTP
    static async generateResetPasswordOTP(userId) {
        const OTP = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash("sha256").update(OTP).digest("hex");
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: userId },
            data: {
                resetPasswordOTP: hashedOTP,
                resetPasswordOTPExpire: otpExpire,
            },
        });

        return OTP;
    }

    // Update login info
    static async updateLoginInfo(userId) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                lastLogin: new Date(),
                loginCount: {
                    increment: 1,
                },
            },
        });
    }

    // Add shipping address
    static async addShippingAddress(userId, addressData) {
        if (addressData.isDefault) {
            // Unset existing defaults
            await prisma.shippingAddress.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        return prisma.shippingAddress.create({
            data: {
                userId,
                ...addressData,
            },
        });
    }

    // Get user with shipping addresses
    static async findByIdWithAddresses(id) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                shippingAddresses: true,
            },
        });
    }
}

export default UserModel;
