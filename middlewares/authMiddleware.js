import jwt from "jsonwebtoken";
import prisma from "../config/database.js";

export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Prisma-তে user find
        req.user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                isEmailVerified: true,
                profilePicture: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, token failed",
        });
    }
};

// বাকি middleware গুলো একই থাকবে, শুধু user.role চেক করার সময়
// Prisma-তে role গুলো uppercase: 'ADMIN', 'USER' etc.
export const admin = (req, res, next) => {
    if (req.user && req.user.role === "ADMIN") {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: "Not authorized as admin",
        });
    }
};

export const optionalProtect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isEmailVerified: true,
                    status: true,
                },
            });
        }
        next();
    } catch (error) {
        next();
    }
};

// Additional middlewares
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized to access this route",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized`,
            });
        }
        next();
    };
};

export const adminOnly = admin;
export const executiveOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === "EXECUTIVE" || req.user.role === "ADMIN")) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: "Not authorized as executive or admin",
        });
    }
};

export const editorOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === "EDITOR" || req.user.role === "ADMIN")) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: "Not authorized as editor or admin",
        });
    }
};

export const requireVerifiedEmail = (req, res, next) => {
    if (req.user && !req.user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            message: "Please verify your email address",
        });
    }
    next();
};

export const requireActiveStatus = (req, res, next) => {
    if (req.user && req.user.status !== "ACTIVE") {
        return res.status(403).json({
            success: false,
            message: `Your account is ${req.user.status.toLowerCase()}`,
        });
    }
    next();
};

export const adminProtect = [protect, adminOnly];
export const executiveProtect = [protect, executiveOrAdmin];
export const editorProtect = [protect, editorOrAdmin];
