/**
 * ─── notFound ──────────────────────────────────────────────────
 * Catches requests to unregistered routes and creates a
 * structured 404 error for the global error handler.
 */
export const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

/**
 * ─── errorHandler ──────────────────────────────────────────────
 * Global error handler. Normalizes all error types into a
 * consistent JSON envelope so the client always gets the
 * same shape of response.
 *
 * Handles:
 *  - Mongoose CastError (invalid ObjectId)
 *  - Mongoose Duplicate Key (code 11000)
 *  - Mongoose ValidationError
 *  - JWT errors (already handled in middleware, but caught here too)
 *  - Generic application errors
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let errors = [];

    // ── Mongoose: bad ObjectId (e.g. /sellers/not-an-id) ──────
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // ── Mongoose: duplicate key ────────────────────────────────
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        message = `A record with this ${field} already exists.`;
    }

    // ── Mongoose: validation errors ───────────────────────────
    if (err.name === "ValidationError") {
        statusCode = 422;
        message = "Validation failed.";
        errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
    }

    // ── JWT errors ─────────────────────────────────────────────
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token. Please log in again.";
    }
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired. Please log in again.";
    }

    // ── Log in development ─────────────────────────────────────
    if (process.env.NODE_ENV !== "production") {
        console.error(`\n❌ [ERROR] ${statusCode} — ${message}`);
        if (err.stack) console.error(err.stack);
    }

    return res.status(statusCode).json({
        success: false,
        message,
        ...(errors.length > 0 && { errors }),
        // Only expose stack trace in development
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};
