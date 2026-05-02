import express from 'express';
import { requireAdmin } from '../middleware/auth';
import * as ctrl from '../controllers/admin.controller';

const r = express.Router();
r.post('/login', ctrl.login);
r.get('/me', requireAdmin, ctrl.me);
export default r;
