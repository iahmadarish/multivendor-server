import jwt from "jsonwebtoken";

/**
 * Generate a short-lived access token for a seller.
 * @param {string} sellerId  - MongoDB seller _id
 * @returns {string} signed JWT
 */
export const generateAccessToken = (sellerId) => {
    return jwt.sign({ id: sellerId, type: "seller" }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    });
};

/**
 * Generate a long-lived refresh token.
 * Stored (hashed) in DB and rotated on every use.
 * @param {string} sellerId
 * @returns {string} signed JWT
 */
export const generateRefreshToken = (sellerId) => {
    return jwt.sign({ id: sellerId, type: "seller" }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
    });
};

/**
 * Verify an access token and return the decoded payload.
 * Throws a JsonWebTokenError on failure.
 * @param {string} token
 * @returns {object} decoded payload
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify a refresh token and return the decoded payload.
 * @param {string} token
 * @returns {object} decoded payload
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
