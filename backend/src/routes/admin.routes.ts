import express from 'express';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth';
import * as ctrl from '../controllers/admin.controller';

const r = express.Router();
r.post('/login', ctrl.login);
r.get('/me', requireAdmin, ctrl.me);

// Team management — super admin only
r.get('/admins', requireSuperAdmin, ctrl.listAdmins);
r.post('/admins', requireSuperAdmin, ctrl.createAdmin);
r.delete('/admins/:id', requireSuperAdmin, ctrl.deleteAdmin);
r.patch('/admins/:id/password', requireSuperAdmin, ctrl.updateAdminPassword);

export default r;
