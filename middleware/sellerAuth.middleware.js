// middleware/sellerAuth.middleware.js
import { verifyAccessToken } from "../utils/jwt.utils.js";
import prisma from "../config/database.js";

/**
 * ─── protectSeller ────────────────────────────────────────────
 * Verifies the Bearer JWT and attaches the seller document
 * to req.seller for downstream handlers.
 */
export const protectSeller = async (req, res, next) => {
    try {
        let token;

        // Check Authorization header first
        if (req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        // Also check cookie
        if (!token && req.cookies?.sellerAccessToken) {
            token = req.cookies.sellerAccessToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
        }

        // Clean token (remove any quotes)
        const cleanToken = token.replace(/^["']|["']$/g, "");

        // Verify token signature and expiry
        const decoded = verifyAccessToken(cleanToken);

        // Fetch seller from DB
        const seller = await prisma.seller.findUnique({
            where: { id: parseInt(decoded.id) },
        });

        if (!seller) {
            return res.status(401).json({
                success: false,
                message: "Token is valid but the seller no longer exists.",
            });
        }

        req.seller = seller;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired. Please refresh your session.",
                code: "TOKEN_EXPIRED",
            });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token. Please log in again.",
                code: "INVALID_TOKEN",
            });
        }
        console.error("Auth middleware error:", error);
        next(error);
    }
};

/**
 * ─── requireApprovedSeller ────────────────────────────────────
 * Ensures the authenticated seller's account has been approved
 */
export const requireApprovedSeller = (req, res, next) => {
    if (!req.seller || req.seller.status !== "approved") {
        return res.status(403).json({
            success: false,
            message: `Your seller account is currently '${req.seller?.status || "unknown"}'. Please wait for admin approval.`,
        });
    }
    next();
};

/**
 * ─── requireVerifiedEmail ─────────────────────────────────────
 * Blocks unverified email sellers from accessing resources.
 */
export const requireVerifiedEmail = (req, res, next) => {
    if (!req.seller?.isEmailVerified) {
        return res.status(403).json({
            success: false,
            message: "Please verify your email address before continuing.",
        });
    }
    next();
};