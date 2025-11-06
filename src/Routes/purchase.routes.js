import express from "express";
import {
  createPurchase,
  deletePurchase,
  getPurchaseById,
  getPurchasesBySupplier,
  updatePurchase,
} from "../controllers/purchase.controller.js";
import { validate } from "../middleware/validation/execution.js";
import { createPurchaseSchema, updatePurchaseSchema } from "../middleware/validation/schema.js";
import { auth } from "../middleware/auth/auth.js";

const purchaseRoutes = express.Router();

purchaseRoutes.post(
  "/",
  auth(["admin"]),
  validate(createPurchaseSchema),
  createPurchase
);
purchaseRoutes.put(
  "/:id",
  auth(["admin"]),
  validate(updatePurchaseSchema),
  updatePurchase
);
purchaseRoutes.delete(
  "/:id",
  auth(["admin"]),
  deletePurchase
);
purchaseRoutes.get(
  "/supplier/:supplierId",
  auth(["admin"]),
  getPurchasesBySupplier
);
purchaseRoutes.get(
  "/:id",
  auth(["admin"]),
  getPurchaseById
);

export default purchaseRoutes;
