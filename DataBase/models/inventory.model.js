import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    unit: {
      type: String,
    },
    price: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["in-stock", "low-stock", "out-of-stock"],
      default: "in-stock",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const inventoryModel = mongoose.model("Inventory", inventorySchema);

export default inventoryModel;
