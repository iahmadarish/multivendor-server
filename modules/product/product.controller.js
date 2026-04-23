// controllers/product.controller.js
import Product from "./product.model.js";
import Category from "../category/Category.js";
import { validateProductInput } from "../../validators/product.validator.js";
import { deleteFile, getFileInfo } from "../../config/multer.config.js";
import fs from "fs";

// Create Product
export const createProduct = async (req, res) => {
    try {
        const productData = JSON.parse(req.body.data || "{}");
        const seller = req.seller;
        const files = req.files;

        // Validate input
        const validationError = validateProductInput(productData);
        if (validationError) {
            // Clean up uploaded files if validation fails
            if (files) {
                Object.values(files)
                    .flat()
                    .forEach((file) => {
                        if (file.path && fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
            }
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationError,
            });
        }

        // Check if category exists
        const category = await Category.findById(productData.category);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Check SKU uniqueness
        if (productData.sku) {
            const existingProduct = await Product.findOne({ sku: productData.sku });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: "Product SKU already exists",
                });
            }
        }

        // Process thumbnail
        let thumbnail = null;
        if (files?.thumbnail && files.thumbnail[0]) {
            thumbnail = getFileInfo(files.thumbnail[0]);
        } else if (productData.thumbnailUrl) {
            thumbnail = {
                url: productData.thumbnailUrl,
                alt: productData.title,
            };
        } else {
            return res.status(400).json({
                success: false,
                message: "Product thumbnail is required",
            });
        }

        // Process gallery images
        let images = [];
        if (files?.images && files.images.length > 0) {
            images = files.images.map((file, index) => ({
                ...getFileInfo(file),
                alt: `${productData.title} - Image ${index + 1}`,
                sortOrder: index,
            }));
        }

        // Process variant images if any
        let variantImagesMap = {};
        if (files?.variantImages) {
            // Group variant images by variant index or SKU
            files.variantImages.forEach((file, index) => {
                const variantKey = file.fieldname.match(/variantImages\[(\d+)\]/)?.[1] || index;
                if (!variantImagesMap[variantKey]) variantImagesMap[variantKey] = [];
                variantImagesMap[variantKey].push(getFileInfo(file));
            });
        }

        // Generate variants if hasVariants is true
        let variants = [];
        if (productData.hasVariants && productData.variantOptions) {
            const variantOptions =
                typeof productData.variantOptions === "string"
                    ? JSON.parse(productData.variantOptions)
                    : productData.variantOptions;

            variants = Product.generateVariantCombinations(variantOptions, {
                sku: productData.sku,
                price: productData.price || { amount: 0, currency: "BDT" },
                discount: productData.discount,
            });

            // Assign variant images if provided
            variants.forEach((variant, idx) => {
                if (variantImagesMap[idx] && variantImagesMap[idx].length > 0) {
                    variant.images = variantImagesMap[idx];
                }
            });
        }

        // Calculate discount effective price
        let discountEffectivePrice = productData.price?.amount || 0;
        if (
            productData.discount &&
            productData.discount.type !== "none" &&
            productData.discount.value > 0
        ) {
            if (productData.discount.type === "percentage") {
                discountEffectivePrice =
                    productData.price.amount * (1 - productData.discount.value / 100);
            } else if (productData.discount.type === "fixed") {
                discountEffectivePrice = Math.max(
                    0,
                    productData.price.amount - productData.discount.value,
                );
            }
        }

        // Create product
        const product = new Product({
            title: productData.title,
            shortDescription: productData.shortDescription,
            description: productData.description,
            highlights: productData.highlights || [],
            vendor: seller._id,
            brand: productData.brand || null,
            brandName: productData.brandName,
            category: productData.category,
            subCategory: productData.subCategory || null,
            tags: productData.tags || [],
            price: {
                amount: productData.price.amount,
                currency: productData.price.currency || "BDT",
            },
            compareAtPrice: productData.compareAtPrice
                ? {
                      amount: productData.compareAtPrice.amount,
                      currency: productData.compareAtPrice.currency || "BDT",
                  }
                : null,
            discount: {
                type: productData.discount?.type || "none",
                value: productData.discount?.value || 0,
                effectivePrice: discountEffectivePrice,
                startDate: productData.discount?.startDate,
                endDate: productData.discount?.endDate,
            },
            sku: productData.sku,
            stock: productData.hasVariants ? 0 : productData.stock || 0,
            lowStockThreshold: productData.lowStockThreshold || 5,
            backorderAllowed: productData.backorderAllowed || false,
            minOrderQuantity: productData.minOrderQuantity || 1,
            maxOrderQuantity: productData.maxOrderQuantity || 0,
            thumbnail: thumbnail,
            images: images,
            hasVariants: productData.hasVariants || false,
            variantOptions: productData.hasVariants
                ? typeof productData.variantOptions === "string"
                    ? JSON.parse(productData.variantOptions)
                    : productData.variantOptions
                : [],
            variants: variants,
            attributes: productData.attributes || [],
            delivery: {
                weight: productData.delivery?.weight || 0,
                dimensions: productData.delivery?.dimensions || { length: 0, width: 0, height: 0 },
                shippingClass: productData.delivery?.shippingClass || "standard",
                isFreeShipping: productData.delivery?.isFreeShipping || false,
                estimatedDelivery: productData.delivery?.estimatedDelivery,
                handlingTime: productData.delivery?.handlingTime || 1,
            },
            returnPolicy: productData.returnPolicy,
            warrantyInfo: productData.warrantyInfo,
            countryOfOrigin: productData.countryOfOrigin,
            seo: {
                metaTitle: productData.seo?.metaTitle || productData.title.slice(0, 60),
                metaDescription:
                    productData.seo?.metaDescription || productData.shortDescription?.slice(0, 160),
                keywords: productData.seo?.keywords || productData.tags,
                canonicalUrl: productData.seo?.canonicalUrl,
            },
            visibility: productData.visibility || "visible",
            status: productData.status || "draft",
            availableFrom: productData.availableFrom,
            availableTo: productData.availableTo,
            isTaxable: productData.isTaxable !== false,
            taxRate: productData.taxRate || 0,
            createdBy: seller._id,
            creatorModel: "Seller",
            metadata: productData.metadata || {},
        });

        if (productData.publishImmediately) {
            product.status = "pending_review";
        }

        await product.save();

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product,
        });
    } catch (error) {
        console.error("Product creation error:", error);

        // Clean up uploaded files on error
        if (req.files) {
            Object.values(req.files)
                .flat()
                .forEach((file) => {
                    if (file.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create product",
            error: error.message,
        });
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = JSON.parse(req.body.data || "{}");
        const seller = req.seller;
        const files = req.files;

        const product = await Product.findOne({ _id: id, vendor: seller._id });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Store old file paths for cleanup
        const oldFilesToDelete = [];

        // Update thumbnail
        if (files?.thumbnail && files.thumbnail[0]) {
            if (product.thumbnail?.filename) {
                oldFilesToDelete.push(product.thumbnail.url.substring(1)); // Remove leading slash
            }
            updateData.thumbnail = getFileInfo(files.thumbnail[0]);
        }

        // Add new images
        if (files?.images && files.images.length > 0) {
            const newImages = files.images.map((file, index) => ({
                ...getFileInfo(file),
                alt: updateData.title || product.title,
                sortOrder: product.images.length + index,
            }));
            updateData.images = [...product.images, ...newImages];
        }

        // Remove specific images if requested
        if (updateData.removeImages && Array.isArray(updateData.removeImages)) {
            const imagesToKeep = product.images.filter(
                (img) => !updateData.removeImages.includes(img.filename),
            );
            const imagesToDelete = product.images.filter((img) =>
                updateData.removeImages.includes(img.filename),
            );
            imagesToDelete.forEach((img) => {
                if (img.url) oldFilesToDelete.push(img.url.substring(1));
            });
            updateData.images = imagesToKeep;
            delete updateData.removeImages;
        }

        // Remove thumbnail if requested
        if (updateData.removeThumbnail && product.thumbnail?.filename) {
            oldFilesToDelete.push(product.thumbnail.url.substring(1));
            updateData.thumbnail = null;
            delete updateData.removeThumbnail;
        }

        // Prevent updating certain fields
        delete updateData.vendor;
        delete updateData.createdBy;
        delete updateData.creatorModel;
        delete updateData.analytics;
        delete updateData.rating;
        delete updateData.isDeleted;

        // Status change handling
        if (updateData.status === "published" && product.status !== "published") {
            updateData.status = "pending_review";
        }

        // Update variant combinations if variant options changed
        if (
            updateData.hasVariants &&
            updateData.variantOptions &&
            JSON.stringify(updateData.variantOptions) !== JSON.stringify(product.variantOptions)
        ) {
            updateData.variants = Product.generateVariantCombinations(updateData.variantOptions, {
                sku: product.sku,
                price: updateData.price || product.price,
            });
        }

        // Recalculate discount effective price
        if (updateData.discount || updateData.price) {
            const finalPrice = updateData.price || product.price;
            const finalDiscount = updateData.discount || product.discount;

            if (finalDiscount.type !== "none" && finalDiscount.value > 0) {
                let effectivePrice = finalPrice.amount;
                if (finalDiscount.type === "percentage") {
                    effectivePrice = finalPrice.amount * (1 - finalDiscount.value / 100);
                } else if (finalDiscount.type === "fixed") {
                    effectivePrice = Math.max(0, finalPrice.amount - finalDiscount.value);
                }
                updateData.discount = {
                    ...finalDiscount,
                    effectivePrice: Math.round(effectivePrice * 100) / 100,
                };
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true },
        );

        // Delete old files after successful update
        oldFilesToDelete.forEach((filePath) => {
            deleteFile(filePath);
        });

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update product",
            error: error.message,
        });
    }
};

// Delete Product (Soft delete with file cleanup)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Collect all files to delete
        const filesToDelete = [];

        if (product.thumbnail?.filename) {
            filesToDelete.push(product.thumbnail.url.substring(1));
        }

        product.images.forEach((img) => {
            if (img.filename) filesToDelete.push(img.url.substring(1));
        });

        product.variants.forEach((variant) => {
            variant.images.forEach((img) => {
                if (img.filename) filesToDelete.push(img.url.substring(1));
            });
        });

        // Soft delete
        product.isDeleted = true;
        product.isActive = false;
        await product.save();

        // Optionally delete files immediately or schedule for cleanup
        // For now, we'll keep files but you can uncomment the line below
        // filesToDelete.forEach(filePath => deleteFile(filePath));

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete product",
            error: error.message,
        });
    }
};

// Get all products for a seller
export const getSellerProducts = async (req, res) => {
    try {
        const seller = req.seller;
        const { page = 1, limit = 20, status, sortBy = "createdAt" } = req.query;

        const query = { vendor: seller._id, isDeleted: false };
        if (status) query.status = status;

        let sort = {};
        if (sortBy === "createdAt") sort = { createdAt: -1 };
        else if (sortBy === "price") sort = { "price.amount": 1 };
        else if (sortBy === "sales") sort = { "analytics.salesCount": -1 };
        else if (sortBy === "stock") sort = { stock: 1 };

        const products = await Product.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("category", "name slug")
            .populate("brand", "name");

        const total = await Product.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message,
        });
    }
};

// Get single product by ID
export const getSellerProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id, isDeleted: false })
            .populate("category", "name slug path")
            .populate("subCategory", "name slug")
            .populate("brand", "name slug logo");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch product",
            error: error.message,
        });
    }
};

// Update product stock
export const updateProductStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, variantId } = req.body;
        const seller = req.seller;

        const product = await Product.findOne({ _id: id, vendor: seller._id });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (variantId && product.hasVariants) {
            const variant = product.variants.id(variantId);
            if (!variant) {
                return res.status(404).json({
                    success: false,
                    message: "Variant not found",
                });
            }
            variant.stock = Math.max(0, stock);
        } else {
            product.stock = Math.max(0, stock);
        }

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: { stock: variantId ? null : product.stock },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update stock",
            error: error.message,
        });
    }
};
