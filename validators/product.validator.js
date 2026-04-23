// validators/product.validator.js
export const validateProductInput = (data) => {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
        errors.push({ field: "title", message: "Product title is required" });
    } else if (data.title.length > 500) {
        errors.push({ field: "title", message: "Title cannot exceed 500 characters" });
    }

    if (!data.description || data.description.trim().length === 0) {
        errors.push({ field: "description", message: "Product description is required" });
    }

    if (!data.category) {
        errors.push({ field: "category", message: "Category is required" });
    }

    if (!data.price || !data.price.amount) {
        errors.push({ field: "price", message: "Product price is required" });
    } else if (data.price.amount < 0) {
        errors.push({ field: "price", message: "Price cannot be negative" });
    }

    if (!data.hasVariants && (data.stock === undefined || data.stock === null)) {
        errors.push({
            field: "stock",
            message: "Stock quantity is required for non-variant products",
        });
    } else if (!data.hasVariants && data.stock < 0) {
        errors.push({ field: "stock", message: "Stock cannot be negative" });
    }

    if (data.hasVariants) {
        let variantOptions;
        try {
            variantOptions =
                typeof data.variantOptions === "string"
                    ? JSON.parse(data.variantOptions)
                    : data.variantOptions;
        } catch (e) {
            errors.push({ field: "variantOptions", message: "Invalid variant options format" });
        }

        if (variantOptions && variantOptions.length === 0) {
            errors.push({
                field: "variantOptions",
                message: "Variant options are required for variant products",
            });
        } else if (variantOptions) {
            for (let i = 0; i < variantOptions.length; i++) {
                const option = variantOptions[i];
                if (!option.name || option.name.trim().length === 0) {
                    errors.push({
                        field: `variantOptions[${i}].name`,
                        message: "Variant option name is required",
                    });
                }
                if (!option.values || option.values.length === 0) {
                    errors.push({
                        field: `variantOptions[${i}].values`,
                        message: "Variant option values are required",
                    });
                }
            }
        }
    }

    if (data.discount) {
        if (
            data.discount.type === "percentage" &&
            (data.discount.value < 0 || data.discount.value > 100)
        ) {
            errors.push({
                field: "discount.value",
                message: "Percentage discount must be between 0 and 100",
            });
        }
        if (data.discount.type === "fixed" && data.discount.value < 0) {
            errors.push({ field: "discount.value", message: "Fixed discount cannot be negative" });
        }
        if (
            data.discount.type === "fixed" &&
            data.price &&
            data.discount.value > data.price.amount
        ) {
            errors.push({
                field: "discount.value",
                message: "Fixed discount cannot exceed product price",
            });
        }
    }

    if (data.availableFrom && data.availableTo) {
        if (new Date(data.availableFrom) >= new Date(data.availableTo)) {
            errors.push({
                field: "availableTo",
                message: "Available to date must be after available from date",
            });
        }
    }

    return errors.length > 0 ? errors : null;
};
