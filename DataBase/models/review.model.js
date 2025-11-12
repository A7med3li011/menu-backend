import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    firstVisit: {
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
    howDidYouHear: {
      type: String,
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
