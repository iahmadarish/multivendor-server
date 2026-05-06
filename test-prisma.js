
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log("✅ Prisma connected successfully!");
        console.log("Users count:", await prisma.user.count());
    } catch (error) {
        console.error("❌ Failed:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
