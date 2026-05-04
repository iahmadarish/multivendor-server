import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import prisma, { connectDB } from "./config/database.js";

import authRoutes from "./routes/authRoutes.js";
// import sellerAuthRoutes from "./modules/seller/sellerAuth.routes.js";
// import categoryRoutes from "./modules/category/categoryRoutes.js";
// import productRoutes from "./modules/product/product.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || "v1";

// const connectDB = async () => {
//     try {
//         await prisma.$connect();
//         console.log("✅ PostgreSQL connected successfully via Prisma");
//     } catch (error) {
//         console.error("❌ PostgreSQL connection failed:", error);
//         process.exit(1);
//     }
// };

connectDB();

// Static files
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
        setHeaders: (res, filePath) => {
            res.setHeader("Cache-Control", "public, max-age=86400");
        },
    }),
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Security & Middleware
app.use(helmet());

const allowedOrigins = [
    "https://innoel.vercel.app/",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://zuzuva.com",
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || origin === "null") {
                return callback(null, true);
            }
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.log(`CORS Error: Blocked origin ${origin}`);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.use(`/api/${API_VERSION}/auth`, authRoutes);
// app.use("/api/v1/sellers/auth", sellerAuthRoutes);
// app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
// app.use(`/api/${API_VERSION}/products`, productRoutes);

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "E-commerce API is running with Prisma + PostgreSQL!",
        environment: process.env.NODE_ENV || "development",
        version: API_VERSION,
        timestamp: new Date().toISOString(),
    });
});

// Error handling
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
    });
});

app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is Live!`);
    console.log(`📍 URL: http://localhost:${PORT}/api/${API_VERSION}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    console.log("👋 Prisma disconnected");
    process.exit(0);
});
