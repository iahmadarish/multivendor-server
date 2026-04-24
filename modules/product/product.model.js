import mongoose from "mongoose";
import { makeSlug } from "../../utils/makeSlug.js";

// Money schema for precise pricing
const moneySchema = new mongoose.Schema(
    {
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: "BDT", uppercase: true },
    },
    { _id: false },
);

const discountSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["none", "percentage", "fixed"],
            default: "none",
        },
        value: { type: Number, default: 0, min: 0 },
        effectivePrice: { type: Number, min: 0 },
        startDate: { type: Date },
        endDate: { type: Date },
    },
    { _id: false },
);


const seoSchema = new mongoose.Schema(
    {
        slug: { 
            type: String, 
            unique: true, 
            sparse: true 
        },
        metaTitle: { 
            type: String, 
            maxlength: 70,
            default: "" 
        },
        metaDescription: { 
            type: String, 
            maxlength: 160,
            default: "" 
        },
        canonicalUrl: { 
            type: String,
            default: "" 
        },
        keywords: {
            type: [String],
            default: undefined  
        },
        schema: { 
            type: mongoose.Schema.Types.Mixed,
            default: undefined
        },
    },
    { 
        _id: false,
        strict: true,  
    },
);


const thumbnailSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        filename: { type: String },
        originalName: { type: String },
        alt: { type: String, default: "" },
        width: { type: Number },
        height: { type: Number },
        size: { type: Number },
        mimetype: { type: String },
    },
    { _id: false },
);


const imageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        originalName: { type: String },
        alt: { type: String, trim: true },
        size: { type: Number },
        mimetype: { type: String },
        width: { type: Number },
        height: { type: Number },
        sortOrder: { type: Number, default: 0 },
    },
    { _id: false },
);


const videoSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        filename: { type: String },
        title: { type: String },
        duration: { type: Number },
        sortOrder: { type: Number, default: 0 },
    },
    { _id: false },
);


const variantOptionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        values: [{ type: String, trim: true, required: true }],
        displayType: {
            type: String,
            enum: ["dropdown", "swatch", "button", "radio"],
            default: "button",
        },
        isRequired: { type: Boolean, default: true },
    },
    { _id: false },
);


const variantCombinationSchema = new mongoose.Schema(
    {
        combination: [
            {
                name: { type: String, required: true, trim: true },
                value: { type: String, required: true, trim: true },
                _id: false,
            },
        ],
        sku: { type: String, required: true, unique: true, sparse: true },
        barcode: { type: String },
        price: { type: moneySchema, required: true },
        compareAtPrice: { type: moneySchema },
        discount: { type: discountSchema },
        stock: { type: Number, default: 0, min: 0 },
        reservedStock: { type: Number, default: 0, min: 0 },
        images: [imageSchema],
        weight: { type: Number, min: 0 },
        dimensions: {
            length: { type: Number, min: 0 },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 },
        },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true, _id: true },
);


const productAttributeSchema = new mongoose.Schema(
    {
        groupName: { type: String, default: "General", trim: true },
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
        unit: { type: String, trim: true },
        isFilterable: { type: Boolean, default: false },
        isVisible: { type: Boolean, default: true },
    },
    { _id: false },
);


const deliverySchema = new mongoose.Schema(
    {
        weight: { type: Number, default: 0, min: 0 },
        dimensions: {
            length: { type: Number, default: 0, min: 0 },
            width: { type: Number, default: 0, min: 0 },
            height: { type: Number, default: 0, min: 0 },
        },
        shippingClass: {
            type: String,
            enum: ["standard", "express", "overnight", "free"],
            default: "standard",
        },
        isFreeShipping: { type: Boolean, default: false },
        estimatedDelivery: { type: String },
        handlingTime: { type: Number, default: 1 },
    },
    { _id: false },
);


const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Product title is required"],
            trim: true,
            maxlength: [500, "Title cannot exceed 500 characters"],
            index: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            index: true,
        },
        shortDescription: {
            type: String,
            maxlength: [500, "Short description cannot exceed 500 characters"],
        },
        description: {
            type: String,
            required: [true, "Product description is required"],
        },
        highlights: [{ type: String, trim: true }],

        // ── Multi-vendor Ownership ──────────────────────────────────────────────
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: [true, "Vendor is required"],
            index: true,
        },
        brand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Brand",
            index: true,
        },
        brandName: { type: String, trim: true },

        // ── Taxonomy & Classification ────────────────────────────────────────────
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Category is required"],
            index: true,
        },
        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            index: true,
        },
        tags: [{ type: String, trim: true, index: true }],
        collections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Collection" }],

        // ── Pricing & Discounts ──────────────────────────────────────────────────
        price: { type: moneySchema, required: true },
        compareAtPrice: { type: moneySchema },
        discount: { type: discountSchema },
        taxRate: { type: Number, default: 0, min: 0, max: 100 },
        isTaxable: { type: Boolean, default: true },

        // ── Inventory Management ─────────────────────────────────────────────────
        sku: { type: String, unique: true, sparse: true, index: true },
        stock: { type: Number, default: 0, min: 0, index: true },
        reservedStock: { type: Number, default: 0 },
        lowStockThreshold: { type: Number, default: 5, min: 0 },
        backorderAllowed: { type: Boolean, default: false },
        maxOrderQuantity: { type: Number, default: 0 },
        minOrderQuantity: { type: Number, default: 1, min: 1 },

        // ── Media Assets ─────────────────────────────────────────────────────────
        thumbnail: { type: thumbnailSchema, required: true },
        images: [imageSchema],
        videos: [videoSchema],

        // ── Product Variations ───────────────────────────────────────────────────
        hasVariants: { type: Boolean, default: false },
        variantOptions: [variantOptionSchema],
        variants: [variantCombinationSchema],

        // ── Attributes & Specifications ──────────────────────────────────────────
        attributes: [productAttributeSchema],

        // ── Shipping & Delivery ──────────────────────────────────────────────────
        delivery: { type: deliverySchema },
        returnPolicy: { type: String },
        warrantyInfo: { type: String },
        countryOfOrigin: { type: String, trim: true },

        // ── SEO & Metadata ───────────────────────────────────────────────────────
        seo: { type: seoSchema },

        // ── Ratings & Reviews Summary ────────────────────────────────────────────
        rating: {
            average: {
                type: Number,
                default: 0,
                min: 0,
                max: 5,
                set: (v) => Math.round(v * 10) / 10,
            },
            count: { type: Number, default: 0, min: 0 },
            distribution: {
                1: { type: Number, default: 0 },
                2: { type: Number, default: 0 },
                3: { type: Number, default: 0 },
                4: { type: Number, default: 0 },
                5: { type: Number, default: 0 },
            },
        },

        // ── Analytics ─────────────────────────────────────────────────────────────
        analytics: {
            views: { type: Number, default: 0, min: 0 },
            salesCount: { type: Number, default: 0, min: 0 },
            wishlistCount: { type: Number, default: 0, min: 0 },
            shareCount: { type: Number, default: 0, min: 0 },
        },

        // ── Visibility & Publishing ──────────────────────────────────────────────
        visibility: {
            type: String,
            enum: ["visible", "hidden", "catalog_only", "search_only"],
            default: "visible",
            index: true,
        },
        status: {
            type: String,
            enum: ["draft", "pending_review", "published", "rejected", "archived"],
            default: "draft",
            index: true,
        },
        isActive: { type: Boolean, default: true, index: true },
        isFeatured: { type: Boolean, default: false, index: true },
        isDeleted: { type: Boolean, default: false, index: true },
        publishedAt: { type: Date },
        rejectedReason: { type: String },

        // ── Date Ranges ───────────────────────────────────────────────────────────
        availableFrom: { type: Date },
        availableTo: { type: Date },

        // ── Audit Trail ──────────────────────────────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "creatorModel",
            required: true,
        },
        creatorModel: {
            type: String,
            enum: ["Seller", "AdminUser"],
            required: true,
        },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
        approvedAt: { type: Date },
        lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "lastModifiedByModel" },
        lastModifiedByModel: { type: String, enum: ["Seller", "AdminUser"] },

        // ─── Extra Data ──────────────────────────────────────────────────────────
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ──────────────────────────────────────────────────────────────────────────────
// INDEXES
// ──────────────────────────────────────────────────────────────────────────────
productSchema.index({ title: "text", shortDescription: "text", description: "text" });
productSchema.index({ vendor: 1, status: 1 });
productSchema.index({ category: 1, status: 1, isActive: 1 });
productSchema.index({ "price.amount": 1, status: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ publishedAt: -1 });
productSchema.index({ "rating.average": -1 });
productSchema.index({ "analytics.salesCount": -1 });
productSchema.index({ isFeatured: 1, status: 1 });
productSchema.index({ availableFrom: 1, availableTo: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ status: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ vendor: 1, status: 1, isActive: 1 });
productSchema.index({ category: 1, "price.amount": 1, "rating.average": 1 });

// ──────────────────────────────────────────────────────────────────────────────
// PRE-SAVE MIDDLEWARES
// ──────────────────────────────────────────────────────────────────────────────

// Auto-generate slug
productSchema.pre("save", async function (next) {
    if (this.isModified("title") && this.title) {
        let baseSlug = makeSlug(this.title);
        let slug = baseSlug;
        let counter = 1;

        const existingProduct = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
        if (existingProduct) {
            slug = `${baseSlug}-${counter}`;
            while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
                counter++;
                slug = `${baseSlug}-${counter}`;
            }
        }
        this.slug = slug;

        if (this.seo) {
            this.seo.slug = this.slug;
        }
    }
    next();
});

// Calculate discount effective price
productSchema.pre("save", function (next) {
    if (this.discount && this.discount.type !== "none" && this.discount.value > 0) {
        let effectivePrice = this.price.amount;
        if (this.discount.type === "percentage") {
            effectivePrice = this.price.amount * (1 - this.discount.value / 100);
        } else if (this.discount.type === "fixed") {
            effectivePrice = Math.max(0, this.price.amount - this.discount.value);
        }
        this.discount.effectivePrice = Math.round(effectivePrice * 100) / 100;
    } else if (this.discount) {
        this.discount.effectivePrice = this.price.amount;
    }

    if (this.hasVariants && this.variants && this.variants.length > 0) {
        this.variants.forEach((variant) => {
            if (
                variant.discount &&
                variant.discount.type !== "none" &&
                variant.discount.value > 0
            ) {
                let variantEffectivePrice = variant.price.amount;
                if (variant.discount.type === "percentage") {
                    variantEffectivePrice =
                        variant.price.amount * (1 - variant.discount.value / 100);
                } else if (variant.discount.type === "fixed") {
                    variantEffectivePrice = Math.max(
                        0,
                        variant.price.amount - variant.discount.value,
                    );
                }
                variant.discount.effectivePrice = Math.round(variantEffectivePrice * 100) / 100;
            } else if (variant.discount) {
                variant.discount.effectivePrice = variant.price.amount;
            }
        });
    }

    next();
});

// Set published date when status changes to published
productSchema.pre("save", function (next) {
    if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});

// Auto-set isActive based on availability dates
productSchema.pre("save", function (next) {
    const now = new Date();
    if (this.availableFrom && this.availableTo) {
        const isWithinRange = now >= this.availableFrom && now <= this.availableTo;
        if (this.status === "published") {
            this.isActive = isWithinRange;
        }
    }
    next();
});

// Ensure SKU uniqueness when variants exist
productSchema.pre("save", async function (next) {
    if (this.hasVariants && this.variants && this.variants.length > 0) {
        const skus = new Set();
        for (const variant of this.variants) {
            if (skus.has(variant.sku)) {
                return next(new Error(`Duplicate SKU found: ${variant.sku}`));
            }
            skus.add(variant.sku);
        }
    }
    next();
});

// Calculate total stock from variants
productSchema.pre("save", function (next) {
    if (this.hasVariants && this.variants && this.variants.length > 0) {
        const totalStock = this.variants.reduce((sum, variant) => sum + variant.stock, 0);
        this.stock = totalStock;
    }
    next();
});

// ──────────────────────────────────────────────────────────────────────────────
// VIRTUAL FIELDS
// ──────────────────────────────────────────────────────────────────────────────

productSchema.virtual("currentPrice").get(function () {
    if (this.discount && this.discount.type !== "none" && this.discount.value > 0) {
        return this.discount.effectivePrice;
    }
    return this.price.amount;
});

productSchema.virtual("isOnSale").get(function () {
    return this.discount && this.discount.type !== "none" && this.discount.value > 0;
});

productSchema.virtual("discountPercentage").get(function () {
    if (this.discount && this.discount.type === "percentage") {
        return this.discount.value;
    } else if (this.discount && this.discount.type === "fixed" && this.price.amount > 0) {
        return Math.round((this.discount.value / this.price.amount) * 100);
    }
    return 0;
});

productSchema.virtual("availableStock").get(function () {
    return Math.max(0, this.stock - this.reservedStock);
});

productSchema.virtual("inStock").get(function () {
    return this.availableStock > 0 || this.backorderAllowed;
});

productSchema.virtual("isLowStock").get(function () {
    return this.availableStock <= this.lowStockThreshold && this.availableStock > 0;
});

productSchema.virtual("isOutOfStock").get(function () {
    return this.availableStock <= 0 && !this.backorderAllowed;
});

productSchema.virtual("formattedPrice").get(function () {
    return `${this.price.currency} ${this.currentPrice.toFixed(2)}`;
});

productSchema.virtual("url").get(function () {
    return `/product/${this.slug}`;
});

// ──────────────────────────────────────────────────────────────────────────────
// INSTANCE METHODS
// ──────────────────────────────────────────────────────────────────────────────

productSchema.methods.isAvailable = function () {
    const now = new Date();
    const isWithinDateRange =
        (!this.availableFrom || now >= this.availableFrom) &&
        (!this.availableTo || now <= this.availableTo);
    return this.status === "published" && this.isActive && !this.isDeleted && isWithinDateRange;
};

productSchema.methods.updateStock = async function (quantity, isReserve = false) {
    if (isReserve) {
        if (this.availableStock < quantity) {
            throw new Error(`Insufficient stock. Available: ${this.availableStock}`);
        }
        this.reservedStock += quantity;
    } else {
        if (this.stock < quantity) {
            throw new Error(`Insufficient stock. Available: ${this.stock}`);
        }
        this.stock -= quantity;
    }
    await this.save();
};

productSchema.methods.releaseReservedStock = async function (quantity) {
    this.reservedStock = Math.max(0, this.reservedStock - quantity);
    await this.save();
};

productSchema.methods.getVariantByCombination = function (combination) {
    return this.variants?.find(
        (variant) => JSON.stringify(variant.combination) === JSON.stringify(combination),
    );
};

productSchema.methods.updateRating = async function (newRating, oldRating = null) {
    let totalRating = this.rating.average * this.rating.count;
    if (oldRating !== null) {
        totalRating -= oldRating;
        this.rating.distribution[oldRating] = Math.max(0, this.rating.distribution[oldRating] - 1);
    }
    totalRating += newRating;
    this.rating.distribution[newRating] = (this.rating.distribution[newRating] || 0) + 1;
    this.rating.count += oldRating === null ? 1 : 0;
    this.rating.average = totalRating / this.rating.count;
    await this.save();
};

productSchema.methods.incrementAnalytics = async function (field) {
    if (this.analytics[field] !== undefined) {
        this.analytics[field]++;
        await this.save();
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// STATIC METHODS
// ──────────────────────────────────────────────────────────────────────────────

productSchema.statics.generateVariantCombinations = function (variantOptions, baseData = {}) {
    if (!variantOptions || variantOptions.length === 0) return [];

    const generateCombinations = (options, currentIndex = 0, currentCombination = []) => {
        if (currentIndex === options.length) {
            return [currentCombination];
        }
        const currentOption = options[currentIndex];
        const combinations = [];

        for (const value of currentOption.values) {
            const newCombination = [
                ...currentCombination,
                { name: currentOption.name, value: value },
            ];
            combinations.push(...generateCombinations(options, currentIndex + 1, newCombination));
        }
        return combinations;
    };

    const allCombinations = generateCombinations(variantOptions);
    return allCombinations.map((combination, index) => ({
        combination,
        sku: baseData.sku ? `${baseData.sku}-${String(index + 1).padStart(3, "0")}` : null,
        price: baseData.price || { amount: 0, currency: "BDT" },
        compareAtPrice: baseData.compareAtPrice || null,
        discount: baseData.discount || { type: "none", value: 0 },
        stock: 0,
        images: [],
        isActive: true,
        sortOrder: index,
    }));
};

productSchema.statics.bulkUpdate = async function (productIds, updateData, vendorId) {
    const filter = { _id: { $in: productIds } };
    if (vendorId) {
        filter.vendor = vendorId;
    }
    return this.updateMany(filter, updateData, { multi: true });
};

productSchema.statics.getFeaturedProducts = function (limit = 10, category = null) {
    const filter = {
        isFeatured: true,
        status: "published",
        isActive: true,
        isDeleted: false,
    };
    
    if (category) {
        filter.category = category;
    }

    return this.find(filter)
        .sort({ "analytics.salesCount": -1, createdAt: -1 })
        .limit(limit)
        .populate("vendor", "storeName logo")
        .populate("brand", "name slug")
        .populate("category", "name slug path");
};

productSchema.statics.searchProducts = async function (searchTerm, filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = "relevance" } = pagination;
    const skip = (page - 1) * limit;

    let query = { status: "published", isActive: true, isDeleted: false };

    if (searchTerm) {
        query.$text = { $search: searchTerm };
    }

    if (filters.category) query.category = filters.category;
    if (filters.vendor) query.vendor = filters.vendor;
    if (filters.brand) query.brand = filters.brand;
    if (filters.minPrice || filters.maxPrice) {
        query["price.amount"] = {};
        if (filters.minPrice) query["price.amount"].$gte = filters.minPrice;
        if (filters.maxPrice) query["price.amount"].$lte = filters.maxPrice;
    }
    if (filters.tags) query.tags = { $in: filters.tags };
    if (filters.hasVariants !== undefined) query.hasVariants = filters.hasVariants;
    if (filters.inStock) query.stock = { $gt: 0 };

    let sort = {};
    switch (sortBy) {
        case "price_asc":
            sort = { "price.amount": 1 };
            break;
        case "price_desc":
            sort = { "price.amount": -1 };
            break;
        case "rating":
            sort = { "rating.average": -1 };
            break;
        case "newest":
            sort = { publishedAt: -1 };
            break;
        case "best_selling":
            sort = { "analytics.salesCount": -1 };
            break;
        default:
            sort = searchTerm ? { score: { $meta: "textScore" } } : { publishedAt: -1 };
    }

    const results = await this.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("vendor", "storeName logo")
        .populate("brand", "name slug")
        .populate("category", "name slug path");

    const total = await this.countDocuments(query);

    return {
        products: results,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

const Product = mongoose.model("Product", productSchema);
export default Product;
