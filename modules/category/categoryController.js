import { CategoryModel } from "./Category.js"

export const getCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.findAll()
    res.json({ success: true, data: categories })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getCategory = async (req, res) => {
  try {
    const category = await CategoryModel.findById(req.params.id)
    if (!category) return res.status(404).json({ success: false, error: "Category not found" })
    res.json({ success: true, data: category })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createCategory = async (req, res) => {
  try {
    const category = await CategoryModel.create(req.body)
    res.status(201).json({ success: true, data: category })
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, error: "Slug must be unique" })
    }
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateCategory = async (req, res) => {
  try {
    const category = await CategoryModel.update(req.params.id, req.body)
    res.json({ success: true, data: category })
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, error: "Category not found" })
    }
    res.status(500).json({ success: false, error: error.message })
  }
}

export const deleteCategory = async (req, res) => {
  try {
    await CategoryModel.delete(req.params.id)
    res.json({ success: true, message: "Category deleted" })
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, error: "Category not found" })
    }
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getCategoryTree = async (req, res) => {
  try {
    const tree = await CategoryModel.getCategoryTree()
    res.json({ success: true, data: tree })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getCategoryPath = async (req, res) => {
  try {
    const path = await CategoryModel.getBreadcrumbPath(req.params.id)
    res.json({ success: true, data: path })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
