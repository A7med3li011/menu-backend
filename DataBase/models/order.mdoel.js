import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    home: { type: String, trim: true },
    street: { type: String, trim: true },
    region: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    Offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        customProduct: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CustomProduct",
        },
        productType: {
          type: String,
          enum: ["regular", "custom product", "offer"],

          // required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        notes: {
          type: String,
          default: "",
        },
        customizations: {
          extras: [{ type: String }],
          removals: [{ type: String }],
          extrasWithPrices: [
            {
              id: String,
              name: String,
              price: String,
            },
          ],
        },
        specialInstructions: String,
        innerStatus: {
          type: String,
          enum: ["pending", "preparing", "ready", "completed", "cancelled"],
          default: "pending",
        },
      },
    ],

    totalPrice: {
      type: Number,
      required: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table", // or 'Product' if it's a generic store
    },
    guestCount: {
      type: Number,
    },
    orderType: {
      type: String,
      enum: ["dine-in", "takeaway", "delivery"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "preparing",
        "ready",
        "completed",
        "cancelled",
        "checkout",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    OrderNumber: {
      type: String,
    },
    location: AddressSchema,
    locationMap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    // createdBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Employee", // if staff create orders
    // },
    fromApp: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Custom validation for items
orderSchema.pre("validate", function (next) {
  if (this.items && this.items.length > 0) {
    for (const item of this.items) {
      if (item.productType === "regular" && !item.product) {
        return next(new Error("Product is required for regular items"));
      }
      if (item.productType === "custom" && !item.customProduct) {
        return next(new Error("Custom product is required for custom items"));
      }
    }
  }
  next();
});

export default mongoose.model("Order", orderSchema);
