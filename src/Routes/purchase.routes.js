import express from "express";
import {
  createPurchase,
  exportToInventory,
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
  validate(createPurchaseSchema),
  auth(["admin"]),
  createPurchase
);
purchaseRoutes.put("/:id",  validate(updatePurchaseSchema), auth(["admin"]), updatePurchase);
purchaseRoutes.put("/export/:id",  auth(["admin"]), exportToInventory);
purchaseRoutes.get("/supplier/:supplierId",  auth(["admin"]),getPurchasesBySupplier);
purchaseRoutes.get("/:id",  auth(["admin"]),getPurchaseById);

export default purchaseRoutes;
