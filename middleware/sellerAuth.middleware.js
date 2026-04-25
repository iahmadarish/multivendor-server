// middleware/sellerAuth.middleware.js
import { verifyAccessToken } from "../utils/jwt.utils.js";
import Seller from "../modules/seller/Seller.model.js";

/**
 * ─── protectSeller ────────────────────────────────────────────
 * Verifies the Bearer JWT and attaches the seller document
 * to req.seller for downstream handlers.
 */
export const protectSeller = async (req, res, next) => {
    try {
        // 1. Extract token from multiple possible locations
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

        // 2. Verify token signature and expiry
        const decoded = verifyAccessToken(cleanToken);

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
 * Optional: Refresh token middleware
 */
export const refreshSellerToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.sellerRefreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided.",
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const seller = await Seller.findById(decoded.id).select("-password");

        if (!seller) {
            return res.status(401).json({
                success: false,
                message: "Seller not found.",
            });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(seller._id);

        // Set new access token in cookie
        res.cookie("sellerAccessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            accessToken: newAccessToken,
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid refresh token.",
        });
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
