import mongoose, { mongo } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    password: { type: String },
    pic: { type: String },
    phone: { type: String },
    salary: { type: Number },
    shiftFrom: { type: String },
    shiftTo: { type: String },
    address: { type: String },
    age: { type: Number },
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],

    role: {
      type: String,
      enum: ["admin", "staff", "customer", "operation", "waiter"],
      default: "customer",
    },
    permissions: [{ type: String }],
    sections: [{ type: mongoose.Schema.ObjectId, ref: "Section" }],
  },

  { timestamps: true }
);

const userModel = mongoose.model("User", userSchema);
export default userModel;
