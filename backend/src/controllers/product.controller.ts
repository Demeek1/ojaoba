import { Request, Response } from 'express';
import * as shopify from '../services/shopify.service';

export const getCategories = async (_req: Request, res: Response) => {
  try { res.json(await shopify.getCategories()); }
  catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string||'1'));
    const category = req.query.category as string|undefined;
    const search = req.query.search as string|undefined;
    if (search) {
      const results = await shopify.searchProducts(search, 24);
      res.json({ products: results, total: results.length, page: 1, totalPages: 1, category: `Search: ${search}` });
    } else if (category) {
      res.json({ ...(await shopify.getProductsByCategory(category, page, 12)), category });
    } else {
      res.json(await shopify.getAllProducts(page, 12));
    }
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const p = await shopify.getProduct(req.params.id);
    if (!p) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(p);
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};
