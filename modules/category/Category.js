import prisma from "../../config/database.js"

export class CategoryModel {
  static async findAll() {
    return prisma.category.findMany()
  }

  static async findById(id) {
    return prisma.category.findUnique({ where: { id: Number(id) } })
  }

  static async findBySlug(slug) {
    return prisma.category.findUnique({ where: { slug } })
  }

  static async create(data) {
    return prisma.category.create({ data })
  }

  static async update(id, data) {
    return prisma.category.update({
      where: { id: Number(id) },
      data,
    })
  }

  static async delete(id) {
    return prisma.category.delete({ where: { id: Number(id) } })
  }

  static async getSubcategories(parentId) {
    return prisma.category.findMany({ where: { parentId: Number(parentId) } })
  }

  static async getCategoryTree(parentId = null) {
    const categories = await prisma.category.findMany({
      where: { parentId },
      include: { children: true },
    })

    return Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        children: await CategoryModel.getCategoryTree(cat.id),
      }))
    )
  }

  static async getBreadcrumbPath(id) {
    let path = []
    let current = await prisma.category.findUnique({ where: { id: Number(id) } })

    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
      })
      if (current.parentId) {
        current = await prisma.category.findUnique({ where: { id: current.parentId } })
      } else {
        current = null
      }
    }
    return path
  }
}
