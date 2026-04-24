// seeds/brandSeed.js - একবার রান করার জন্য
import mongoose from "mongoose";
import Brand from "../modules/brand/brand.model";
import dotenv from "dotenv";

dotenv.config();

const brands = [
    { name: "Samsung", description: "Samsung Electronics", website: "https://samsung.com" },
    { name: "Apple", description: "Apple Inc.", website: "https://apple.com" },
    { name: "Sony", description: "Sony Corporation", website: "https://sony.com" },
    { name: "LG", description: "LG Electronics", website: "https://lg.com" },
    { name: "Nike", description: "Nike Inc.", website: "https://nike.com" },
    { name: "Adidas", description: "Adidas AG", website: "https://adidas.com" },
    { name: "Local Brand", description: "Local Bangladeshi Brand" },
    { name: "No Brand", description: "Unbranded Products" },
];

const seedBrands = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        await Brand.deleteMany({});
        console.log("Cleared existing brands");

        const createdBrands = await Brand.insertMany(brands);
        console.log(`Created ${createdBrands.length} brands`);

        process.exit(0);
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
};

seedBrands();