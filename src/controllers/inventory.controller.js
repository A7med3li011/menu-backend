import { customAlphabet } from "nanoid";
import inventoryModel from "../../DataBase/models/inventory.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createItem = handlerAsync(async (req, res, next) => {
  let data = req.body;

  const itemExist = await inventoryModel.findOne({
    productName: data.productName.toLowerCase(),
  });

  if (itemExist)
    return next(new AppError("there is item with the same name", 409));

  const nanoid = customAlphabet("0123456789", 10);

  let code = nanoid();

  while (await inventoryModel.findOne({ code })) {
    code = nanoid();
  }
  data = {
    ...data,
    productName: data.productName.toLowerCase(),
    unit: data.unit.toLowerCase(),
    createBy: req.user._id,
    status: "in-stock",
    code,
  };

  await inventoryModel.create(data);

  res.status(201).json({ message: "item created successfully" });
});

export const updateItem = handlerAsync(async (req, res, next) => {
  const data = req.body;
  const { id } = req.params;

  const itemExist = await inventoryModel.findById(id);

  if (!itemExist) return next(new AppError("item not found", 404));

  const preventConflict = await inventoryModel.findOne({
    $or: [
      { productName: data.productName.toLowerCase(), _id: { $ne: id } },
      { code: data.code.toLowerCase(), _id: { $ne: id } },
    ],
  });

  if (preventConflict)
    return next(new AppError("there is item with the same data"));

  await inventoryModel.findByIdAndUpdate(id, data);

  res.status(200).json({ message: "item updated successfully" });
});

export const deleteItem = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const item = await inventoryModel.findByIdAndDelete(id);

  if (!item) return next(new AppError("item not found", 404));

  res.status(200).json({ message: "item deleted successfully" });
});
export const getItems = handlerAsync(async (req, res, next) => {
  const data = await inventoryModel.find();

  res.status(200).json({ message: "data retrieved successfully", data });
});
export const getItemsForPurchase = handlerAsync(async (req, res, next) => {
  const search = req.query.search;
  let data = [];

  if (search) {
    data = await inventoryModel
      .find({
        productName: { $regex: search, $options: "i" }, // case-insensitive search
      })
      .select("productName"); // return only productName
  } else {
    data = await inventoryModel.find().select("productName").limit(5); // return first 5 items
  }

  res.status(200).json({
    message: "Data retrieved successfully",
    data,
  });
});
