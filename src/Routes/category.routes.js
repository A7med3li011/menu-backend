import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  getCategoryByid,
} from "../controllers/category.controller.js";
import { auth } from "../middleware/auth/auth.js";
import { checkRole } from "../middleware/auth/roleAuth.js";
import { multer4server } from "../services/multer.js";
import { validate } from "../middleware/validation/execution.js";
import {
  categorySchema,
  updateCategorySchema,
} from "../middleware/validation/schema.js";

const categoryRoutes = express.Router();

categoryRoutes.post(
  "/",
  multer4server().single("image"),
  validate(categorySchema),
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  createCategory
);
categoryRoutes.put(
  "/:id",
  multer4server().single("image"),
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  updateCategory
);
categoryRoutes.delete(
  "/:id",
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  deleteCategory
);
categoryRoutes.get(
  "/",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getCategories
);
categoryRoutes.get(
  "/:id",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getCategoryByid
);
export default categoryRoutes;
