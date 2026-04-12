import express from "express";
import * as taskController from "./task.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../../constants/index.js";

const router = express.Router();

router.use(requireAuth);

// All task operations require VIEW_PROJECT or CREATE_TASK permissions scoped by organization
router.get(
  "/",
  requirePermission(PERMISSIONS.VIEW_TASK),
  taskController.getAll,
);
router.post(
  "/",
  requirePermission(PERMISSIONS.CREATE_TASK),
  taskController.create,
);
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EDIT_TASK),
  taskController.update,
);
router.post(
  "/:id/assign",
  requirePermission(PERMISSIONS.EDIT_TASK),
  taskController.assign,
);
router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.EDIT_TASK),
  taskController.changeStatus,
);
router.get(
  "/:id",
  requirePermission(PERMISSIONS.VIEW_TASK),
  taskController.getById,
);
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.DELETE_TASK),
  taskController.remove,
);

export default router;
