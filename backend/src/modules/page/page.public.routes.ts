import express from 'express';
import * as pageController from './page.controller.js';

const router = express.Router();

router.get('/:slug', pageController.getPublicBySlug);

export default router;
