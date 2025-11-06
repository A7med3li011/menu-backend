import express from "express";
import {
  consumeInventory,
  createItem,
  deleteItem,
  getInventoryBatches,
  getItems,
  getItemsForPurchase,
  updateItem,
} from "../controllers/inventory.controller.js";
import { auth } from "../middleware/auth/auth.js";
import { validate } from "../middleware/validation/execution.js";
import {
  consumeInventorySchema,
  createInventoryItem,
  updateInventoryItem,
} from "../middleware/validation/schema.js";

const inventoryRoutes = express.Router();
inventoryRoutes.post(
  "/",
  auth(["admin"]),
  validate(createInventoryItem),
  createItem
);
inventoryRoutes.post(
  "/consume",
  auth(["admin", "staff", "operation"]),
  validate(consumeInventorySchema),
  consumeInventory
);
inventoryRoutes.get("/", auth(["admin"]), getItems);
inventoryRoutes.get("/items", auth(["admin"]), getItemsForPurchase);
inventoryRoutes.get("/batches/:id", auth(["admin"]), getInventoryBatches);
inventoryRoutes.put(
  "/:id",
  auth(["admin"]),
  validate(updateInventoryItem),
  updateItem
);
inventoryRoutes.delete("/:id", auth(["admin"]), deleteItem);

export default inventoryRoutes;
