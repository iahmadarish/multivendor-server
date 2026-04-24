import express from "express";
import {
    createBrand,
    getAllBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
    getBrandDropdown,
} from "./brand.controller.js";
import { protect } from '../../middlewares/authMiddleware.js'; 

const router = express.Router();


router.get("/", getAllBrands);
router.get("/dropdown", getBrandDropdown); 
router.get("/:id", getBrandById);


router.post("/", protect, createBrand);
router.put("/:id", protect, updateBrand);
router.delete("/:id", protect, deleteBrand);

export default router;