import express from 'express';
import { requireAdmin, requirePermission } from '../middleware/auth';
import * as ctrl from '../controllers/admin.controller';

const r = express.Router();

// Public
r.post('/login', ctrl.login);

// Authenticated — any active admin
r.get('/me', requireAdmin, ctrl.me);
r.post('/change-password', requireAdmin, ctrl.changeMyPassword);

// Staff & permission management — requires manage_staff
r.get('/staff',        requireAdmin, requirePermission('manage_staff'), ctrl.listStaff);
r.post('/staff',       requireAdmin, requirePermission('manage_staff'), ctrl.createStaff);
r.patch('/staff/:id',  requireAdmin, requirePermission('manage_staff'), ctrl.updateStaff);
r.delete('/staff/:id', requireAdmin, requirePermission('manage_staff'), ctrl.deleteStaff);

// Audit log — requires manage_staff (security oversight)
r.get('/audit', requireAdmin, requirePermission('manage_staff'), ctrl.listAudit);

// Customer behaviour analytics — requires view_analytics
r.get('/behavior', requireAdmin, requirePermission('view_analytics'), ctrl.behavior);

export default r;
