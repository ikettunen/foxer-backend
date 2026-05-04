import { Request, Response, NextFunction } from 'express'
import * as service from './products.service'

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, subcategory, search, page, limit } = req.query
    const result = await service.listProducts({ category, subcategory, search, page, limit } as any)
    res.json(result)
  } catch (e) { next(e) }
}

export const listCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.listCategories())
  } catch (e) { next(e) }
}

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.getProductById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Not Found' })
    res.json(product)
  } catch (e) { next(e) }
}

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await service.createProduct(req.body))
  } catch (e) { next(e) }
}

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.updateProduct(req.params.id, req.body))
  } catch (e) { next(e) }
}

export const deactivateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deactivateProduct(req.params.id)
    res.status(204).send()
  } catch (e) { next(e) }
}
