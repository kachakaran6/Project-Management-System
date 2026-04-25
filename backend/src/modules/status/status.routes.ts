import { Router } from "express";
import * as statusController from "./status.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", statusController.getStatuses);
router.post("/", requireRole(["ADMIN", "SUPER_ADMIN", "MANAGER"]), statusController.createStatus);
router.put("/reorder", requireRole(["ADMIN", "SUPER_ADMIN", "MANAGER"]), statusController.reorderStatuses);
router.put("/:id", requireRole(["ADMIN", "SUPER_ADMIN", "MANAGER"]), statusController.updateStatus);
router.delete("/:id", requireRole(["ADMIN", "SUPER_ADMIN", "MANAGER"]), statusController.deleteStatus);

export default router;
