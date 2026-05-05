import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME || "zuzuva",
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("✅ PostgreSQL connected successfully via Prisma");
    } catch (error) {
        console.error("❌ PostgreSQL connection failed:", error);
        process.exit(1);
    }
};

export { connectDB };
export default prisma;
