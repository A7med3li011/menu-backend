import reviewModel from "../../DataBase/models/review.model.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createReview = handlerAsync(async (req, res, next) => {
  const data = req.body;

  await reviewModel.create(data);

  res.status(201).json({ message: "review created successfully" });
});
export const getReviews = handlerAsync(async (req, res, next) => {
  const data = await reviewModel.find();

  res.status(201).json({ message: "review created successfully", data });
});
