import express from "express";

import { auth } from "../middleware/auth/auth.js";
import { checkRole } from "../middleware/auth/roleAuth.js";
import { multer4server } from "../services/multer.js";
import {
  addProduct,
  getProducts,
  getProductsbyId,
  getProductsbySub,
  updateProduct,
  getProductbestSaller,
  deleteProduct,
  getProductsbyMainCategory,
} from "../controllers/product.controller.js";

const proudctRoutes = express.Router();

proudctRoutes.post(
  "/",
  multer4server().single("image"),
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  addProduct
);
proudctRoutes.put(
  "/:id",
  multer4server().single("image"),
  auth(["admin", "operation"]),
  checkRole(["admin", "operation"]),
  updateProduct
);

proudctRoutes.get(
  "/",
  auth(["admin", "operation", "waiter", "customer"]),
  checkRole(["admin", "operation", "waiter", "customer"]),
  getProducts
);
proudctRoutes.get(
  "/bestSeller",
  auth(["admin", "operation", "waiter", "customer"]),
  checkRole(["admin", "operation", "waiter", "customer"]),
  getProductbestSaller
);

proudctRoutes.get(
  "/cat/:id",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getProductsbySub
);
proudctRoutes.get(
  "/category/:id",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getProductsbyMainCategory
);
proudctRoutes.get(
  "/:id",
  // auth(["admin", "operation", "waiter", "customer"]),
  // checkRole(["admin", "operation", "waiter", "customer"]),
  getProductsbyId
);

proudctRoutes.delete(
  "/:productId",
  auth(["admin", "operation", "waiter", "customer"]),
  checkRole(["admin", "operation", "waiter", "customer"]),
  deleteProduct
);

export default proudctRoutes;
