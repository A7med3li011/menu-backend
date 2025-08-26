import mongoose from "mongoose";
import offerModel from "../../DataBase/models/offer.model.js";
import productModel from "../../DataBase/models/product.model.js";
import orderMdoel from "../../DataBase/models/order.mdoel.js";
import { customAlphabet } from "nanoid";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createOffer = handlerAsync(async (req, res, next) => {
  const { title, description, priceAfterDiscount } = req.body;
  const items = JSON.parse(req.body.items);

  if (!title || !description || !priceAfterDiscount) {
    return next(
      new AppError(
        "Title, description, and priceAfterDiscount are required",
        400
      )
    );
  }

  if (!items || items.length === 0) {
    return next(new AppError("At least one product is required", 400));
  }

  if (!req.file || !req.file.filename) {
    return next(new AppError("Image file is required", 400));
  }

  // Validate items array contains valid product IDs
  const validItems = items.filter(
    (item) => item && (typeof item === "string" || item._id)
  );
  if (validItems.length !== items.length) {
    return next(new AppError("All items must have valid product IDs", 400));
  }

  const existingProducts = await productModel.find({
    _id: { $in: items.map((i) => i) },
  });

  if (existingProducts.length !== items.length) {
    return next(
      new AppError(
        "One or more products do not exist in the product collection",
        404
      )
    );
  }

  const price = parseFloat(priceAfterDiscount);
  if (isNaN(price) || price < 0) {
    return next(
      new AppError("Price after discount must be a valid positive number", 400)
    );
  }

  const offer = await offerModel.create({
    title,
    image: req.file.filename,
    description,
    items: items,
    priceAfterDiscount: price,
  });

  res.status(201).json({
    success: true,
    message: "Offer created successfully",
    data: {
      offer,
    },
  });
});

export const getAllOffer = handlerAsync(async (req, res, next) => {
  const offer = await offerModel.find().populate("items", "title image price");

  if (!offer || offer.length === 0) {
    return next(new AppError("No offer exist"));
  }

  res.status(200).json({
    message: "offers retreived successfully",
    result: offer.length,
    data: offer,
  });
});

export const getOffer = handlerAsync(async (req, res, next) => {
  const offerId = req.params.offerId;
  const offer = await offerModel
    .findById(offerId)
    .populate("items", "title image price");

  if (!offer) {
    return next(new AppError("offer not found", 404));
  }

  res.status(200).json({
    message: "offer retrieved successfully",
    data: offer,
  });
});

export const deactiveOffer = handlerAsync(async (req, res, next) => {
  const offerId = req.params.offerId;
  const offer = await offerModel.findByIdAndUpdate(
    offerId,
    { isActive: false },
    { new: true }
  );
  if (!offer) {
    return next(new AppError("Offer not found", 404));
  }

  res.status(200).json({ message: "Offer deactivated successfully" });
});

export const activeOffer = handlerAsync(async (req, res, next) => {
  const offerId = req.params.offerId;
  const offer = await offerModel.findByIdAndUpdate(
    offerId,
    { isActive: true },
    { new: true }
  );
  if (!offer) {
    return next(new AppError("Offer not found", 404));
  }

  res.status(200).json({ message: "Offer activated successfully" });
});

export const updateOffer = handlerAsync(async (req, res, next) => {
  const offerId = req.params.offerId;
  if (!req.file) return next(new AppError("image is required", 400));

  const offer = await offerModel.findByIdAndUpdate(
    offerId,
    { ...req.body, image: req.file.filename },
    {
      new: true,
    }
  );
  if (!offer) {
    return next(new AppError("Offer not found", 404));
  }

  res.status(201).json({ message: "offer updated successfully" });
});

export const createOrderOffer = handlerAsync(async (req, res, next) => {
  const {
    customer,
    offerId,
    orderType,
    location,
    locationMap,
    fromApp = false,
  } = req.body;

  const location1 =
    typeof location === "string" ? JSON.parse(location) : location;

  if (!customer || !offerId || !orderType) {
    return next(
      new AppError("Customer, offerId, and orderType are required", 400)
    );
  }

  // Validate orderType
  const validOrderTypes = ["delivery", "dine-in", "pickup"];
  if (!validOrderTypes.includes(orderType)) {
    return next(
      new AppError("Order type must be delivery, dine-in, or pickup", 400)
    );
  }

  if (!location || !locationMap) {
    return next(
      new AppError(
        "Location and Location Map is required for delivery orders",
        400
      )
    );
  }

  if (orderType === "delivery" && !location) {
    return next(new AppError("Location is required for delivery orders", 400));
  }

  const offer = await offerModel
    .findById(offerId)
    .populate("items", "title price");

  if (!offer) {
    return next(new AppError("Offer not found", 404));
  }

  if (!offer.isActive) {
    return next(new AppError("This offer is no longer active", 400));
  }

  // Generate order number
  const nanoidNumber = customAlphabet("0123456789", 6);
  const randomNumber = nanoidNumber();

  const items = offer.items.map((product) => ({
    product: product._id,
    productType: "offer",
    quantity: 1,
    notes: "",
    customizations: {
      extras: [],
      removals: [],
      extrasWithPrices: [],
    },
    innerStatus: "pending",
    _id: new mongoose.Types.ObjectId(),
  }));

  const totalPrice = offer.priceAfterDiscount;

  const orderData = {
    customer,
    items,
    totalPrice,
    orderType,
    status: "pending",
    paymentStatus: "unpaid",
    OrderNumber: randomNumber,
    location: orderType === "delivery" ? location1 : undefined,
    locationMap,
    fromApp,
    Offer: offerId,
  };

  if (req.body.table && orderType === "dine-in") {
    orderData.table = req.body.table;
  }

  const order = await orderMdoel.create(orderData);

  const populatedOrder = await orderMdoel
    .findById(order._id)
    .populate("customer", "name email")
    .populate("items.product", "title price image")
    .populate("table", "title")
    .populate("Offer", "title description");

  res.status(201).json({
    success: true,
    message: "Order created successfully with offer",
    data: populatedOrder,
  });
});
