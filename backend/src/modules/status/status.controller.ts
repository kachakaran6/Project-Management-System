import { Request, Response, NextFunction } from "express";
import * as statusService from "./status.service.js";

export const getStatuses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }
    const statuses = await statusService.getStatuses(organizationId);
    res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    next(error);
  }
};

export const createStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }
    const status = await statusService.createStatus({
      ...req.body,
      organizationId,
      createdBy: (req as any).user.id,
    });
    res.status(201).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const status = await statusService.updateStatus(id as string, req.body);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

export const reorderStatuses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reorderData } = req.body;
    if (!Array.isArray(reorderData)) {
      return res.status(400).json({ success: false, message: "reorderData must be an array" });
    }
    await statusService.reorderStatuses(reorderData);
    res.status(200).json({ success: true, message: "Statuses reordered successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await statusService.deleteStatus(id as string);
    res.status(200).json({ success: true, message: "Status deleted successfully" });
  } catch (error) {
    next(error);
  }
};
