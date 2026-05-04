import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/database.js";

// Hash password utility
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Match password
export const matchPassword = async (enteredPassword, hashedPassword) => {
    return await bcrypt.compare(enteredPassword, hashedPassword);
};

// Generate JWT
export const getSignedJwtToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE },
    );
};

// Generate Email Verification OTP
export const generateEmailVerificationOTP = () => {
    const OTP = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = crypto.createHash("sha256").update(OTP).digest("hex");

    const OTPExpire = new Date(Date.now() + 10 * 60 * 1000);

    return { OTP, hashedOTP, OTPExpire };
};

// Generate Reset Password OTP
export const generateResetPasswordOTP = () => {
    const OTP = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = crypto.createHash("sha256").update(OTP).digest("hex");

    const OTPExpire = new Date(Date.now() + 10 * 60 * 1000);

    return { OTP, hashedOTP, OTPExpire };
};

// Update login info
export const updateLoginInfo = async (userId) => {
    return await prisma.user.update({
        where: { id: userId },
        data: {
            lastLogin: new Date(),
            loginCount: { increment: 1 },
        },
    });
};

// Create user
export const createUser = async (userData) => {
    const hashedPassword = await hashPassword(userData.password);

    return await prisma.user.create({
        data: {
            ...userData,
            password: hashedPassword,
        },
    });
};

// Find user by email with password
export const findUserByEmailWithPassword = async (email) => {
    return await prisma.user.findUnique({
        where: { email },
    });
};

// Find user by ID (without password)
export const findUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
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
            shippingAddresses: true,
        },
    });
};

export default {
    hashPassword,
    matchPassword,
    getSignedJwtToken,
    generateEmailVerificationOTP,
    generateResetPasswordOTP,
    updateLoginInfo,
    createUser,
    findUserByEmailWithPassword,
    findUserById,
};
