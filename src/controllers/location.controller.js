import locationModel from "../../DataBase/models/location.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createLocation = handlerAsync(async (req, res, next) => {
  const { name, deliveryPrice, lat, lng, isActive } = req.body;
  if (!name || lat == undefined || lng == undefined) {
    return next(new AppError("name, lat and lng are required", 400));
  }

  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    return next(
      new AppError("Latitude must be a number between -90 and 90", 400)
    );
  }

  if (typeof lng !== "number" || lng < -180 || lng > 180) {
    return next(
      new AppError("Longitude must be a number between -180 and 180", 400)
    );
  }

  if (
    deliveryPrice !== undefined &&
    (typeof deliveryPrice !== "number" || deliveryPrice < 0)
  ) {
    return next(new AppError("Delivery price must be a positive number", 400));
  }

  const location = await locationModel.create({
    name,
    deliveryPrice,
    lat,
    lng,
    isActive,
  });

  res
    .status(201)
    .json({ message: "location created successfully", data: location });
});

export const deleteLocation = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const location = await locationModel.findByIdAndDelete(id);

  if (!id) {
    return next(new AppError("Invalid location ID", 400));
  }

  if (!location) {
    return next(new AppError("location not found", 404));
  }

  res
    .status(200)
    .json({ message: "location deleted successfully", data: location });
});

export const updateLocation = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!req.body.deliveryPrice) {
    return next(new AppError("delivery price is required !", 400));
  }
  if (req.body.deliveryPrice < 0) {
    return next(new AppError("delivery price cannot be negative !", 400));
  }

  const location = await locationModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!id) {
    return next(new AppError("Invalid location ID", 400));
  }

  if (!location) {
    return next(new AppError("location not found", 404));
  }

  res
    .status(200)
    .json({ message: "location updated successfully", data: location });
});

export const getLocation = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError("Invalid location ID", 400));
  }

  const location = await locationModel.findById(id);

  if (!location) {
    return next(new AppError("location not found", 404));
  }

  res
    .status(200)
    .json({ message: "location retrieved successfully", data: location });
});

export const getAllLocation = handlerAsync(async (req, res, next) => {
  const locations = await locationModel.find();

  res.status(200).json({
    message: "locations retrieved successfully",
    data: locations,
  });
});
