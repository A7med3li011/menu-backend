import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    tasteRating: {
      type: Number,
    },
    hygieneRating: {
      type: Number,
    },
    overallRating: {
      type: Number,
    },
    wouldComeBack: {
      type: Boolean,
    },
    mobileNumber: {
      type: String,
    },
    additionalComments: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const reviewModel = mongoose.model("reviews", reviewSchema);

export default reviewModel;
