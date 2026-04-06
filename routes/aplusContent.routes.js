import express from "express";
import {
  // Public routes
  getAplusContentByProductId,
  getAplusContentByProductSlug,
  getAplusContentById,
  getBulkAplusContent,
  
  // Admin routes
  createOrUpdateAplusContent,
  getAllAplusContent,
  toggleAplusContentStatus,
  deleteAplusContent,
  getAdminAplusContent
} from "../controllers/aplusContent.controller.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import upload from "../controllers/uploadController.js";

const router = express.Router();

// ================= PUBLIC ROUTES =================
router.get("/product/:productId", getAplusContentByProductId);
router.get("/product-slug/:slug", getAplusContentByProductSlug);
router.get("/:id", getAplusContentById);
router.post("/bulk", getBulkAplusContent);

// ================= ADMIN PROTECTED ROUTES =================
router.post("/", protect, adminOnly, createOrUpdateAplusContent);
router.get("/admin/all", protect, adminOnly, getAllAplusContent);
router.get("/admin/dashboard", protect, adminOnly, getAdminAplusContent);
router.put("/toggle/:productId", protect, adminOnly, toggleAplusContentStatus);
router.delete("/:productId", protect, adminOnly, deleteAplusContent);

// ================= IMAGE UPLOAD ROUTES (Admin) =================
router.post(
  "/upload/image",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

      res.status(200).json({
        success: true,
        imageUrl,
        fileName: req.file.filename,
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: "Error uploading image"
      });
    }
  }
);

router.post(
  "/upload/multiple",
  protect,
  adminOnly,
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded"
        });
      }

      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      
      const uploadedFiles = req.files.map(file => ({
        url: `${baseUrl}/uploads/products/${file.filename}`,
        fileName: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));

      res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        files: uploadedFiles,
        count: uploadedFiles.length
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: "Error uploading images"
      });
    }
  }
);

export default router;