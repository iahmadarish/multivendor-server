// routes/product.routes.js
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
} from "../../modules/product/product.controller.js";

const router = express.Router();

// All seller routes require authentication and approval
router.use(protectSeller, requireVerifiedEmail, requireApprovedSeller);

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
    ]),
    updateProduct,
);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", updateProductStock);

export default router;
