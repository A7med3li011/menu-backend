import express from "express";
import {
  createItem,
  deleteItem,
  getItems,
  getItemsForPurchase,
  updateItem,
} from "../controllers/inventory.controller.js";
import { auth } from "../middleware/auth/auth.js";
import { validate } from "../middleware/validation/execution.js";
import {
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
inventoryRoutes.get("/", auth(["admin"]), getItems);
inventoryRoutes.get("/items", auth(["admin"]), getItemsForPurchase);
inventoryRoutes.put(
  "/:id",
  auth(["admin"]),
  validate(updateInventoryItem),
  updateItem
);
inventoryRoutes.delete("/:id", auth(["admin"]), deleteItem);

export default inventoryRoutes;
