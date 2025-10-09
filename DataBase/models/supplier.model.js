import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  code: {
    type: String,
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  status: {
    type: String,
    enum: ["active", "inActive"],
  },
  type: {
    type: String,
    enum: ["company", "individual", "distributor"],
  },

  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const supplierModel = mongoose.model("Supplier", supplierSchema);

export default supplierModel;
