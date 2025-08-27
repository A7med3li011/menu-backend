import mongoose from "mongoose";

const scetionSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const sectionModel = mongoose.model("Section", scetionSchema);

export default sectionModel;
