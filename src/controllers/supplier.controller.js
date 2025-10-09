import supplierModel from "../../DataBase/models/supplier.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createSupplier = handlerAsync(async (req, res, next) => {
  const { name, email, code, phone, address, type } = req.body;

  const [emailExist, phoneExist, codeExist] = await Promise.all([
    supplierModel.findOne({ email }),
    supplierModel.findOne({ phone }),
    supplierModel.findOne({ code }),
  ]);

  if (emailExist)
    return next(new AppError("there is a supplier with the same email", 409));
  if (phoneExist)
    return next(new AppError("there is a supplier with the same phone", 409));
  if (codeExist)
    return next(new AppError("there is a supplier with the same code", 409));

  const newSupplier = await supplierModel.create({
    name,
    email,
    phone,
    code,
    address,
    type,
    status: "active",
    createdBy: req.user._id,
  });

  res.status(201).json({ message: "supplier created successfully" });
});
export const updateSupplier = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, code, phone, address, type } = req.body;

  const [emailExist, phoneExist, codeExist] = await Promise.all([
    supplierModel.findOne({ email, _id: { $ne: id } }),
    supplierModel.findOne({ phone, _id: { $ne: id } }),
    supplierModel.findOne({ code, _id: { $ne: id } }),
  ]);

  if (emailExist)
    return next(new AppError("there is a supplier with the same email", 409));
  if (phoneExist)
    return next(new AppError("there is a supplier with the same phone", 409));
  if (codeExist)
    return next(new AppError("there is a supplier with the same code", 409));

  const newSupplier = await supplierModel.findByIdAndUpdate(id, {
    name,
    email,
    phone,
    code,
    address,
    type,
  });

  res.status(201).json({ message: "supplier updated successfully" });
});

export const retrieveSupplier = handlerAsync(async (req, res, next) => {
  const data = await supplierModel.find();

  res.status(200).json({ message: "data retrieved successfully", data });
});
export const retrieveSupplierbyId = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const data = await supplierModel.findById(id);

  if (!data) return next(new AppError("supplier is not found", 404));

  res.status(200).json({ message: "data retrieved successfully", data });
});
export const changeStatusSupplier = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const supExist = await supplierModel.findByIdAndUpdate(id, { status });
  if (!supExist) return res.status(404).json({ message: "supplier not found" });

  res.status(200).json({ message: `supplier update successfully` });
});
