import express from "express";
import * as taskController from "./task.controller.js";
import * as commentController from "../comment/comment.controller.js";
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
router.get(
  "/drafts",
  requirePermission(PERMISSIONS.CREATE_TASK),
  taskController.getDraftList,
);
router.post(
  "/drafts",
  requirePermission(PERMISSIONS.CREATE_TASK),
  taskController.saveDraft,
);
router.patch(
  "/drafts/:id",
  requirePermission(PERMISSIONS.CREATE_TASK),
  taskController.updateDraft,
);
router.post(
  "/drafts/:id/publish",
  requirePermission(PERMISSIONS.CREATE_TASK),
  taskController.publishDraft,
);
router.delete(
  "/drafts/:id",
  requirePermission(PERMISSIONS.CREATE_TASK),
  taskController.removeDraft,
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

router.get(
  "/:taskId/comments",
  requirePermission(PERMISSIONS.VIEW_TASK),
  commentController.getAll,
);

router.post(
  "/:taskId/comments",
  requirePermission(PERMISSIONS.CREATE_COMMENT),
  commentController.add,
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.DELETE_TASK),
  taskController.remove,
);

// Task Visibility Management
router.patch(
  "/:id/visibility",
  requirePermission(PERMISSIONS.EDIT_TASK),
  taskController.updateVisibility,
);

router.post(
  "/:id/visibility/users",
  requirePermission(PERMISSIONS.EDIT_TASK),
  taskController.addVisibilityUsers,
);

router.delete(
  "/:id/visibility/users",
  requirePermission(PERMISSIONS.EDIT_TASK),
  taskController.removeVisibilityUsers,
);

export default router;
