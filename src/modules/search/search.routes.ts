import express from "express";
import * as searchController from "./search.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", searchController.search);

export default router;
