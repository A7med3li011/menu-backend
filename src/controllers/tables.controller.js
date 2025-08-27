import sectionModel from "../../DataBase/models/section.model.js";
import tableModel from "../../DataBase/models/Tables.model.js";
import userModel from "../../DataBase/models/user.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createTable = handlerAsync(async (req, res, next) => {
  const { title, section } = req.body;

  if (!title) return next(new AppError("title is required", 400));
  if (!section) return next(new AppError("section is required", 400));
  const tableExist = await tableModel.findOne({ title });

  if (tableExist) return next(new AppError("table already exist", 400));

  const sectionExist = await sectionModel.findById(section);
  if (!sectionExist) return next(new AppError("section not found", 404));

  await tableModel.create({
    title,
    section,
    createdBy: req.user._id,
    image: req.file.filename,
  });

  res.status(201).json({ message: "table created successfully" });
});

export const getTables = handlerAsync(async (req, res, next) => {
  const query = {};

  if (req.user.role === "waiter") {
    const user = await userModel.findById(req.user._id).select("sections -_id");
    

      query.section = { $in: user.sections };
    
  }

  const data = await tableModel.find(query).populate("section", "title");

  res.status(200).json({ message: "table found successfully", data });
});

export const updateTable = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const tableExits = await tableModel.findById(id);
  if (!tableExits) return next("table not found", 404);

  tableExits.status = status;
  await tableExits.save();

  res.status(200).json({ message: "table updated successfully" });
});
