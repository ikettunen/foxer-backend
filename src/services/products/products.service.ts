import pool from '../../config/db'

export const listProducts = async (filters: { category?: string; subcategory?: string; search?: string; page?: number; limit?: number }) => {
  // TODO: build dynamic WHERE clause from filters
  const [rows] = await pool.query('SELECT * FROM products WHERE active = 1 LIMIT 100')
  return rows
}

export const listCategories = async () => {
  const [rows] = await pool.query('SELECT DISTINCT category, subcategory FROM products WHERE active = 1 ORDER BY category, subcategory')
  return rows
}

export const getProductById = async (id: string) => {
  const [rows]: any = await pool.query('SELECT * FROM products WHERE id = ?', [id])
  return rows[0] || null
}

export const createProduct = async (data: any) => {
  const [result]: any = await pool.query('INSERT INTO products SET ?', [data])
  return { id: result.insertId, ...data }
}

export const updateProduct = async (id: string, data: any) => {
  await pool.query('UPDATE products SET ? WHERE id = ?', [data, id])
  return getProductById(id)
}

export const deactivateProduct = async (id: string) => {
  await pool.query('UPDATE products SET active = 0 WHERE id = ?', [id])
}
