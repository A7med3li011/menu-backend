import mongoose from "mongoose";

const stockBatchSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    // ADD THIS FIELD
    status: {
      type: String,
      enum: ["active", "depleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ADD THIS INDEX for FIFO queries (oldest first)
stockBatchSchema.index({ inventoryId: 1, purchaseDate: 1 });

const StockBatch = mongoose.model("StockBatch", stockBatchSchema);
export default StockBatch;
