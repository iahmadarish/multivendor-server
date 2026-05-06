// modules/seller/Seller.model.js
import prisma from "../../config/database.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

class SellerModel {
    // ─── Create Seller ─────────────────────────────
    static async create(data) {
        const hashedPassword = await bcrypt.hash(data.password, 12);
        
        return prisma.seller.create({
            data: {
                fullName: data.fullName,
                shopName: data.shopName,
                email: data.email.toLowerCase(),
                phone: data.phone,
                password: hashedPassword,
                termsAccepted: data.termsAccepted,
                privacyPolicyAccepted: data.privacyPolicyAccepted,
                sellerAgreementAcceptedAt: new Date(),
                emailOtp: data.emailOtp,
                emailOtpExpires: data.emailOtpExpires,
            },
        });
    }

    // ─── Find by Email ────────────────────────────
    static async findByEmail(email) {
        return prisma.seller.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    // ─── Find by Email with Password ──────────────
    static async findByEmailWithPassword(email) {
        return prisma.seller.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    // ─── Find by ID ───────────────────────────────
    static async findById(id) {
        return prisma.seller.findUnique({
            where: { id },
            include: {
                pendingUpdates: true,
            },
        });
    }

    // ─── Find by ID with pendingUpdates ───────────
    static async findByIdWithPendingUpdates(id) {
        return prisma.seller.findUnique({
            where: { id },
            include: {
                pendingUpdates: {
                    where: { status: "pending" },
                },
            },
        });
    }

    // ─── Update by ID ─────────────────────────────
    static async updateById(id, data) {
        return prisma.seller.update({
            where: { id },
            data,
        });
    }

    // ─── Find for Email Verification ──────────────
    static async findForEmailVerification(email, hashedOtp) {
        return prisma.seller.findFirst({
            where: {
                email: email.toLowerCase(),
                emailOtp: hashedOtp,
                emailOtpExpires: {
                    gt: new Date(),
                },
            },
        });
    }

    // ─── Find for Phone Verification ──────────────
    static async findForPhoneVerification(id, hashedOtp) {
        return prisma.seller.findFirst({
            where: {
                id,
                phoneOtp: hashedOtp,
                phoneOtpExpires: {
                    gt: new Date(),
                },
            },
        });
    }

    // ─── Compare Password ─────────────────────────
    static async comparePassword(enteredPassword, hashedPassword) {
        return bcrypt.compare(enteredPassword, hashedPassword);
    }

    // ─── Add Pending Update ───────────────────────
    static async addPendingUpdate(sellerId, section, data) {
        return prisma.pendingUpdate.create({
            data: {
                sellerId,
                section,
                data,
            },
        });
    }

    // ─── Get Pending Updates ──────────────────────
    static async getPendingUpdates(sellerId) {
        return prisma.pendingUpdate.findMany({
            where: { sellerId },
            orderBy: { requestedAt: "desc" },
        });
    }

    // ─── Remove Pending Update ────────────────────
    static async removePendingUpdate(updateId) {
        return prisma.pendingUpdate.delete({
            where: { id: updateId },
        });
    }

    // ─── toSafeObject (Virtual-এর বদলে) ─────────
    static toSafeObject(seller) {
        const { password, emailOtp, emailOtpExpires, phoneOtp, phoneOtpExpires, passwordResetToken, passwordResetExpires, refreshToken, ...safeSeller } = seller;
        return safeSeller;
    }
}

export default SellerModel;