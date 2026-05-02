import express from 'express';
import * as ctrl from '../controllers/product.controller';

const r = express.Router();
r.get('/categories', ctrl.getCategories);
r.get('/', ctrl.getProducts);
r.get('/:id', ctrl.getProductById);
export default r;
