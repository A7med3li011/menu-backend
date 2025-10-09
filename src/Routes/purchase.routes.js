import express from "express";
import {
  createPurchase,
  getPurchaseById,
  getPurchasesBySupplier,
  updatePurchase,
} from "../controllers/purchase.controller.js";
import { validate } from "../middleware/validation/execution.js";
import { createPurchaseSchema } from "../middleware/validation/schema.js";
import { auth } from "../middleware/auth/auth.js";

const purchaseRoutes = express.Router();

purchaseRoutes.post(
  "/",
  validate(createPurchaseSchema),
  auth(["admin"]),
  createPurchase
);
purchaseRoutes.put("/", updatePurchase);
purchaseRoutes.get("/supplier/:supplierId", getPurchasesBySupplier);
purchaseRoutes.get("/:id", getPurchaseById);

export default purchaseRoutes;
