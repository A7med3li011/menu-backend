import express from "express";

import { auth } from "../middleware/auth/auth.js";
import { checkRole } from "../middleware/auth/roleAuth.js";
import { multer4server } from "../services/multer.js";
import { validate } from "../middleware/validation/execution.js";
import {
  createSubCategorySchema,
  updateSubCategorySchema,
} from "../middleware/validation/schema.js";
import {
  createSubCategory,
  deleteSubCategory,
  getSubCategories,
  updateSubCategory,
  getSubCategoriesbyCategory,
  getSubCategoryByid,
} from "../controllers/subCategory.controller.js";

const subCategoryRoutes = express.Router();

subCategoryRoutes.post(
  "/",
  multer4server().single("image"),
  validate(createSubCategorySchema),
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  createSubCategory
);
subCategoryRoutes.put(
  "/:subCategoryId",
  multer4server().single("image"),
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  updateSubCategory
);
subCategoryRoutes.delete(
  "/:id",
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  deleteSubCategory
);
subCategoryRoutes.get(
  "/",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getSubCategories
);
subCategoryRoutes.get(
  "/category/:categoryId",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getSubCategoriesbyCategory
);

subCategoryRoutes.get(
  "/:id",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getSubCategoryByid
);
export default subCategoryRoutes;
