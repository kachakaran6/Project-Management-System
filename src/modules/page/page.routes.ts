import express from 'express';
import * as pageController from './page.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', pageController.getAll);
router.post('/', pageController.create);
router.get('/:id', pageController.getById);
router.patch('/:id', pageController.update);
router.delete('/:id', pageController.remove);

export default router;
