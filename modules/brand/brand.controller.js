// controllers/brand.controller.js
import Brand from "./brand.model.js";
// import { makeSlug } from "../../utils/makeSlug.js";

// Create Brand (Admin only)
export const createBrand = async (req, res) => {
    try {
        const { name, description, logo, website, seo } = req.body;

        // Check if brand exists
        const existingBrand = await Brand.findOne({ name: name.trim() });
        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: "Brand with this name already exists",
            });
        }

        const brand = new Brand({
            name: name.trim(),
            description,
            logo,
            website,
            seo,
            createdBy: req.admin?._id || req.user?._id,
        });

        await brand.save();

        return res.status(201).json({
            success: true,
            message: "Brand created successfully",
            data: brand,
        });
    } catch (error) {
        console.error("Create brand error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create brand",
            error: error.message,
        });
    }
};

// Get all brands (Public)
export const getAllBrands = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            isActive, // Remove default value
        } = req.query;

        const query = { isDeleted: false };

        // ONLY filter by isActive if explicitly provided
        if (isActive !== undefined && isActive !== "") {
            query.isActive = isActive === "true";
        }
        // If isActive is not provided or empty, show all brands

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        console.log("Query:", query); // Debug log

        const brands = await Brand.find(query)
            .sort({ createdAt: -1 }) // Sort by newest first (easier to see new brands)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Brand.countDocuments(query);

        console.log(`Found ${brands.length} brands`); // Debug log

        return res.status(200).json({
            success: true,
            data: brands,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get brands error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch brands",
            error: error.message,
        });
    }
};

// Get single brand
export const getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: brand,
        });
    } catch (error) {
        console.error("Get brand error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch brand",
            error: error.message,
        });
    }
};

// Update brand (Admin only)
export const updateBrand = async (req, res) => {
    try {
        const { name, description, logo, website, seo, isActive } = req.body;

        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
            });
        }

        // Update fields
        if (name) brand.name = name.trim();
        if (description !== undefined) brand.description = description;
        if (logo) brand.logo = logo;
        if (website !== undefined) brand.website = website;
        if (seo) brand.seo = seo;
        if (isActive !== undefined) brand.isActive = isActive;

        await brand.save();

        return res.status(200).json({
            success: true,
            message: "Brand updated successfully",
            data: brand,
        });
    } catch (error) {
        console.error("Update brand error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update brand",
            error: error.message,
        });
    }
};

// Soft delete brand (Admin only)
export const deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
            });
        }

        // Soft delete
        brand.isDeleted = true;
        brand.isActive = false;
        await brand.save();

        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully",
        });
    } catch (error) {
        console.error("Delete brand error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete brand",
            error: error.message,
        });
    }
};

// Get brands for dropdown (Lightweight, active only)
export const getBrandDropdown = async (req, res) => {
    try {
        const brands = await Brand.find({
            isActive: true,
            isDeleted: false,
        })
            .select("name slug logo")
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: brands,
        });
    } catch (error) {
        console.error("Get brand dropdown error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch brands",
            error: error.message,
        });
    }
};
