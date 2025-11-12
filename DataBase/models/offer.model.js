import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "image is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const offerModel = mongoose.model("Offer", offerSchema);

export default offerModel;
