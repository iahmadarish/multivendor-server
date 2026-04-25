// config/multer.config.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for uploaded files
const BASE_URL = process.env.BASE_URL || "https://api.zuzuva.com";
const NODE_ENV = process.env.NODE_ENV || "development";

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

        const fullPath = path.join(process.cwd(), folder);
        ensureDirectoryExists(fullPath);
        cb(null, fullPath);
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
        cb(null, true);
    } else {
        cb(new Error("Only image and video files are allowed!"));
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: fileFilter,
});

// Helper function to get full URL for a file
export const getFullImageUrl = (filePath) => {
    if (!filePath) return null;

    // If it's already a full URL, return as is
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        return filePath;
    }

    // Remove leading slash if present
    let cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

    // Return full URL
    return `${BASE_URL}/${cleanPath}`;
};

// Helper function to get file info with full URL
export const getFileInfo = (file) => {
    if (!file) return null;

    // Get relative path from project root
    const relativePath = path.relative(process.cwd(), file.path);

    // Get URL path (replace backslashes with forward slashes)
    const urlPath = relativePath.replace(/\\/g, "/");

    const fileInfo = {
        url: getFullImageUrl(urlPath),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        width: null,
        height: null,
        path: relativePath, // Store relative path for deletion
    };

    return fileInfo;
};

// Helper function to delete file
export const deleteFile = (filePath) => {
    if (!filePath) return false;

    // Extract the file system path from URL or direct path
    let fsPath = filePath;

    // If it's a URL, extract the path part
    if (filePath.startsWith("http")) {
        const urlPath = new URL(filePath).pathname;
        fsPath = path.join(process.cwd(), urlPath);
    } else {
        // Remove leading slash if present
        const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
        fsPath = path.join(process.cwd(), cleanPath);
    }

    if (fs.existsSync(fsPath)) {
        fs.unlinkSync(fsPath);
        return true;
    }
    return false;
};

// Helper function to delete multiple files
export const deleteFiles = (filePaths) => {
    filePaths.forEach((filePath) => deleteFile(filePath));
};

// Async version with sharp for dimensions (optional)
export const getFileInfoAsync = async (file) => {
    if (!file) return null;

    const relativePath = path.relative(process.cwd(), file.path);
    const urlPath = relativePath.replace(/\\/g, "/");

    const fileInfo = {
        url: getFullImageUrl(urlPath),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        width: null,
        height: null,
        path: relativePath,
    };

    // Get dimensions for images (optional - requires sharp)
    if (file.mimetype && file.mimetype.startsWith("image/")) {
        try {
            const sharp = (await import("sharp")).default;
            const metadata = await sharp(file.path).metadata();
            fileInfo.width = metadata.width;
            fileInfo.height = metadata.height;
        } catch (error) {
            // sharp not installed - dimensions are optional
            console.warn(
                "Could not get image dimensions (sharp not installed):",
                file.originalname,
            );
        }
    }

    return fileInfo;
};

export default upload;
