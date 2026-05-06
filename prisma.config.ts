import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Direct property access bebohar korun
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL, 
    },
});