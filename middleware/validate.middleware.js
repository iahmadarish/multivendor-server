import { validationResult } from "express-validator";

/**
 * ─── validate ─────────────────────────────────────────────────
 * Reads the results collected by express-validator rules and
 * short-circuits the request with a structured 422 response
 * if any rule failed.
 *
 * Usage: place this middleware AFTER your validation rule arrays.
 *   router.post("/register", registerSellerRules, validate, registerSeller);
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Map to a clean array of { field, message } objects
        const formatted = errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
        }));

        return res.status(422).json({
            success: false,
            message: "Validation failed. Please fix the errors and try again.",
            errors: formatted,
        });
    }
    next();
};
