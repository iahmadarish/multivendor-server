import fs from "fs";
import Product from "./product.model.js";
import Category from "../category/Category.js";
import { deleteFile, getFileInfo } from "../../config/multer.config.js";
import {
    validateProductInput,
    validateProductUpdateInput,
    validateStockUpdate,
    validateBulkAction,
    validateVariantUpdate,
} from "../../validators/product.validator.js";
import { makeSlug } from "../../utils/makeSlug.js";


/**
 * Clean up uploaded files (used on validation/error)
 */
const cleanupFiles = (files) => {
    if (!files) return;
    Object.values(files)
        .flat()
        .forEach((file) => {if (file.path && fs.existsSync(file.path)) {fs.unlinkSync(file.path);}});
};

/**
 * Calculate effectivePrice from price + discount
 */
const calcEffectivePrice = (priceAmount, discount) => {
    if (!discount || discount.type === "none" || !discount.value) return priceAmount;
    if (discount.type === "percentage") {return Math.round(priceAmount * (1 - discount.value / 100) * 100) / 100;}
    if (discount.type === "fixed") {return Math.round(Math.max(0, priceAmount - discount.value) * 100) / 100;}
    return priceAmount;
};

/**
 * Build sort object from query param
 */
const buildSort = (sortBy) => {
    const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        price_asc: { "price.amount": 1 },
        price_desc: { "price.amount": -1 },
        sales: { "analytics.salesCount": -1 },
        stock_asc: { stock: 1 },
        stock_desc: { stock: -1 },
        rating: { "rating.average": -1 },
        views: { "analytics.views": -1 },
    };
    return sortMap[sortBy] || { createdAt: -1 };
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE PRODUCT
//  POST /seller/products
// ─────────────────────────────────────────────────────────────────────────────
export const createProduct = async (req, res) => {
    const files = req.files;
    try {
        const productData = JSON.parse(req.body.data || "{}");
        const seller = req.seller;

        console.log("Creating product:", {
            title: productData.title,
            seller: seller._id,
            hasImages: !!files?.images,
            hasThumbnail: !!files?.thumbnail,
        });

        // ── Generate slug from title ────────────────────────
        if (productData.title) {
            let baseSlug = makeSlug(productData.title);
            let slug = baseSlug;
            let counter = 1;

            while (await Product.findOne({ slug })) {
                slug = `${baseSlug}-${counter}`;
                counter++;}
            productData.slug = slug;
        }

        // ── Validation ──────────────────────────────────────
        const validationErrors = validateProductInput(productData);
        if (validationErrors) {
            cleanupFiles(files);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors,
            });
        }

        // ── Category check ──────────────────────────────────
        const category = await Category.findById(productData.category);
        if (!category) {
            cleanupFiles(files);
            return res.status(404).json({ 
                success: false, 
                message: "Category not found" 
            });
        }

        if (productData.subCategory) {
            const subCategory = await Category.findById(productData.subCategory);
            if (!subCategory) {
                cleanupFiles(files);
                return res.status(404).json({ 
                    success: false, 
                    message: "Sub-category not found" 
                });
            }
        }

        // ── SKU uniqueness ──────────────────────────────────
        if (productData.sku) {
            const skuExists = await Product.findOne({ sku: productData.sku });
            if (skuExists) {
                cleanupFiles(files);
                return res.status(400).json({ 
                    success: false, 
                    message: "SKU already exists" 
                });
            }
        }

        // ── Thumbnail ───────────────────────────────────────
        let thumbnail;
        if (files?.thumbnail?.[0]) {
            thumbnail = getFileInfo(files.thumbnail[0]);
            thumbnail.alt = productData.title || "Product thumbnail";
        } else if (productData.thumbnailUrl) {
            thumbnail = { url: productData.thumbnailUrl, alt: productData.title };
        } else {
            cleanupFiles(files);
            return res.status(400).json({ 
                success: false, 
                message: "Product thumbnail is required" 
            });
        }

        // ── Gallery images ──────────────────────────────────
        const images = (files?.images || []).map((file, index) => ({
            ...getFileInfo(file),
            alt: `${productData.title} - Image ${index + 1}`,
            sortOrder: index,
        }));

        // Add existing images from update
        if (productData.existingImages && Array.isArray(productData.existingImages)) {
            images.push(...productData.existingImages);
        }

        // ── Variant images ──────────────────────────────────
        const variantImagesMap = {};
        if (files?.variantImages) {
            files.variantImages.forEach((file, index) => {
                const key = file.fieldname.match(/variantImages\[(\d+)\]/)?.[1] ?? index;
                if (!variantImagesMap[key]) variantImagesMap[key] = [];
                variantImagesMap[key].push(getFileInfo(file));
            });
        }

        // ── Variants ────────────────────────────────────────
        let variants = [];
        let parsedVariantOptions = [];
        
        if (productData.hasVariants && productData.variantOptions) {
            parsedVariantOptions = typeof productData.variantOptions === "string"
                ? JSON.parse(productData.variantOptions)
                : productData.variantOptions;
                
            if (parsedVariantOptions.length > 0) {
                variants = Product.generateVariantCombinations(parsedVariantOptions, {
                    sku: productData.sku,
                    price: productData.price,
                    compareAtPrice: productData.compareAtPrice,
                    discount: productData.discount,
                });

                variants.forEach((variant, idx) => {
                    if (variantImagesMap[idx]) {
                        variant.images = variantImagesMap[idx];
                    }
                });
            }
        }

        // ── Effective price ─────────────────────────────────
        const effectivePrice = calcEffectivePrice(
            productData.price?.amount ?? 0,
            productData.discount,
        );

        // ── Prepare SEO data ────────────────────────────────
        const seoData = {};

// Only add slug if it exists
if (productData.slug) {
    seoData.slug = productData.slug;
}

// Add meta fields if they exist
if (productData.seo?.metaTitle) {
    seoData.metaTitle = productData.seo.metaTitle.substring(0, 70);
} else if (productData.title) {
    seoData.metaTitle = productData.title.substring(0, 70);
}

if (productData.seo?.metaDescription) {
    seoData.metaDescription = productData.seo.metaDescription.substring(0, 160);
} else if (productData.shortDescription) {
    seoData.metaDescription = productData.shortDescription.substring(0, 160);
}

// Handle keywords - only add if there are actual keywords
if (productData.seo?.keywords) {
    if (Array.isArray(productData.seo.keywords)) {
        const filtered = productData.seo.keywords.filter(k => k && typeof k === 'string');
        if (filtered.length > 0) {
            seoData.keywords = filtered;
        }
    } else if (typeof productData.seo.keywords === 'string' && productData.seo.keywords.trim()) {
        seoData.keywords = [productData.seo.keywords.trim()];
    }
} else if (productData.tags && Array.isArray(productData.tags)) {
    const filtered = productData.tags.filter(t => t && typeof t === 'string');
    if (filtered.length > 0) {
        seoData.keywords = filtered;
    }
}
// If no keywords, don't set the field at all (let it be undefined)

if (productData.seo?.canonicalUrl) {
    seoData.canonicalUrl = productData.seo.canonicalUrl;
}

if (productData.seo?.schema && typeof productData.seo.schema === 'object') {
    seoData.schema = productData.seo.schema;
}

console.log("SEO Data prepared:", JSON.stringify(seoData, null, 2));



        // ── Build document ──────────────────────────────────
        const product = new Product({
            // Identity
            title: productData.title,
            slug: productData.slug, // ✅ Now slug is generated
            shortDescription: productData.shortDescription || "",
            description: productData.description,
            highlights: Array.isArray(productData.highlights) 
                ? productData.highlights.filter(h => h && h.trim()) 
                : [],
            
            // Vendor
            vendor: seller._id,
            brand: productData.brand || null,
            brandName: productData.brandName || "",
            
            // Taxonomy
            category: productData.category,
            subCategory: productData.subCategory || null,
            tags: Array.isArray(productData.tags) ? [...new Set(productData.tags)] : [],
            collections: productData.collections || [],
            
            // Pricing
            price: { 
                amount: Number(productData.price?.amount) || 0, 
                currency: productData.price?.currency || "BDT" 
            },
            compareAtPrice: productData.compareAtPrice?.amount 
                ? { amount: Number(productData.compareAtPrice.amount), currency: "BDT" }
                : null,
            discount: {
                type: productData.discount?.type || "none",
                value: productData.discount?.value || 0,
                effectivePrice,
                startDate: productData.discount?.startDate || null,
                endDate: productData.discount?.endDate || null,
            },
            taxRate: productData.taxRate || 0,
            isTaxable: productData.isTaxable !== undefined ? productData.isTaxable : true,
            
            // Inventory
            sku: productData.sku || undefined,
            stock: productData.hasVariants ? 0 : (productData.stock || 0),
            reservedStock: 0,
            lowStockThreshold: productData.lowStockThreshold || 5,
            backorderAllowed: productData.backorderAllowed || false,
            minOrderQuantity: productData.minOrderQuantity || 1,
            maxOrderQuantity: productData.maxOrderQuantity || 0,
            
            // Media
            thumbnail,
            images,
            videos: [],
            
            // Variants
            hasVariants: productData.hasVariants || false,
            variantOptions: productData.hasVariants ? parsedVariantOptions : [],
            variants,
            
            // Attributes
            attributes: Array.isArray(productData.attributes) ? productData.attributes : [],
            
            // Shipping
            delivery: {
                weight: Number(productData.delivery?.weight) || 0,
                dimensions: {
                    length: Number(productData.delivery?.dimensions?.length) || 0,
                    width: Number(productData.delivery?.dimensions?.width) || 0,
                    height: Number(productData.delivery?.dimensions?.height) || 0,
                },
                shippingClass: productData.delivery?.shippingClass || "standard",
                isFreeShipping: productData.delivery?.isFreeShipping || false,
                estimatedDelivery: productData.delivery?.estimatedDelivery || "",
                handlingTime: productData.delivery?.handlingTime || 1,
            },
            returnPolicy: productData.returnPolicy || "",
            warrantyInfo: productData.warrantyInfo || "",
            countryOfOrigin: productData.countryOfOrigin || "",
            
            // SEO
            seo: Object.keys(seoData).length > 0 ? seoData : undefined,
            
            // Status
            visibility: productData.visibility || "visible",
            status: productData.publishImmediately ? "pending_review" : (productData.status || "draft"),
            isActive: true,
            isFeatured: productData.isFeatured || false,
            isDeleted: false,
            
            // Dates
            availableFrom: productData.availableFrom || null,
            availableTo: productData.availableTo || null,
            
            // Audit
            createdBy: seller._id,
            creatorModel: "Seller",
            lastModifiedBy: seller._id,
            lastModifiedByModel: "Seller",
            
            // Metadata
            metadata: productData.metadata || {},
        });

        await product.save();

        console.log("✅ Product created:", product._id, product.slug);

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product,
        });
        
    } catch (error) {
        // Cleanup files on error
        cleanupFiles(files);
        
        console.error("createProduct error:", error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }));
            
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Failed to create product",
            error: error.message,
        });
    }
};

// Helper to cleanup uploaded files


// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL SELLER PRODUCTS  (with filtering, search, pagination)
//  GET /seller/products
// ─────────────────────────────────────────────────────────────────────────────
export const getSellerProducts = async (req, res) => {
    try {
        const seller = req.seller;
        const { page = 1, limit = 12, sortBy = "createdAt", sortOrder = "desc" } = req.query;

        const query = { 
            vendor: seller._id,
            isDeleted: { $ne: true }
        };

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

        const products = await Product.find(query)
            .sort(sortOptions)
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate("category", "name slug") 
            .populate("subCategory", "name slug") 
            .populate("brand", "name slug logo") 
            .lean();

        const total = await Product.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("getSellerProducts error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE PRODUCT
//  GET /seller/products/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getSellerProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false })
            .populate("category", "name slug path")
            .populate("subCategory", "name slug")
            .populate("brand", "name slug logo");

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        return res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error("getSellerProductById error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch product", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE PRODUCT
//  PUT /seller/products/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateProduct = async (req, res) => {
    const files = req.files;
    try {
        const { id } = req.params;
        const seller = req.seller;
        const updateData = JSON.parse(req.body.data || "{}");

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            cleanupFiles(files);
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // ── Validation ──────────────────────────────────────────────────────
        const validationErrors = validateProductUpdateInput(updateData);
        if (validationErrors) {
            cleanupFiles(files);
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        // ── Prevent protected fields from being overwritten ─────────────────
        const PROTECTED = ["vendor", "createdBy", "creatorModel", "analytics", "rating", "isDeleted", "approvedBy", "approvedAt"];
        PROTECTED.forEach((f) => delete updateData[f]);

        // ── Category check ───────────────────────────────────────────────────
        if (updateData.category) {
            const cat = await Category.findById(updateData.category);
            if (!cat) {
                cleanupFiles(files);
                return res.status(404).json({ success: false, message: "Category not found" });
            }
        }

        // ── SKU uniqueness ───────────────────────────────────────────────────
        if (updateData.sku && updateData.sku !== product.sku) {
            const skuExists = await Product.findOne({ sku: updateData.sku, _id: { $ne: id } });
            if (skuExists) {
                cleanupFiles(files);
                return res.status(400).json({ success: false, message: "SKU already in use" });
            }
        }

        const oldFilesToDelete = [];

        // ── Thumbnail ────────────────────────────────────────────────────────
        if (files?.thumbnail?.[0]) {
            if (product.thumbnail?.filename) oldFilesToDelete.push(product.thumbnail.url.substring(1));
            updateData.thumbnail = getFileInfo(files.thumbnail[0]);
        }

        if (updateData.removeThumbnail) {
            if (product.thumbnail?.filename) oldFilesToDelete.push(product.thumbnail.url.substring(1));
            updateData.thumbnail = null;
            delete updateData.removeThumbnail;
        }

        // ── Gallery images ───────────────────────────────────────────────────
        if (files?.images?.length) {
            const newImages = files.images.map((file, index) => ({
                ...getFileInfo(file),
                alt: updateData.title || product.title,
                sortOrder: product.images.length + index,
            }));
            updateData.images = [...product.images, ...newImages];
        }

        if (updateData.removeImages?.length) {
            const toRemove = new Set(updateData.removeImages);
            product.images.forEach((img) => {
                if (toRemove.has(img.filename)) oldFilesToDelete.push(img.url.substring(1));
            });
            updateData.images = (updateData.images || product.images).filter(
                (img) => !toRemove.has(img.filename),
            );
            delete updateData.removeImages;
        }

        // Re-order images if sortOrders provided
        if (updateData.imageOrder?.length) {
            const orderMap = {};
            updateData.imageOrder.forEach((filename, idx) => (orderMap[filename] = idx));
            const imgs = updateData.images || product.images;
            updateData.images = imgs
                .map((img) => ({ ...img.toObject?.() ?? img, sortOrder: orderMap[img.filename] ?? img.sortOrder }))
                .sort((a, b) => a.sortOrder - b.sortOrder);
            delete updateData.imageOrder;
        }

        // ── Variants (if options changed) ────────────────────────────────────
        if (updateData.hasVariants && updateData.variantOptions) {
            const parsedOptions =
                typeof updateData.variantOptions === "string"
                    ? JSON.parse(updateData.variantOptions)
                    : updateData.variantOptions;

            const optionsChanged =
                JSON.stringify(parsedOptions) !== JSON.stringify(product.variantOptions);

            if (optionsChanged) {
                updateData.variants = Product.generateVariantCombinations(parsedOptions, {
                    sku: updateData.sku || product.sku,
                    price: updateData.price || product.price,
                    discount: updateData.discount || product.discount,
                });
            }
        }

        // ── Discount effective price ─────────────────────────────────────────
        if (updateData.discount || updateData.price) {
            const finalPrice = updateData.price || product.price;
            const finalDiscount = updateData.discount || product.discount;
            updateData.discount = {
                ...finalDiscount,
                effectivePrice: calcEffectivePrice(finalPrice.amount, finalDiscount),
            };
        }

        // ── Status gate  (seller cannot publish directly) ─────────────────────
        if (updateData.status === "published") {
            updateData.status = "pending_review";
        }

        // ── Tags dedup ───────────────────────────────────────────────────────
        if (updateData.tags) updateData.tags = [...new Set(updateData.tags)];

        updateData.lastModifiedBy = seller._id;
        updateData.lastModifiedByModel = "Seller";

        const updated = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true },
        );

        // cleanup old files after successful DB update
        oldFilesToDelete.forEach((p) => deleteFile(p));

        return res.status(200).json({ success: true, message: "Product updated successfully", data: updated });
    } catch (error) {
        cleanupFiles(files);
        console.error("updateProduct error:", error);
        return res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SOFT DELETE PRODUCT
//  DELETE /seller/products/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        product.isDeleted = true;
        product.isActive = false;
        product.status = "archived";
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("deleteProduct error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE STOCK  (product-level or variant-level)
//  PATCH /seller/products/:id/stock
// ─────────────────────────────────────────────────────────────────────────────
export const updateProductStock = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const validationErrors = validateStockUpdate(req.body);
        if (validationErrors) {
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const { stock, variantId } = req.body;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (variantId) {
            if (!product.hasVariants) {
                return res.status(400).json({ success: false, message: "This product does not have variants" });
            }
            const variant = product.variants.id(variantId);
            if (!variant) {
                return res.status(404).json({ success: false, message: "Variant not found" });
            }
            variant.stock = Math.max(0, stock);
        } else {
            if (product.hasVariants) {
                return res.status(400).json({
                    success: false,
                    message: "Use variantId to update stock for individual variants",
                });
            }
            product.stock = Math.max(0, stock);
        }

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: {
                productId: product._id,
                stock: product.stock,
                variantId: variantId || null,
            },
        });
    } catch (error) {
        console.error("updateProductStock error:", error);
        return res.status(500).json({ success: false, message: "Failed to update stock", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SUBMIT FOR REVIEW  (draft → pending_review)
//  PATCH /seller/products/:id/submit
// ─────────────────────────────────────────────────────────────────────────────
export const submitProductForReview = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (!["draft", "rejected"].includes(product.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot submit a product that is currently "${product.status}"`,
            });
        }

        // Basic completeness checks before submitting
        const incompleteFields = [];
        if (!product.thumbnail) incompleteFields.push("thumbnail");
        if (!product.description) incompleteFields.push("description");
        if (!product.category) incompleteFields.push("category");
        if (!product.hasVariants && product.stock === undefined) incompleteFields.push("stock");

        if (incompleteFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Product is incomplete. Please fill in required fields before submitting.",
                missingFields: incompleteFields,
            });
        }

        product.status = "pending_review";
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product submitted for review successfully",
            data: { status: product.status },
        });
    } catch (error) {
        console.error("submitProductForReview error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit product", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ARCHIVE / UNARCHIVE PRODUCT
//  PATCH /seller/products/:id/archive
//  PATCH /seller/products/:id/unarchive
// ─────────────────────────────────────────────────────────────────────────────
export const archiveProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (product.status === "archived") {
            return res.status(400).json({ success: false, message: "Product is already archived" });
        }

        product.status = "archived";
        product.isActive = false;
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({ success: true, message: "Product archived successfully", data: { status: product.status } });
    } catch (error) {
        console.error("archiveProduct error:", error);
        return res.status(500).json({ success: false, message: "Failed to archive product", error: error.message });
    }
};

export const unarchiveProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (product.status !== "archived") {
            return res.status(400).json({ success: false, message: "Product is not archived" });
        }

        product.status = "draft";
        product.isActive = true;
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({ success: true, message: "Product unarchived successfully", data: { status: product.status } });
    } catch (error) {
        console.error("unarchiveProduct error:", error);
        return res.status(500).json({ success: false, message: "Failed to unarchive product", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DUPLICATE PRODUCT
//  POST /seller/products/:id/duplicate
// ─────────────────────────────────────────────────────────────────────────────
export const duplicateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const original = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!original) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const originalObj = original.toObject();

        // Strip unique / system fields
        delete originalObj._id;
        delete originalObj.slug;
        delete originalObj.sku;
        delete originalObj.createdAt;
        delete originalObj.updatedAt;
        delete originalObj.__v;
        delete originalObj.id;

        // Reset analytics + rating + publishing fields
        originalObj.analytics = { views: 0, salesCount: 0, wishlistCount: 0, shareCount: 0 };
        originalObj.rating = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        originalObj.status = "draft";
        originalObj.isActive = true;
        originalObj.isFeatured = false;
        originalObj.publishedAt = null;
        originalObj.approvedBy = null;
        originalObj.approvedAt = null;
        originalObj.rejectedReason = null;

        // Prefix title so seller can distinguish it
        originalObj.title = `${original.title} (Copy)`;

        originalObj.createdBy = seller._id;
        originalObj.creatorModel = "Seller";
        originalObj.lastModifiedBy = seller._id;
        originalObj.lastModifiedByModel = "Seller";

        // Reset variant SKUs to avoid unique constraint conflicts
        if (originalObj.hasVariants && originalObj.variants?.length) {
            originalObj.variants = originalObj.variants.map((v, idx) => ({
                ...v,
                sku: null, // will need to be set manually
                stock: 0,
            }));
        }

        const duplicate = new Product(originalObj);
        await duplicate.save();

        return res.status(201).json({
            success: true,
            message: "Product duplicated successfully",
            data: duplicate,
        });
    } catch (error) {
        console.error("duplicateProduct error:", error);
        return res.status(500).json({ success: false, message: "Failed to duplicate product", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  BULK ACTIONS  (publish/archive/delete/draft)
//  POST /seller/products/bulk
// ─────────────────────────────────────────────────────────────────────────────
export const bulkProductAction = async (req, res) => {
    try {
        const seller = req.seller;

        const validationErrors = validateBulkAction(req.body);
        if (validationErrors) {
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const { productIds, action } = req.body;

        const actionStatusMap = {
            publish: "pending_review",   // seller can only request review, not directly publish
            archive: "archived",
            delete: null,               // handled separately
            draft: "draft",
        };

        if (action === "delete") {
            const result = await Product.updateMany(
                { _id: { $in: productIds }, vendor: seller._id, isDeleted: false },
                {
                    $set: {
                        isDeleted: true,
                        isActive: false,
                        status: "archived",
                        lastModifiedBy: seller._id,
                        lastModifiedByModel: "Seller",
                    },
                },
            );
            return res.status(200).json({
                success: true,
                message: `${result.modifiedCount} product(s) deleted successfully`,
                modifiedCount: result.modifiedCount,
            });
        }

        const newStatus = actionStatusMap[action];
        const result = await Product.updateMany(
            { _id: { $in: productIds }, vendor: seller._id, isDeleted: false },
            {
                $set: {
                    status: newStatus,
                    isActive: action !== "archive",
                    lastModifiedBy: seller._id,
                    lastModifiedByModel: "Seller",
                },
            },
        );

        return res.status(200).json({
            success: true,
            message: `${result.modifiedCount} product(s) updated successfully`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("bulkProductAction error:", error);
        return res.status(500).json({ success: false, message: "Failed to perform bulk action", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SELLER DASHBOARD STATS
//  GET /seller/products/stats
// ─────────────────────────────────────────────────────────────────────────────
export const getProductStats = async (req, res) => {
    try {
        const seller = req.seller;

        const [statusCounts, stockAlerts, topProducts, recentActivity] = await Promise.all([
            // Count by status
            Product.aggregate([
                { $match: { vendor: seller._id, isDeleted: false } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),

            // Low stock and out-of-stock
            Product.aggregate([
                { $match: { vendor: seller._id, isDeleted: false, status: "published" } },
                {
                    $project: {
                        title: 1,
                        stock: 1,
                        lowStockThreshold: 1,
                        isOutOfStock: { $lte: ["$stock", 0] },
                        isLowStock: {
                            $and: [
                                { $gt: ["$stock", 0] },
                                { $lte: ["$stock", "$lowStockThreshold"] },
                            ],
                        },
                    },
                },
                { $match: { $or: [{ isOutOfStock: true }, { isLowStock: true }] } },
                { $limit: 20 },
            ]),

            // Top 5 by sales
            Product.find({ vendor: seller._id, isDeleted: false })
                .sort({ "analytics.salesCount": -1 })
                .limit(5)
                .select("title thumbnail analytics.salesCount analytics.views price status"),

            // Recently modified
            Product.find({ vendor: seller._id, isDeleted: false })
                .sort({ updatedAt: -1 })
                .limit(5)
                .select("title status updatedAt thumbnail"),
        ]);

        // Format status counts into a map
        const statusMap = statusCounts.reduce((acc, cur) => {
            acc[cur._id] = cur.count;
            return acc;
        }, {});

        const totalProducts = Object.values(statusMap).reduce((a, b) => a + b, 0);

        return res.status(200).json({
            success: true,
            data: {
                overview: {
                    total: totalProducts,
                    draft: statusMap.draft || 0,
                    pending_review: statusMap.pending_review || 0,
                    published: statusMap.published || 0,
                    archived: statusMap.archived || 0,
                    rejected: statusMap.rejected || 0,
                },
                stockAlerts: {
                    outOfStock: stockAlerts.filter((p) => p.isOutOfStock),
                    lowStock: stockAlerts.filter((p) => p.isLowStock),
                },
                topProducts,
                recentActivity,
            },
        });
    } catch (error) {
        console.error("getProductStats error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SINGLE VARIANT
//  PATCH /seller/products/:id/variants/:variantId
// ─────────────────────────────────────────────────────────────────────────────
export const updateVariant = async (req, res) => {
    const files = req.files;
    try {
        const { id, variantId } = req.params;
        const seller = req.seller;

        const validationErrors = validateVariantUpdate(req.body);
        if (validationErrors) {
            cleanupFiles(files);
            return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            cleanupFiles(files);
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (!product.hasVariants) {
            cleanupFiles(files);
            return res.status(400).json({ success: false, message: "This product does not have variants" });
        }

        const variant = product.variants.id(variantId);
        if (!variant) {
            cleanupFiles(files);
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        // SKU uniqueness for variant
        if (req.body.sku && req.body.sku !== variant.sku) {
            const skuExists = await Product.findOne({
                "variants.sku": req.body.sku,
                _id: { $ne: id },
            });
            if (skuExists) {
                cleanupFiles(files);
                return res.status(400).json({ success: false, message: "Variant SKU already in use" });
            }
        }

        const oldFilesToDelete = [];

        // Variant images
        if (files?.variantImages?.length) {
            const newImages = files.variantImages.map((file) => getFileInfo(file));
            variant.images = [...variant.images, ...newImages];
        }

        if (req.body.removeImages?.length) {
            const toRemove = new Set(req.body.removeImages);
            variant.images.forEach((img) => {
                if (toRemove.has(img.filename)) oldFilesToDelete.push(img.url.substring(1));
            });
            variant.images = variant.images.filter((img) => !toRemove.has(img.filename));
        }

        // Allowed fields to update
        const allowedFields = ["sku", "barcode", "price", "compareAtPrice", "discount", "stock", "weight", "dimensions", "isActive", "sortOrder"];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) variant[field] = req.body[field];
        });

        // Recalc variant discount effective price
        if (variant.discount && variant.price) {
            variant.discount.effectivePrice = calcEffectivePrice(variant.price.amount, variant.discount);
        }

        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        oldFilesToDelete.forEach((p) => deleteFile(p));

        return res.status(200).json({ success: true, message: "Variant updated successfully", data: variant });
    } catch (error) {
        cleanupFiles(files);
        console.error("updateVariant error:", error);
        return res.status(500).json({ success: false, message: "Failed to update variant", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL VARIANTS OF A PRODUCT
//  GET /seller/products/:id/variants
// ─────────────────────────────────────────────────────────────────────────────
export const getProductVariants = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne(
            { _id: id, vendor: seller._id, isDeleted: false },
            { variants: 1, variantOptions: 1, hasVariants: 1, title: 1 },
        );
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (!product.hasVariants) {
            return res.status(400).json({ success: false, message: "This product does not have variants" });
        }

        return res.status(200).json({
            success: true,
            data: {
                variantOptions: product.variantOptions,
                variants: product.variants,
                totalVariants: product.variants.length,
            },
        });
    } catch (error) {
        console.error("getProductVariants error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch variants", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SEO
//  PATCH /seller/products/:id/seo
// ─────────────────────────────────────────────────────────────────────────────
export const updateProductSeo = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;
        const { metaTitle, metaDescription, keywords, canonicalUrl } = req.body;

        const errors = [];
        if (metaTitle && metaTitle.length > 70)
            errors.push({ field: "metaTitle", message: "Meta title cannot exceed 70 characters" });
        if (metaDescription && metaDescription.length > 160)
            errors.push({ field: "metaDescription", message: "Meta description cannot exceed 160 characters" });
        if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        product.seo = {
            ...product.seo?.toObject?.() ?? product.seo ?? {},
            ...(metaTitle !== undefined && { metaTitle }),
            ...(metaDescription !== undefined && { metaDescription }),
            ...(keywords !== undefined && { keywords }),
            ...(canonicalUrl !== undefined && { canonicalUrl }),
        };
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({ success: true, message: "SEO updated successfully", data: product.seo });
    } catch (error) {
        console.error("updateProductSeo error:", error);
        return res.status(500).json({ success: false, message: "Failed to update SEO", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE PRICING / DISCOUNT
//  PATCH /seller/products/:id/pricing
// ─────────────────────────────────────────────────────────────────────────────
export const updateProductPricing = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;
        const { price, compareAtPrice, discount } = req.body;

        const errors = [];
        if (price !== undefined) validatePriceField(price, errors);
        if (discount !== undefined) validateDiscountField(discount, price, errors);
        if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const finalPrice = price || product.price;
        const finalDiscount = discount || product.discount;

        await Product.findByIdAndUpdate(id, {
            $set: {
                ...(price && { price }),
                ...(compareAtPrice !== undefined && { compareAtPrice }),
                ...(discount !== undefined && {
                    discount: {
                        ...finalDiscount,
                        effectivePrice: calcEffectivePrice(finalPrice.amount, finalDiscount),
                    },
                }),
                lastModifiedBy: seller._id,
                lastModifiedByModel: "Seller",
            },
        });

        const updated = await Product.findById(id).select("price compareAtPrice discount");
        return res.status(200).json({ success: true, message: "Pricing updated successfully", data: updated });
    } catch (error) {
        console.error("updateProductPricing error:", error);
        return res.status(500).json({ success: false, message: "Failed to update pricing", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SLUG AVAILABILITY CHECK
//  GET /seller/products/slug-check?slug=my-product
// ─────────────────────────────────────────────────────────────────────────────
export const checkSlugAvailability = async (req, res) => {
    try {
        const { slug, excludeId } = req.query;

        if (!slug) {
            return res.status(400).json({ success: false, message: "Slug is required" });
        }

        const cleanSlug = makeSlug(slug);
        const query = { slug: cleanSlug };
        if (excludeId) query._id = { $ne: excludeId };

        const existing = await Product.findOne(query).select("_id");
        return res.status(200).json({
            success: true,
            data: {
                slug: cleanSlug,
                available: !existing,
            },
        });
    } catch (error) {
        console.error("checkSlugAvailability error:", error);
        return res.status(500).json({ success: false, message: "Failed to check slug", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MANAGE PRODUCT IMAGES  (add / delete / reorder)
//  POST   /seller/products/:id/images          → add images
//  DELETE /seller/products/:id/images          → remove images
//  PATCH  /seller/products/:id/images/reorder  → reorder images
// ─────────────────────────────────────────────────────────────────────────────
export const addProductImages = async (req, res) => {
    const files = req.files;
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) {
            cleanupFiles(files);
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (!files?.images?.length) {
            return res.status(400).json({ success: false, message: "No images provided" });
        }

        if (product.images.length + files.images.length > 20) {
            cleanupFiles(files);
            return res.status(400).json({ success: false, message: "Maximum 20 images allowed per product" });
        }

        const newImages = files.images.map((file, index) => ({
            ...getFileInfo(file),
            alt: product.title,
            sortOrder: product.images.length + index,
        }));

        product.images.push(...newImages);
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({ success: true, message: "Images added successfully", data: product.images });
    } catch (error) {
        cleanupFiles(files);
        console.error("addProductImages error:", error);
        return res.status(500).json({ success: false, message: "Failed to add images", error: error.message });
    }
};

export const removeProductImages = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;
        const { filenames } = req.body;

        if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
            return res.status(400).json({ success: false, message: "Filenames array is required" });
        }

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const toRemove = new Set(filenames);
        const filesToDelete = [];
        product.images.forEach((img) => {
            if (toRemove.has(img.filename)) filesToDelete.push(img.url.substring(1));
        });

        product.images = product.images.filter((img) => !toRemove.has(img.filename));
        // Re-assign sortOrder
        product.images = product.images.map((img, idx) => ({ ...img.toObject(), sortOrder: idx }));
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        filesToDelete.forEach((p) => deleteFile(p));

        return res.status(200).json({ success: true, message: "Images removed successfully", data: product.images });
    } catch (error) {
        console.error("removeProductImages error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove images", error: error.message });
    }
};

export const reorderProductImages = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;
        const { order } = req.body; // array of filenames in desired order

        if (!order || !Array.isArray(order)) {
            return res.status(400).json({ success: false, message: "Order array is required" });
        }

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const imageMap = Object.fromEntries(product.images.map((img) => [img.filename, img.toObject()]));

        const reordered = order
            .filter((filename) => imageMap[filename])
            .map((filename, idx) => ({ ...imageMap[filename], sortOrder: idx }));

        // Add any images not in the order array at the end
        const orderedSet = new Set(order);
        product.images.forEach((img) => {
            if (!orderedSet.has(img.filename)) {
                reordered.push({ ...img.toObject(), sortOrder: reordered.length });
            }
        });

        product.images = reordered;
        product.lastModifiedBy = seller._id;
        product.lastModifiedByModel = "Seller";
        await product.save();

        return res.status(200).json({ success: true, message: "Images reordered successfully", data: product.images });
    } catch (error) {
        console.error("reorderProductImages error:", error);
        return res.status(500).json({ success: false, message: "Failed to reorder images", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helper re-export (used in updateProductPricing above without import)
// ─────────────────────────────────────────────────────────────────────────────
function validatePriceField(price, errors) {
    if (!price || price.amount === undefined || price.amount === null) {
        errors.push({ field: "price", message: "Price is required" });
    } else if (typeof price.amount !== "number" || price.amount < 0) {
        errors.push({ field: "price.amount", message: "Price must be a non-negative number" });
    }
}

function validateDiscountField(discount, price, errors) {
    if (!discount || discount.type === "none") return;
    if (!["percentage", "fixed"].includes(discount.type)) {
        errors.push({ field: "discount.type", message: "Invalid discount type" });
        return;
    }
    if (discount.type === "percentage" && discount.value > 100) {
        errors.push({ field: "discount.value", message: "Percentage discount cannot exceed 100%" });
    }
    if (discount.type === "fixed" && price?.amount !== undefined && discount.value > price.amount) {
        errors.push({ field: "discount.value", message: "Fixed discount cannot exceed product price" });
    }
}