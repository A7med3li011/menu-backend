import express from "express";
import { auth } from "../middleware/auth/auth.js";
import { checkRole } from "../middleware/auth/roleAuth.js";
import {
  createSections,
  deletedSection,
  getSections,
  getTablesBySection,
  updateSection,
} from "../controllers/section.controller.js";

const sectionRoutes = express.Router();

sectionRoutes.post(
  "/",
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  createSections
);
sectionRoutes.put(
  "/:id",
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  updateSection
);
sectionRoutes.delete(
  "/:id",
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  deletedSection
);
sectionRoutes.get(
  "/",
  auth(["admin", "operation", "waiter", "staff"]),
  checkRole(["admin", "operation", "waiter", "staff "]),
  getSections
);
sectionRoutes.get(
  "/:id",
  auth(["admin", "operation", "waiter", "staff"]),
  checkRole(["admin", "operation", "waiter", "staff "]),
  getTablesBySection
);
export default sectionRoutes;
