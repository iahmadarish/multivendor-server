import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import heroContentRoutes from "./routes/heroContentRoutes.js";
import categoryRoutes from "./modules/category/categoryRoutes.js";
import productRoutes from "./modules/product/product.routes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./modules/cart/cartRoutes.js";
import orderRoutes from "./modules/order/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./modules/payments/paymentRoutes.js";
import checkoutRoutes from "./modules/checkout/checkoutRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import reviewRoutes from "./routes/review.routes.js";
import heroRoutes from "./routes/heroRoutes.js";
import promotionRoutes from "./modules/promotion/promotionRoutes.js";
import adminCartRoutes from "./modules/admin-cart/adminCartRoutes.js";
import couponRoutes from "./modules/coupon/couponRoutes.js";
import navbarRoutes from "./routes/navbarRoutes.js";
import aplusContentRoutes from "./routes/aplusContent.routes.js";
import adminShippingRoutes from "./routes/admin.shippingRoutes.js";
import pageMetaRoutes from "./routes/pageMeta.js";

import cookieParser from "cookie-parser";
import sellerAuthRoutes from "./modules/seller/sellerAuth.routes.js";
import adminSellerRoutes from "./modules/admin/adminSeller.routes.js";
import brandRoutes from "./modules/brand/brand.routes.js";

import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/database.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || "v1";

// Connect to MongoDB
connectDB();

// Serve static files from uploads directory
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
        setHeaders: (res, filePath) => {
            // Cache images for 1 day
            res.setHeader("Cache-Control", "public, max-age=86400");
        },
    }),
);

// Also serve from root uploads (for compatibility)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use("/api/v1/sellers/auth", sellerAuthRoutes);

app.use(`/api/${API_VERSION}/cart`, cartRoutes);
app.use(`/api/${API_VERSION}/orders`, orderRoutes);
app.use(`/api/${API_VERSION}/payment`, paymentRoutes);
app.use(`/api/${API_VERSION}/checkout`, checkoutRoutes);
app.use("/api/v1/admin/orders", adminOrderRoutes);
app.use("/api/v1/admin/analytics", analyticsRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use(`/api/${API_VERSION}/hero`, heroContentRoutes);
app.use(`/api/${API_VERSION}/hero`, heroRoutes);
app.use("/api/v1/admin/shipping", adminShippingRoutes);
app.use(`/api/${API_VERSION}/promotions`, promotionRoutes);
app.use(`/api/${API_VERSION}/navbar`, navbarRoutes);
app.use("/api/v1/admin/cart-campaigns", adminCartRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/aplus-content", aplusContentRoutes);
app.use("/api/v1/page-meta", pageMetaRoutes);
app.use("/api/v1/admin/sellers", adminSellerRoutes);
app.use("/api/v1/brands", brandRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "E-commerce API is running smoothly!",
        environment: process.env.NODE_ENV || "development",
        version: API_VERSION,
        timestamp: new Date().toISOString(),
    });
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is Live!`);
    console.log(`URL: http://localhost:${PORT}/api/${API_VERSION}`);
});
