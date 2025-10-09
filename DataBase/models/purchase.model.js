import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  supplierId: {
    type: mongoose.Types.ObjectId,
    ref: "Supplier",
  },
  items: [
    {
      inventoryId: {
        type: mongoose.Types.ObjectId,
        ref: "Inventory",
      },
      quantity: Number,
      price: Number,
      total: Number,
    },
  ],

  invoiceNumber: {
    type: String,
  },
  totalAmount: {
    type: Number,
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  dueAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ["paid", "partial", "pending"],
    default: "pending",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
});

const purchaseModel = mongoose.model("Purchase", purchaseSchema);

export default purchaseModel;
