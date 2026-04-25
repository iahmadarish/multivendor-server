// modules/product/product.routes.js
import express from "express";
import {
    protectSeller,
    requireApprovedSeller,
    requireVerifiedEmail,
} from "../../middleware/sellerAuth.middleware.js";
import upload from "../../config/multer.config.js";
import {
    createProduct,
    getSellerProducts,
    getSellerProductById,
    updateProduct,
    deleteProduct,
    updateProductStock,
    submitProductForReview,
    archiveProduct,
    unarchiveProduct,
    duplicateProduct,
    bulkProductAction,
    getProductStats,
    updateVariant,
    getProductVariants,
    updateProductSeo,
    updateProductPricing,
    checkSlugAvailability,
    addProductImages,
    removeProductImages,
    reorderProductImages,
} from "./product.controller.js";

const router = express.Router();

// All seller routes require authentication and approval
router.use(protectSeller, requireVerifiedEmail, requireApprovedSeller);

// Stats route (must be before /:id routes)
router.get("/stats", getProductStats);

// Slug availability check
router.get("/slug-check", checkSlugAvailability);

// Bulk actions
router.post("/bulk", bulkProductAction);

// Product CRUD operations
router.post(
    "/",
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 20 },
        { name: "variantImages", maxCount: 50 },
    ]),
    createProduct,
);

router.get("/", getSellerProducts);
router.get("/:id", getSellerProductById);
router.put(
    "/:id",
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 20 },
        { name: "variantImages", maxCount: 50 },
    ]),
    updateProduct,
);
router.delete("/:id", deleteProduct);

// Stock management
router.patch("/:id/stock", updateProductStock);

// Product status management
router.patch("/:id/submit", submitProductForReview);
router.patch("/:id/archive", archiveProduct);
router.patch("/:id/unarchive", unarchiveProduct);

// Duplicate product
router.post("/:id/duplicate", duplicateProduct);

// Variant management
router.patch(
    "/:id/variants/:variantId",
    upload.fields([{ name: "variantImages", maxCount: 10 }]),
    updateVariant,
);
router.get("/:id/variants", getProductVariants);

// SEO management
router.patch("/:id/seo", updateProductSeo);

// Pricing management
router.patch("/:id/pricing", updateProductPricing);

// Image management
router.post("/:id/images", upload.fields([{ name: "images", maxCount: 20 }]), addProductImages);
router.delete("/:id/images", removeProductImages);
router.patch("/:id/images/reorder", reorderProductImages);

export default router;
