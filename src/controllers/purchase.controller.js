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

  const {id} = req.params

  const {items,paidAmount,title} = req.body
  const purchaseExist = await purchaseModel.findById(id)

  if(!purchaseExist) return next(new AppError("purchase not found",404))

    if(purchaseExist.exported) return next(new AppError("can't update purchase after exported to inventory",409))

      let newPurchase = {};
  const checkingItems = await Promise.all(
    items.map((ele, index) =>
      inventoryModel.findById(ele.inventoryId).then((itemExist) => {
        if (!itemExist) {
         return next( AppError(
            `item number ${index + 1} not found in inventory`,
            404
          ));
        }
        return itemExist;
      })
    )
  );

  newPurchase.items = items;
  newPurchase.title = title;


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
    return next(new AppError("paid amount is larger than total cost"));
  }

   await purchaseModel.findByIdAndUpdate(id,newPurchase);
  res.status(200).json({ message: "purchase update  successfully" });


});


