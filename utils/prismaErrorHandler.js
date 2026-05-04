/**
 * Handle Prisma-specific errors and return appropriate responses
 */
export const handlePrismaError = (error, res) => {
    // Unique constraint violation
    if (error.code === "P2002") {
        const field = error.meta?.target?.[0] || "field";
        return res.status(400).json({
            success: false,
            message: `A record with this ${field} already exists`,
        });
    }

    // Record not found
    if (error.code === "P2025") {
        return res.status(404).json({
            success: false,
            message: "Record not found",
        });
    }

    // Foreign key constraint failed
    if (error.code === "P2003") {
        return res.status(400).json({
            success: false,
            message: "Related record not found",
        });
    }

    // Default error
    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
