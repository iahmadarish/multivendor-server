// models/brand.model.js
import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Brand name is required"],
            unique: true,
            trim: true,
            maxlength: [100, "Brand name cannot exceed 100 characters"],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
        description: {
            type: String,
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        logo: {
            url: String,
            filename: String,
            alt: String,
        },
        website: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        // SEO fields
        seo: {
            metaTitle: String,
            metaDescription: String,
            keywords: [String],
        },
        // For tracking
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUser",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Indexes
brandSchema.index({ name: 1 });
brandSchema.index({ slug: 1 });
brandSchema.index({ isActive: 1, isDeleted: 1 });

// Pre-save hook to generate slug
brandSchema.pre("save", function (next) {
    if (this.isModified("name")) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
            .replace(/\s+/g, "-") // Replace spaces with -
            .replace(/-+/g, "-") // Replace multiple - with single -
            .replace(/^-|-$/g, ""); // Remove leading/trailing -
    }
    next();
});

// Virtual for product count
brandSchema.virtual("productCount", {
    ref: "Product",
    localField: "_id",
    foreignField: "brand",
    count: true,
});

// Static methods
brandSchema.statics.getActiveBrands = function () {
    return this.find({ isActive: true, isDeleted: false })
        .sort({ name: 1 })
        .select("name slug logo description");
};

brandSchema.statics.searchBrands = function (searchTerm) {
    return this.find({
        name: { $regex: searchTerm, $options: "i" },
        isActive: true,
        isDeleted: false,
    }).select("name slug logo");
};

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
