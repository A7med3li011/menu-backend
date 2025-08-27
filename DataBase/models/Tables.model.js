import mongoose from "mongoose";

const tablesSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  image: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Available", "Occupied", "Reserved"],
    default: "Available",
  },
  section: {
    type: mongoose.Types.ObjectId,
    ref: "Section",
  },
});

const tableModel = mongoose.model("Table", tablesSchema);

export default tableModel;
