import express from "express";
import {
  changeStatusSupplier,
  createSupplier,
  retrieveSupplier,
  retrieveSupplierbyId,
  updateSupplier,
} from "../controllers/supplier.controller.js";
import { auth } from "../middleware/auth/auth.js";
import { validate } from "../middleware/validation/execution.js";
import {
  createSupplierSchema,
  statusSupplierSchema,
} from "../middleware/validation/schema.js";

const supplierRoutes = express.Router();
supplierRoutes.post(
  "/",
  validate(createSupplierSchema),
  auth(["admin"]),
  createSupplier
);
supplierRoutes.put(
  "/:id",
  auth(["admin"]),
  validate(createSupplierSchema),
  updateSupplier
);
supplierRoutes.get("/", auth(["admin"]), retrieveSupplier);
supplierRoutes.get("/:id", auth(["admin"]), retrieveSupplierbyId);
supplierRoutes.patch(
  "/:id",
  auth(["admin"]),
  validate(statusSupplierSchema),
  changeStatusSupplier
);

export default supplierRoutes;
