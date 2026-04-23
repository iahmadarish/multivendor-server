// validators/product.validator.js

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// ─── Create / Update shared field validators ──────────────────────────────────

const validatePriceField = (price, errors) => {
    if (!price || price.amount === undefined || price.amount === null) {
        errors.push({ field: "price", message: "Product price is required" });
    } else if (typeof price.amount !== "number" || price.amount < 0) {
        errors.push({ field: "price.amount", message: "Price must be a non-negative number" });
    }
};

const validateDiscountField = (discount, price, errors) => {
    if (!discount || discount.type === "none") return;

    if (!["percentage", "fixed"].includes(discount.type)) {
        errors.push({ field: "discount.type", message: "Discount type must be percentage or fixed" });
        return;
    }

    if (discount.value === undefined || discount.value < 0) {
        errors.push({ field: "discount.value", message: "Discount value must be a non-negative number" });
        return;
    }

    if (discount.type === "percentage" && discount.value > 100) {
        errors.push({ field: "discount.value", message: "Percentage discount cannot exceed 100%" });
    }

    if (discount.type === "fixed" && price?.amount !== undefined && discount.value > price.amount) {
        errors.push({ field: "discount.value", message: "Fixed discount cannot exceed product price" });
    }

    if (discount.startDate && discount.endDate) {
        if (new Date(discount.startDate) >= new Date(discount.endDate)) {
            errors.push({ field: "discount.endDate", message: "Discount end date must be after start date" });
        }
    }
};

const validateVariantOptions = (variantOptions, errors) => {
    let parsed = variantOptions;
    try {
        if (typeof variantOptions === "string") parsed = JSON.parse(variantOptions);
    } catch {
        errors.push({ field: "variantOptions", message: "Invalid variant options format (expected JSON)" });
        return null;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        errors.push({ field: "variantOptions", message: "At least one variant option is required for variant products" });
        return null;
    }

    const optionNames = new Set();
    parsed.forEach((option, i) => {
        if (!option.name || option.name.trim().length === 0) {
            errors.push({ field: `variantOptions[${i}].name`, message: "Variant option name is required" });
        } else {
            if (optionNames.has(option.name.trim().toLowerCase())) {
                errors.push({ field: `variantOptions[${i}].name`, message: `Duplicate variant option name: "${option.name}"` });
            }
            optionNames.add(option.name.trim().toLowerCase());
        }

        if (!option.values || !Array.isArray(option.values) || option.values.length === 0) {
            errors.push({ field: `variantOptions[${i}].values`, message: "Variant option must have at least one value" });
        } else {
            const uniqueValues = new Set(option.values.map((v) => v.trim().toLowerCase()));
            if (uniqueValues.size !== option.values.length) {
                errors.push({ field: `variantOptions[${i}].values`, message: `Duplicate values in variant option "${option.name}"` });
            }
        }

        if (option.displayType && !["dropdown", "swatch", "button", "radio"].includes(option.displayType)) {
            errors.push({ field: `variantOptions[${i}].displayType`, message: "Invalid display type" });
        }
    });

    return parsed;
};

const validateAttributes = (attributes, errors) => {
    if (!Array.isArray(attributes)) return;
    attributes.forEach((attr, i) => {
        if (!attr.key || attr.key.trim().length === 0) {
            errors.push({ field: `attributes[${i}].key`, message: "Attribute key is required" });
        }
        if (!attr.value || attr.value.trim().length === 0) {
            errors.push({ field: `attributes[${i}].value`, message: "Attribute value is required" });
        }
    });
};

const validateDelivery = (delivery, errors) => {
    if (!delivery) return;
    if (delivery.weight !== undefined && (typeof delivery.weight !== "number" || delivery.weight < 0)) {
        errors.push({ field: "delivery.weight", message: "Weight must be a non-negative number" });
    }
    if (delivery.handlingTime !== undefined && (typeof delivery.handlingTime !== "number" || delivery.handlingTime < 0)) {
        errors.push({ field: "delivery.handlingTime", message: "Handling time must be a non-negative number" });
    }
    if (delivery.shippingClass && !["standard", "express", "overnight", "free"].includes(delivery.shippingClass)) {
        errors.push({ field: "delivery.shippingClass", message: "Invalid shipping class" });
    }
};

const validateSeo = (seo, errors) => {
    if (!seo) return;
    if (seo.metaTitle && seo.metaTitle.length > 70) {
        errors.push({ field: "seo.metaTitle", message: "Meta title cannot exceed 70 characters" });
    }
    if (seo.metaDescription && seo.metaDescription.length > 160) {
        errors.push({ field: "seo.metaDescription", message: "Meta description cannot exceed 160 characters" });
    }
    if (seo.canonicalUrl && !isValidUrl(seo.canonicalUrl)) {
        errors.push({ field: "seo.canonicalUrl", message: "Canonical URL is not a valid URL" });
    }
};

// ─── Create Product Validator ─────────────────────────────────────────────────

export const validateProductInput = (data) => {
    const errors = [];

    // Title
    if (!data.title || data.title.trim().length === 0) {
        errors.push({ field: "title", message: "Product title is required" });
    } else if (data.title.length > 500) {
        errors.push({ field: "title", message: "Title cannot exceed 500 characters" });
    }

    // Description
    if (!data.description || data.description.trim().length === 0) {
        errors.push({ field: "description", message: "Product description is required" });
    }

    // Short description
    if (data.shortDescription && data.shortDescription.length > 500) {
        errors.push({ field: "shortDescription", message: "Short description cannot exceed 500 characters" });
    }

    // Category
    if (!data.category) {
        errors.push({ field: "category", message: "Category is required" });
    } else if (!isValidObjectId(data.category)) {
        errors.push({ field: "category", message: "Category must be a valid ID" });
    }

    // Sub-category (optional)
    if (data.subCategory && !isValidObjectId(data.subCategory)) {
        errors.push({ field: "subCategory", message: "Sub-category must be a valid ID" });
    }

    // Price
    validatePriceField(data.price, errors);

    // Compare-at price
    if (data.compareAtPrice !== undefined && data.compareAtPrice !== null) {
        if (typeof data.compareAtPrice.amount !== "number" || data.compareAtPrice.amount < 0) {
            errors.push({ field: "compareAtPrice.amount", message: "Compare-at price must be a non-negative number" });
        } else if (data.price?.amount !== undefined && data.compareAtPrice.amount <= data.price.amount) {
            errors.push({ field: "compareAtPrice", message: "Compare-at price must be greater than the selling price" });
        }
    }

    // Discount
    validateDiscountField(data.discount, data.price, errors);

    // Stock (non-variant products only)
    if (!data.hasVariants) {
        if (data.stock === undefined || data.stock === null) {
            errors.push({ field: "stock", message: "Stock quantity is required for non-variant products" });
        } else if (typeof data.stock !== "number" || data.stock < 0) {
            errors.push({ field: "stock", message: "Stock must be a non-negative number" });
        }
    }

    // Variant options (variant products)
    if (data.hasVariants) {
        validateVariantOptions(data.variantOptions, errors);
    }

    // SKU format
    if (data.sku && !/^[a-zA-Z0-9_\-]+$/.test(data.sku)) {
        errors.push({ field: "sku", message: "SKU can only contain letters, numbers, hyphens, and underscores" });
    }

    // Tags
    if (data.tags && !Array.isArray(data.tags)) {
        errors.push({ field: "tags", message: "Tags must be an array" });
    }

    // Bullet points / highlights
    if (data.highlights && !Array.isArray(data.highlights)) {
        errors.push({ field: "highlights", message: "Highlights must be an array" });
    }
    if (Array.isArray(data.highlights) && data.highlights.length > 10) {
        errors.push({ field: "highlights", message: "Cannot have more than 10 highlights" });
    }

    // Attributes
    validateAttributes(data.attributes, errors);

    // Delivery
    validateDelivery(data.delivery, errors);

    // SEO
    validateSeo(data.seo, errors);

    // Min / Max order quantity
    if (data.minOrderQuantity !== undefined && (typeof data.minOrderQuantity !== "number" || data.minOrderQuantity < 1)) {
        errors.push({ field: "minOrderQuantity", message: "Minimum order quantity must be at least 1" });
    }
    if (data.maxOrderQuantity !== undefined && data.maxOrderQuantity < 0) {
        errors.push({ field: "maxOrderQuantity", message: "Maximum order quantity cannot be negative" });
    }
    if (
        data.minOrderQuantity &&
        data.maxOrderQuantity &&
        data.maxOrderQuantity > 0 &&
        data.minOrderQuantity > data.maxOrderQuantity
    ) {
        errors.push({ field: "maxOrderQuantity", message: "Maximum order quantity must be greater than minimum order quantity" });
    }

    // Tax rate
    if (data.taxRate !== undefined && (typeof data.taxRate !== "number" || data.taxRate < 0 || data.taxRate > 100)) {
        errors.push({ field: "taxRate", message: "Tax rate must be between 0 and 100" });
    }

    // Available dates
    if (data.availableFrom && data.availableTo) {
        if (new Date(data.availableFrom) >= new Date(data.availableTo)) {
            errors.push({ field: "availableTo", message: "Available-to date must be after available-from date" });
        }
    }

    // Status
    if (data.status && !["draft", "pending_review", "archived"].includes(data.status)) {
        errors.push({ field: "status", message: "Sellers can only set status to draft, pending_review, or archived" });
    }

    // Visibility
    if (data.visibility && !["visible", "hidden", "catalog_only", "search_only"].includes(data.visibility)) {
        errors.push({ field: "visibility", message: "Invalid visibility option" });
    }

    return errors.length > 0 ? errors : null;
};

// ─── Update Product Validator ─────────────────────────────────────────────────

export const validateProductUpdateInput = (data) => {
    const errors = [];

    if (data.title !== undefined) {
        if (data.title.trim().length === 0) {
            errors.push({ field: "title", message: "Product title cannot be empty" });
        } else if (data.title.length > 500) {
            errors.push({ field: "title", message: "Title cannot exceed 500 characters" });
        }
    }

    if (data.description !== undefined && data.description.trim().length === 0) {
        errors.push({ field: "description", message: "Product description cannot be empty" });
    }

    if (data.shortDescription !== undefined && data.shortDescription.length > 500) {
        errors.push({ field: "shortDescription", message: "Short description cannot exceed 500 characters" });
    }

    if (data.category !== undefined && !isValidObjectId(data.category)) {
        errors.push({ field: "category", message: "Category must be a valid ID" });
    }

    if (data.subCategory !== undefined && data.subCategory !== null && !isValidObjectId(data.subCategory)) {
        errors.push({ field: "subCategory", message: "Sub-category must be a valid ID" });
    }

    if (data.price !== undefined) validatePriceField(data.price, errors);

    if (data.compareAtPrice !== undefined && data.compareAtPrice !== null) {
        if (typeof data.compareAtPrice.amount !== "number" || data.compareAtPrice.amount < 0) {
            errors.push({ field: "compareAtPrice.amount", message: "Compare-at price must be a non-negative number" });
        }
    }

    if (data.discount !== undefined) validateDiscountField(data.discount, data.price, errors);

    if (data.stock !== undefined && (typeof data.stock !== "number" || data.stock < 0)) {
        errors.push({ field: "stock", message: "Stock must be a non-negative number" });
    }

    if (data.hasVariants && data.variantOptions !== undefined) {
        validateVariantOptions(data.variantOptions, errors);
    }

    if (data.sku !== undefined && data.sku && !/^[a-zA-Z0-9_\-]+$/.test(data.sku)) {
        errors.push({ field: "sku", message: "SKU can only contain letters, numbers, hyphens, and underscores" });
    }

    if (data.attributes !== undefined) validateAttributes(data.attributes, errors);
    if (data.delivery !== undefined) validateDelivery(data.delivery, errors);
    if (data.seo !== undefined) validateSeo(data.seo, errors);

    if (data.highlights !== undefined) {
        if (!Array.isArray(data.highlights)) {
            errors.push({ field: "highlights", message: "Highlights must be an array" });
        } else if (data.highlights.length > 10) {
            errors.push({ field: "highlights", message: "Cannot have more than 10 highlights" });
        }
    }

    if (data.status !== undefined && !["draft", "pending_review", "archived"].includes(data.status)) {
        errors.push({ field: "status", message: "Sellers can only set status to draft, pending_review, or archived" });
    }

    if (data.visibility !== undefined && !["visible", "hidden", "catalog_only", "search_only"].includes(data.visibility)) {
        errors.push({ field: "visibility", message: "Invalid visibility option" });
    }

    if (data.availableFrom && data.availableTo) {
        if (new Date(data.availableFrom) >= new Date(data.availableTo)) {
            errors.push({ field: "availableTo", message: "Available-to date must be after available-from date" });
        }
    }

    if (data.minOrderQuantity !== undefined && (typeof data.minOrderQuantity !== "number" || data.minOrderQuantity < 1)) {
        errors.push({ field: "minOrderQuantity", message: "Minimum order quantity must be at least 1" });
    }

    if (data.maxOrderQuantity !== undefined && data.maxOrderQuantity < 0) {
        errors.push({ field: "maxOrderQuantity", message: "Maximum order quantity cannot be negative" });
    }

    return errors.length > 0 ? errors : null;
};

// ─── Stock Update Validator ───────────────────────────────────────────────────

export const validateStockUpdate = (data) => {
    const errors = [];

    if (data.stock === undefined || data.stock === null) {
        errors.push({ field: "stock", message: "Stock value is required" });
    } else if (typeof data.stock !== "number" || !Number.isInteger(data.stock) || data.stock < 0) {
        errors.push({ field: "stock", message: "Stock must be a non-negative integer" });
    }

    if (data.variantId !== undefined && !isValidObjectId(data.variantId)) {
        errors.push({ field: "variantId", message: "Variant ID must be a valid ID" });
    }

    return errors.length > 0 ? errors : null;
};

// ─── Bulk Action Validator ────────────────────────────────────────────────────

export const validateBulkAction = (data) => {
    const errors = [];

    if (!data.productIds || !Array.isArray(data.productIds) || data.productIds.length === 0) {
        errors.push({ field: "productIds", message: "At least one product ID is required" });
        return errors;
    }

    if (data.productIds.length > 100) {
        errors.push({ field: "productIds", message: "Cannot perform bulk action on more than 100 products at once" });
    }

    const invalidIds = data.productIds.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
        errors.push({ field: "productIds", message: `Invalid product IDs: ${invalidIds.join(", ")}` });
    }

    const allowedActions = ["publish", "archive", "delete", "draft"];
    if (!data.action || !allowedActions.includes(data.action)) {
        errors.push({ field: "action", message: `Action must be one of: ${allowedActions.join(", ")}` });
    }

    return errors.length > 0 ? errors : null;
};

// ─── Variant Update Validator ─────────────────────────────────────────────────

export const validateVariantUpdate = (data) => {
    const errors = [];

    if (data.price !== undefined) {
        if (!data.price.amount === undefined || typeof data.price.amount !== "number" || data.price.amount < 0) {
            errors.push({ field: "price.amount", message: "Price must be a non-negative number" });
        }
    }

    if (data.stock !== undefined) {
        if (typeof data.stock !== "number" || !Number.isInteger(data.stock) || data.stock < 0) {
            errors.push({ field: "stock", message: "Stock must be a non-negative integer" });
        }
    }

    if (data.discount !== undefined) {
        validateDiscountField(data.discount, data.price, errors);
    }

    if (data.sku !== undefined && data.sku && !/^[a-zA-Z0-9_\-]+$/.test(data.sku)) {
        errors.push({ field: "sku", message: "SKU can only contain letters, numbers, hyphens, and underscores" });
    }

    return errors.length > 0 ? errors : null;
};