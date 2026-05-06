import express from "express"
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  getCategoryPath,
} from "./categoryController.js"

const router = express.Router()

// Validation middleware
const validateCategory = (req, res, next) => {
  if (!req.body.name || !req.body.slug) {
    return res.status(400).json({ success: false, error: "Name and slug are required" })
  }
  if (req.body.commissionRate && (req.body.commissionRate < 0 || req.body.commissionRate > 1)) {
    return res.status(400).json({ success: false, error: "Commission rate must be between 0 and 1" })
  }
  next()
}

router.get("/", getCategories)
router.get("/tree", getCategoryTree)
router.get("/:id", getCategory)
router.get("/:id/path", getCategoryPath)
router.post("/", validateCategory, createCategory)
router.put("/:id", validateCategory, updateCategory)
router.delete("/:id", deleteCategory)

export default router
