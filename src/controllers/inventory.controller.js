import { customAlphabet } from "nanoid";
import inventoryModel from "../../DataBase/models/inventory.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";
import StockBatch from "../../DataBase/models/stockBatch.js";

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
export const getInventoryBatches = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if inventory item exists
  const inventory = await inventoryModel.findById(id);
  if (!inventory) return next(new AppError("Inventory item not found", 404));

  // Get all batches with purchase and supplier details
  const batches = await StockBatch.find({ inventoryId: id })
    .populate({
      path: "purchaseId",
      select: "invoiceNumber title totalAmount createdAt",
    })
    .populate({
      path: "supplierId",
      select: "name code type",
    })
    .sort({ createdAt: -1 }); // Most recent first

  // Calculate summary statistics
  const summary = {
    totalBatches: batches.length,
    activeBatches: batches.filter((b) => b.status === "active").length,
    depletedBatches: batches.filter((b) => b.status === "depleted").length,
    totalRemainingQuantity: batches.reduce(
      (sum, b) => sum + (b.remainingQuantity || 0),
      0
    ),
    totalOriginalQuantity: batches.reduce((sum, b) => sum + (b.quantity || 0), 0),
    totalConsumed: batches.reduce(
      (sum, b) => sum + (b.quantity - b.remainingQuantity),
      0
    ),
    currentAveragePrice: inventory.averagePrice,
    totalValue: inventory.totalValue,
  };

  // Format batches with additional calculated fields
  const formattedBatches = batches.map((batch) => ({
    _id: batch._id,
    purchaseInfo: {
      purchaseId: batch.purchaseId?._id,
      invoiceNumber: batch.purchaseId?.invoiceNumber,
      title: batch.purchaseId?.title,
      purchaseDate: batch.createdAt,
    },
    supplierInfo: {
      supplierId: batch.supplierId?._id,
      name: batch.supplierId?.name,
      code: batch.supplierId?.code,
      type: batch.supplierId?.type,
    },
    quantity: {
      original: batch.quantity,
      remaining: batch.remainingQuantity,
      consumed: batch.quantity - batch.remainingQuantity,
      consumedPercentage: ((batch.quantity - batch.remainingQuantity) / batch.quantity * 100).toFixed(2) + "%",
    },
    pricing: {
      unitCost: batch.unitCost,
      originalTotalValue: batch.quantity * batch.unitCost,
      currentTotalValue: batch.remainingQuantity * batch.unitCost,
    },
    status: batch.status,
    purchaseDate: batch.purchaseDate,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  }));

  res.status(200).json({
    message: "Batch history retrieved successfully",
    inventoryItem: {
      id: inventory._id,
      productName: inventory.productName,
      code: inventory.code,
      unit: inventory.unit,
      currentQuantity: inventory.quantity,
      status: inventory.status,
    },
    summary,
    batches: formattedBatches,
  });
});

export const consumeInventory = handlerAsync(async (req, res, next) => {
  const { items } = req.body; // [{ inventoryId, quantity }]

  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of items) {
      let remainingToConsume = item.quantity;

      // Get oldest batches first (FIFO)
      const batches = await StockBatch.find({
        inventoryId: item.inventoryId,
        status: "active",
        remainingQuantity: { $gt: 0 },
      })
        .sort({ createdAt: 1 }) // Oldest first (FIFO)
        .session(session);

      if (!batches.length) {
        throw new AppError(
          `No stock available for inventory item ${item.inventoryId}`,
          400
        );
      }

      // Check if we have enough stock
      const totalAvailable = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
      if (totalAvailable < remainingToConsume) {
        throw new AppError(
          `Insufficient stock. Available: ${totalAvailable}, Requested: ${remainingToConsume}`,
          400
        );
      }

      // Apply FIFO consumption
      for (const batch of batches) {
        if (remainingToConsume <= 0) break;

        const consumeFromBatch = Math.min(batch.remainingQuantity, remainingToConsume);

        batch.remainingQuantity -= consumeFromBatch;
        if (batch.remainingQuantity === 0) {
          batch.status = "depleted";
        }
        await batch.save({ session });

        remainingToConsume -= consumeFromBatch;
      }

      // Update inventory totals
      const inventory = await inventoryModel.findById(item.inventoryId).session(session);
      if (!inventory) {
        throw new AppError(`Inventory item ${item.inventoryId} not found`, 404);
      }

      inventory.quantity -= item.quantity;

      // Recalculate total value using remaining active batches
      const activeBatches = await StockBatch.find({
        inventoryId: item.inventoryId,
        status: "active",
      }).session(session);

      inventory.totalValue = activeBatches.reduce(
        (sum, b) => sum + b.remainingQuantity * b.unitCost,
        0
      );

      if (inventory.quantity > 0) {
        inventory.averagePrice = inventory.totalValue / inventory.quantity;
      } else {
        inventory.averagePrice = 0;
      }

      // Update status
      if (inventory.quantity === 0) inventory.status = "out-of-stock";
      else if (inventory.quantity <= 5) inventory.status = "low-stock";
      else inventory.status = "in-stock";

      inventory.updatedBy = req.user._id;
      await inventory.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Inventory consumed successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});
