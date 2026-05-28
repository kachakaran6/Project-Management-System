import express from 'express';
import * as pageController from './page.controller.v2.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', pageController.list);
router.post('/', pageController.create);
router.get('/:id/export.pdf', pageController.exportPdf);
router.get('/:id/versions', pageController.getVersions);
router.post('/:id/snapshots', pageController.createSnapshot);
router.get('/:id', pageController.getById);
router.patch('/:id', pageController.update);
router.delete('/:id', pageController.remove);

export default router;
