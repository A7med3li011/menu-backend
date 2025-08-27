import sectionModel from "../../DataBase/models/section.model.js";
import tableModel from "../../DataBase/models/Tables.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createSections = handlerAsync(async (req, res, next) => {
  const { title } = req.body;

  if (!title) return next(new AppError("title is required", 400));

  const sectionExist = await sectionModel.findOne({
    title: title.toLowerCase(),
  });

  if (sectionExist) return next(new AppError("section already exist", 409));

  await sectionModel.create({
    title: title.toLowerCase(),
    createdBy: req.user._id,
  });
  res.status(201).json({ message: "section created successfully" });
});
export const updateSection = handlerAsync(async (req, res, next) => {
  const { title } = req.body;
  const { id } = req.params;

  if (!title) return next(new AppError("title is required", 400));

  const sectionFound = await sectionModel.findById(id);
  if (!sectionFound) return next(new AppError("section not found", 404));

  const sectionExist = await sectionModel.findOne({
    title: title.toLowerCase(),
    _id: { $ne: id },
  });

  if (sectionExist) return next(new AppError("section already exist", 409));

  await sectionModel.findByIdAndUpdate(id, {
    title: title.toLowerCase(),
  });
  res.status(200).json({ message: "section updated successfully" });
});
export const deletedSection = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const sectionFound = await sectionModel.findById(id);
  if (!sectionFound) return next(new AppError("section not found", 404));

  await sectionModel.findByIdAndDelete(id);
  res.status(200).json({ message: "section deleted successfully" });
});
export const getSections = handlerAsync(async (req, res, next) => {
  const sections = await sectionModel.find().lean();

  res
    .status(200)
    .json({ message: "section fetched successfully", data: sections });
});
export const getTablesBySection = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const sectionFound = await sectionModel.findById(id);
  if (!sectionFound) return next(new AppError("section not found", 404));
  const data = await tableModel
    .find({ section: id })
    .populate("section", "title")
    .lean();

  res.status(200).json({ message: "section fetched successfully", data });
});
