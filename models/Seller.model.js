import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * ============================================================
 *  SELLER SCHEMA — Multi-Vendor E-Commerce Platform
 *  Full production-ready schema with all business domains
 * ============================================================
 */
const sellerSchema = new mongoose.Schema(
    {
        // ─── Authentication & Security ────────────────────────────
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            minlength: [2, "Full name must be at least 2 characters"],
            maxlength: [100, "Full name cannot exceed 100 characters"],
        },
        shopName: {
            type: String,
            required: [true, "Shop name is required"],
            trim: true,
            unique: true,
            minlength: [2, "Shop name must be at least 2 characters"],
            maxlength: [100, "Shop name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
            match: [/^\+?[1-9]\d{6,14}$/, "Please provide a valid phone number"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false, // Never return password in queries by default
        },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false },

        // ─── Email Verification Token ─────────────────────────────
        emailVerificationToken: { type: String, select: false },
        emailVerificationExpires: { type: Date, select: false },

        // ─── Phone OTP ────────────────────────────────────────────
        phoneOtp: { type: String, select: false },
        phoneOtpExpires: { type: Date, select: false },

        // ─── Password Reset ───────────────────────────────────────
        passwordResetToken: { type: String, select: false },
        passwordResetExpires: { type: Date, select: false },

        // ─── Business Information ─────────────────────────────────
        businessType: {
            type: String,
            enum: {
                values: ["individual", "company"],
                message: "Business type must be 'individual' or 'company'",
            },
        },
        companyRegistrationNumber: { type: String, trim: true },
        vatOrBinNumber: { type: String, trim: true },
        country: { type: String, trim: true },

        // ─── Financial Information ────────────────────────────────
        payoutMethod: {
            type: String,
            enum: {
                values: ["bank", "mobile_banking", "payoneer"],
                message: "Payout method must be 'bank', 'mobile_banking', or 'payoneer'",
            },
        },
        bankAccountName: { type: String, trim: true },
        bankAccountNumber: { type: String, trim: true },
        bankName: { type: String, trim: true },
        chequeImage: { type: String }, // URL
        payoutSchedule: {
            type: String,
            enum: {
                values: ["weekly", "monthly"],
                message: "Payout schedule must be 'weekly' or 'monthly'",
            },
        },
        commissionRate: {
            type: Number,
            default: 0,
            min: [0, "Commission rate cannot be negative"],
            max: [100, "Commission rate cannot exceed 100%"],
        },
        taxWithholdingInfo: { type: String, trim: true },

        // ─── Logistics & Fulfillment ──────────────────────────────
        shippingMethod: {
            type: String,
            enum: {
                values: ["self", "platform"],
                message: "Shipping method must be 'self' or 'platform'",
            },
        },
        warehouseLocation: { type: String, trim: true },
        returnAddress: { type: String, trim: true },
        deliveryCoverageArea: { type: String, trim: true },

        // ─── Store Customization ──────────────────────────────────
        shopLogo: { type: String }, // URL
        shopBanner: { type: String }, // URL
        shopDescription: {
            type: String,
            maxlength: [2000, "Shop description cannot exceed 2000 characters"],
        },
        socialLinks: [{ type: String, trim: true }],

        // ─── Seller Performance ───────────────────────────────────
        rating: { type: Number, default: 0, min: 0, max: 5 },
        totalOrders: { type: Number, default: 0, min: 0 },
        cancellationRate: { type: Number, default: 0, min: 0, max: 100 },
        returnRate: { type: Number, default: 0, min: 0, max: 100 },
        lateShipmentRate: { type: Number, default: 0, min: 0, max: 100 },

        // ─── Compliance & Agreement ───────────────────────────────
        termsAccepted: {
            type: Boolean,
            required: [true, "You must accept the terms and conditions"],
            validate: {
                validator: (v) => v === true,
                message: "Terms and conditions must be accepted",
            },
        },
        privacyPolicyAccepted: {
            type: Boolean,
            required: [true, "You must accept the privacy policy"],
            validate: {
                validator: (v) => v === true,
                message: "Privacy policy must be accepted",
            },
        },
        sellerAgreementAcceptedAt: { type: Date },

        // ─── Account Status ───────────────────────────────────────
        status: {
            type: String,
            enum: {
                values: ["pending", "approved", "rejected", "suspended"],
                message: "Invalid status value",
            },
            default: "pending",
        },

        // ─── Refresh Token (for token rotation) ──────────────────
        refreshToken: { type: String, select: false },
    },
    {
        timestamps: true, // createdAt, updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ─── Indexes ──────────────────────────────────────────────────
sellerSchema.index({ email: 1 });
sellerSchema.index({ phone: 1 });
sellerSchema.index({ shopName: 1 });
sellerSchema.index({ status: 1 });

// ─── Virtual: isActive ────────────────────────────────────────
sellerSchema.virtual("isActive").get(function () {
    return this.status === "approved";
});

// ─── Pre-Save Hook: Hash Password ─────────────────────────────
sellerSchema.pre("save", async function (next) {
    // Only hash if password was modified
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ─── Instance Method: Compare Password ───────────────────────
sellerSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Safe Profile (strip sensitive fields) ──
sellerSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpires;
    delete obj.phoneOtp;
    delete obj.phoneOtpExpires;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.refreshToken;
    return obj;
};

const Seller = mongoose.model("Seller", sellerSchema);
export default Seller;
