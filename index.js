import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import connection from "./DataBase/connection.js";
import { AppError } from "./src/utilities/AppError.js";
import userRoutes from "./src/Routes/user.routes.js";

import categoryRoutes from "./src/Routes/category.routes.js";
import subCategoryRoutes from "./src/Routes/subCategory.routes.js";
import proudctRoutes from "./src/Routes/product.routes.js";
import kitchenRotes from "./src/Routes/kitchen.routes.js";
import orderRoutes from "./src/Routes/order.routes.js";
import tablesRoutes from "./src/Routes/tables.routes.js";
import extraRoutes from "./src/Routes/extra.routes.js";
import wishlistRoutes from "./src/Routes/wishlist.routes.js";
import offerRoutes from "./src/Routes/offer.routes.js";
import ingredientRoutes from "./src/Routes/ingredient.routes.js";
import customProductRoutes from "./src/Routes/customProduct.routes.js";
import locationRoutes from "./src/Routes/location.routes.js";
import sectionRoutes from "./src/Routes/section.routes.js";
import supplierRoutes from "./src/Routes/supplier.routes.js";
import inventoryRoutes from "./src/Routes/inventory.routes.js";
import purchaseRoutes from "./src/Routes/purchase.routes.js";
import reviewRoutes from "./src/Routes/review.routes.js";

connection();
const app = express();
app.use(cors());
app.use(express.json());

// Make 'uploads' folder publicly accessible
app.use("/uploads", express.static("uploads"));

app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/subcategory", subCategoryRoutes);
app.use("/api/v1/product", proudctRoutes);
app.use("/api/v1/kitchen", kitchenRotes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/tables", tablesRoutes);
app.use("/api/v1/products", extraRoutes);
app.use("/api/v1/wishlists", wishlistRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/ingredients", ingredientRoutes);
app.use("/api/v1/custom-products", customProductRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/section", sectionRoutes);
app.use("/api/v1/supplier", supplierRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/review", reviewRoutes);

// handle foriegn routes
app.all("*", (req, res, next) => {
  next(new AppError(`invalid url ${req.originalUrl}`, 404));
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status || "error",
    message: err.message || "Something went wrong",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
console.log("Environment Port:", process.env.Port);
const myport = process.env.PORT || 4000;
app.listen(myport, () => {
  console.log(`server on port ${myport} `);
});
