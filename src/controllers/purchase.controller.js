import { customAlphabet } from "nanoid";
import inventoryModel from "../../DataBase/models/inventory.model.js";
import supplierModel from "../../DataBase/models/supplier.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";
import purchaseModel from "../../DataBase/models/purchase.model.js";
import StockBatch from "../../DataBase/models/stockBatch.js";
import mongoose from "mongoose";

export const createPurchase = handlerAsync(async (req, res, next) => {
  const { title, supplierId, items, paidAmount } = req.body;

  // Start MongoDB session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Validate Supplier
    const supplierExist = await supplierModel.findById(supplierId).session(session);
    if (!supplierExist) throw new AppError("Supplier not found", 404);
    if (supplierExist.status === "inActive")
      throw new AppError("Please activate supplier before making purchase", 400);

    // 2️⃣ Validate Items
    const checkingItems = await Promise.all(
      items.map(async (ele, index) => {
        const itemExist = await inventoryModel.findById(ele.inventoryId).session(session);
        if (!itemExist) {
          throw new AppError(`Item number ${index + 1} not found in inventory`, 404);
        }
        return itemExist;
      })
    );

    // 3️⃣ Build Purchase Object
    let newPurchase = { title, supplierId, items };

    const estimatedPrice = items.reduce(
      (acc, curr) => acc + Number(curr.price * curr.quantity),
      0
    );

    if (Number(estimatedPrice) === Number(paidAmount)) {
      newPurchase = {
        ...newPurchase,
        paidAmount,
        dueAmount: 0,
        paymentStatus: "paid",
      };
    } else if (Number(estimatedPrice) > Number(paidAmount)) {
      newPurchase = {
        ...newPurchase,
        paidAmount,
        dueAmount: Number(estimatedPrice) - Number(paidAmount),
        paymentStatus: "partial",
      };
    } else {
      throw new AppError("Paid amount is larger than total cost", 400);
    }

    const nanoId = customAlphabet("123456789", 7);
    newPurchase.invoiceNumber = nanoId();
    newPurchase.totalAmount = estimatedPrice; // ✅ ADDED

    // 4️⃣ Create Purchase
    const [purchaseDoc] = await purchaseModel.create([newPurchase], { session });

    // 5️⃣ Create Stock Batches + Update Inventory (FIFO)
    for (const item of items) {
      const inventory = checkingItems.find(
        (inv) => inv._id.toString() === item.inventoryId
      );

      // Create Stock Batch for FIFO tracking
      await StockBatch.create(
        [
          {
            inventoryId: item.inventoryId,
            purchaseId: purchaseDoc._id,
            supplierId,
            quantity: item.quantity,
            remainingQuantity: item.quantity,
            unitCost: item.price,
            status: "active", // ✅ ADDED
          },
        ],
        { session }
      );

      // ✅ UPDATE INVENTORY WITH FIFO LOGIC
      const itemTotal = item.quantity * item.price;

      inventory.quantity += item.quantity;
      inventory.totalValue = (inventory.totalValue || 0) + itemTotal;
      inventory.averagePrice = inventory.totalValue / inventory.quantity;

      if (inventory.quantity === 0) inventory.status = "out-of-stock";
      else if (inventory.quantity <= 5) inventory.status = "low-stock";
      else inventory.status = "in-stock";

      inventory.updatedBy = req.user._id;
      await inventory.save({ session });
    }

    // 6️⃣ Commit Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Purchase created and inventory updated successfully",
      purchase: purchaseDoc,
    });
  } catch (error) {
    // ❌ Rollback All Changes
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export const getPurchasesBySupplier = handlerAsync(async (req, res, next) => {
  const { supplierId } = req.params;


  const supplierExist = await supplierModel.findById(supplierId);
  if (!supplierExist) return next(new AppError("supplier not found", 404));

  const purchases = await purchaseModel.find({ supplierId }).populate({
    path:"items.inventoryId",
    select:"productName"
  });

  

  res
    .status(200)
    .json({ message: "data retrieved successfully", data: purchases });
});
export const getPurchaseById = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const purchaseExist = await purchaseModel.findById(id).populate({
    path:"items.inventoryId",
    select:"productName"
  });
  if (!purchaseExist) return next(new AppError("purchase not found", 404));

  res
    .status(200)
    .json({ message: "data retrieved successfully", data: purchaseExist });
});
export const updatePurchase = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const { items, paidAmount, title } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseExist = await purchaseModel.findById(id).session(session);
    if (!purchaseExist) throw new AppError("Purchase not found", 404);

    // Check if any stock has been consumed
    const batches = await StockBatch.find({ purchaseId: id }).session(session);
    const hasConsumedStock = batches.some(b => b.remainingQuantity < b.quantity);

    if (hasConsumedStock) {
      throw new AppError("Cannot update purchase - stock has already been consumed", 409);
    }

    // 1️⃣ REVERSE original purchase from inventory
    for (const oldItem of purchaseExist.items) {
      const inventory = await inventoryModel.findById(oldItem.inventoryId).session(session);
      if (!inventory) continue; // Skip if inventory item was deleted

      const itemTotal = oldItem.quantity * oldItem.price;
      inventory.quantity -= oldItem.quantity;
      inventory.totalValue = Math.max(0, (inventory.totalValue || 0) - itemTotal);

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

    // 2️⃣ DELETE old stock batches
    await StockBatch.deleteMany({ purchaseId: id }, { session });

    // 3️⃣ VALIDATE new items
    const checkingItems = await Promise.all(
      items.map(async (ele, index) => {
        const itemExist = await inventoryModel.findById(ele.inventoryId).session(session);
        if (!itemExist) {
          throw new AppError(`Item number ${index + 1} not found in inventory`, 404);
        }
        return itemExist;
      })
    );

    // 4️⃣ RECALCULATE pricing
    const estimatedPrice = items.reduce(
      (acc, curr) => acc + Number(curr.price * curr.quantity),
      0
    );

    let newPurchase = { items, title, totalAmount: estimatedPrice };

    if (Number(estimatedPrice) === Number(paidAmount)) {
      newPurchase = { ...newPurchase, paidAmount, dueAmount: 0, paymentStatus: "paid" };
    } else if (Number(estimatedPrice) > Number(paidAmount)) {
      newPurchase = {
        ...newPurchase,
        paidAmount,
        dueAmount: Number(estimatedPrice) - Number(paidAmount),
        paymentStatus: "partial",
      };
    } else {
      throw new AppError("Paid amount cannot exceed total cost", 400);
    }

    // 5️⃣ CREATE new stock batches and update inventory
    for (const item of items) {
      const inventory = checkingItems.find(
        (inv) => inv._id.toString() === item.inventoryId
      );

      await StockBatch.create(
        [
          {
            inventoryId: item.inventoryId,
            purchaseId: id,
            supplierId: purchaseExist.supplierId,
            quantity: item.quantity,
            remainingQuantity: item.quantity,
            unitCost: item.price,
            status: "active",
          },
        ],
        { session }
      );

      const itemTotal = item.quantity * item.price;
      inventory.quantity += item.quantity;
      inventory.totalValue = (inventory.totalValue || 0) + itemTotal;
      inventory.averagePrice = inventory.totalValue / inventory.quantity;

      if (inventory.quantity === 0) inventory.status = "out-of-stock";
      else if (inventory.quantity <= 5) inventory.status = "low-stock";
      else inventory.status = "in-stock";

      inventory.updatedBy = req.user._id;
      await inventory.save({ session });
    }

    // 6️⃣ UPDATE purchase record
    newPurchase.updatedBy = req.user._id;
    await purchaseModel.findByIdAndUpdate(id, newPurchase, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Purchase updated successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export const deletePurchase = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await purchaseModel.findById(id).session(session);
    if (!purchase) throw new AppError("Purchase not found", 404);

    // Check if any stock has been consumed
    const batches = await StockBatch.find({ purchaseId: id }).session(session);
    const hasConsumedStock = batches.some(b => b.remainingQuantity < b.quantity);

    if (hasConsumedStock) {
      throw new AppError("Cannot delete purchase - stock has already been consumed", 409);
    }

    // Reverse inventory changes
    for (const item of purchase.items) {
      const inventory = await inventoryModel.findById(item.inventoryId).session(session);
      if (!inventory) continue; // Skip if inventory item was deleted

      const itemTotal = item.quantity * item.price;
      inventory.quantity -= item.quantity;
      inventory.totalValue = Math.max(0, (inventory.totalValue || 0) - itemTotal);

      if (inventory.quantity > 0) {
        inventory.averagePrice = inventory.totalValue / inventory.quantity;
      } else {
        inventory.averagePrice = 0;
      }

      if (inventory.quantity === 0) inventory.status = "out-of-stock";
      else if (inventory.quantity <= 5) inventory.status = "low-stock";
      else inventory.status = "in-stock";

      inventory.updatedBy = req.user._id;
      await inventory.save({ session });
    }

    // Delete stock batches
    await StockBatch.deleteMany({ purchaseId: id }, { session });

    // Delete purchase
    await purchaseModel.findByIdAndDelete(id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});


