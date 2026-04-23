// config/multer.config.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = "uploads/products";

        // Categorize by file type
        if (file.fieldname === "thumbnail") {
            folder = "uploads/products/thumbnails";
        } else if (file.fieldname === "images") {
            folder = "uploads/products/gallery";
        } else if (file.fieldname === "variantImages") {
            folder = "uploads/products/variants";
        } else if (file.fieldname === "videos") {
            folder = "uploads/products/videos";
        }

        ensureDirectoryExists(folder);
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const safeBasename = basename.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 50);
        cb(null, `${safeBasename}-${uniqueSuffix}${ext}`);
    },
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg/;
    const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;

    const extname =
        allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
        allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedImageTypes.test(file.mimetype) || allowedVideoTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Only image and video files are allowed!"));
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for videos, 5MB for images handled in controller
    },
    fileFilter: fileFilter,
});

// Helper function to delete file
export const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

// Helper function to delete multiple files
export const deleteFiles = (filePaths) => {
    filePaths.forEach((filePath) => deleteFile(filePath));
};

// Helper to get file info
export const getFileInfo = (file) => {
    if (!file) return null;

    // Get image dimensions if it's an image
    let width = null,
        height = null;
    if (file.mimetype.startsWith("image/")) {
        try {
            const sharp = require("sharp");
            const metadata = sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;
        } catch (error) {
            console.error("Error getting image dimensions:", error);
        }
    }

    return {
        url: `/${file.path.replace(/\\/g, "/")}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        width: width,
        height: height,
    };
};

export default upload;
