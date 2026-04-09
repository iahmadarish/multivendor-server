import { verifyAccessToken } from "../utils/jwt.utils.js";
import Seller from "../models/Seller.model.js";

/**
 * ─── protectSeller ────────────────────────────────────────────
 * Verifies the Bearer JWT and attaches the seller document
 * to req.seller for downstream handlers.
 */
export const protectSeller = async (req, res, next) => {
    try {
        // 1. Extract token from Authorization header
        let token;
        if (req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
        }

        // 2. Verify token signature and expiry
        const decoded = verifyAccessToken(token);

        // 3. Fetch seller from DB (ensures seller still exists)
        const seller = await Seller.findById(decoded.id).select("-password");
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
                message: "Token has expired. Please log in again.",
            });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token. Please log in again.",
            });
        }
        next(error);
    }
};

/**
 * ─── requireApprovedSeller ────────────────────────────────────
 * Ensures the authenticated seller's account has been approved
 * by an admin before accessing protected seller resources.
 */
export const requireApprovedSeller = (req, res, next) => {
    if (!req.seller || req.seller.status !== "approved") {
        return res.status(403).json({
            success: false,
            message: `Your seller account is currently '${req.seller?.status}'. Please wait for admin approval.`,
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
