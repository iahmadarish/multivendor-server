import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * ============================================================
 *  SELLER SCHEMA — Multi-Vendor E-Commerce Platform
 *  Full production-ready schema with all business domains
 * ============================================================
 */

// ─── Sub-schema: Pending Update Entry ─────────────────────────
// যখন seller কোনো তথ্য update করবে, সেটা এই array তে store হবে।
// Admin approve করলে main field এ apply হবে।
const pendingUpdateSchema = new mongoose.Schema(
    {
        section: {
            type: String,
            enum: ["profile", "business", "financial", "logistics", "store", "identity"],
            required: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed, // flexible — যেকোনো object store করতে পারবে
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        requestedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        rejectionReason: { type: String, trim: true },
    },
    { _id: true },
);

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
            select: false,
        },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false },

        // ─── Email OTP ────────────────────────────────────────────
        emailOtp: { type: String, select: false },
        emailOtpExpires: { type: Date, select: false },

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

        // ─── Identity Verification ────────────────────────────────
        // Owner এর NID বা Passport দিয়ে identity verify করা হবে।
        // chequeImage এর মতোই — URL store হবে (Cloudinary / S3 থেকে)।
        identityType: {
            type: String,
            enum: {
                values: ["nid", "passport"],
                message: "Identity type must be 'nid' or 'passport'",
            },
        },
        identityNumber: {
            type: String,
            trim: true,
        },
        identityFrontImage: { type: String }, // URL — NID front / Passport data page
        identityBackImage: { type: String },  // URL — NID back (passport এর ক্ষেত্রে optional)
        isIdentityVerified: { type: Boolean, default: false },

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
        shopLogo: { type: String },    // URL
        shopBanner: { type: String },  // URL
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

        // ─── Pending Updates ──────────────────────────────────────
        // Seller যখন কোনো তথ্য update করতে চাইবে, সেটা এখানে
        // "pending" হিসেবে store হবে। Admin approve করলে
        // applyPendingUpdate() method দিয়ে main field এ apply হবে।
        pendingUpdates: {
            type: [pendingUpdateSchema],
            default: [],
            select: false, // profile query তে by default আসবে না
        },

        // ─── Refresh Token ────────────────────────────────────────
        refreshToken: { type: String, select: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ─── Indexes ──────────────────────────────────────────────────
sellerSchema.index({ email: 1 });
sellerSchema.index({ phone: 1 });
sellerSchema.index({ shopName: 1 });
sellerSchema.index({ status: 1 });
// pending update গুলো efficiently query করার জন্য
sellerSchema.index({ "pendingUpdates.status": 1 });
sellerSchema.index({ "pendingUpdates.section": 1 });

// ─── VIRTUAL: isProfileComplete ───────────────────────────────
sellerSchema.virtual("isProfileComplete").get(function () {
    const hasBusinessInfo =
        this.businessType &&
        (this.businessType === "individual" || this.companyRegistrationNumber);

    const hasFinancialInfo = this.payoutMethod && this.bankAccountNumber;
    const hasStoreInfo = this.shopLogo || this.shopDescription;
    const hasIdentityInfo = this.identityType && this.identityNumber && this.identityFrontImage;

    return !!(hasBusinessInfo && hasFinancialInfo && hasStoreInfo && hasIdentityInfo);
});

// ─── VIRTUAL: isActive ────────────────────────────────────────
sellerSchema.virtual("isActive").get(function () {
    return this.status === "approved";
});

// ─── VIRTUAL: hasPendingUpdates ──────────────────────────────
// Seller এর কোনো pending update আছে কিনা সহজে check করার জন্য।
// Note: pendingUpdates select:false তাই এই virtual টা কাজ করবে
// শুধুমাত্র যখন pendingUpdates explicitly select করা হবে।
sellerSchema.virtual("hasPendingUpdates").get(function () {
    if (!this.pendingUpdates) return false;
    return this.pendingUpdates.some((u) => u.status === "pending");
});

// ─── Pre-Save Hook: Hash Password ─────────────────────────────
sellerSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ─── Instance Method: Compare Password ───────────────────────
sellerSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Safe Profile ────────────────────────────
sellerSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.emailOtp;
    delete obj.emailOtpExpires;
    delete obj.phoneOtp;
    delete obj.phoneOtpExpires;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.refreshToken;
    delete obj.pendingUpdates; // sensitive — আলাদা endpoint দিয়ে serve করা হবে
    return obj;
};

// ─── Instance Method: Apply Pending Update ────────────────────
/**
 * Admin যখন একটি pending update approve করবে, এই method call হবে।
 * pendingUpdateId দিয়ে সঠিক entry খুঁজে বের করে main fields এ apply করে।
 *
 * @param {string} pendingUpdateId - pendingUpdates array র _id
 * @param {ObjectId} adminId - কোন admin approve করল
 * @returns {Object} applied data
 */
sellerSchema.methods.applyPendingUpdate = async function (pendingUpdateId, adminId) {
    const update = this.pendingUpdates.id(pendingUpdateId);

    if (!update) throw new Error("Pending update not found");
    if (update.status !== "pending") throw new Error("This update has already been reviewed");

    // data গুলো main fields এ copy করা
    const fieldsToApply = update.data;
    Object.keys(fieldsToApply).forEach((key) => {
        this[key] = fieldsToApply[key];
    });

    // pending entry টি approved হিসেবে mark করা
    update.status = "approved";
    update.reviewedAt = new Date();
    update.reviewedBy = adminId;

    await this.save({ validateBeforeSave: false });
    return fieldsToApply;
};

// ─── Instance Method: Reject Pending Update ──────────────────
/**
 * Admin যখন একটি pending update reject করবে।
 *
 * @param {string} pendingUpdateId
 * @param {ObjectId} adminId
 * @param {string} reason - rejection এর কারণ
 */
sellerSchema.methods.rejectPendingUpdate = async function (pendingUpdateId, adminId, reason) {
    const update = this.pendingUpdates.id(pendingUpdateId);

    if (!update) throw new Error("Pending update not found");
    if (update.status !== "pending") throw new Error("This update has already been reviewed");

    update.status = "rejected";
    update.reviewedAt = new Date();
    update.reviewedBy = adminId;
    update.rejectionReason = reason || "No reason provided";

    await this.save({ validateBeforeSave: false });
};

const Seller = mongoose.model("Seller", sellerSchema);
export default Seller;