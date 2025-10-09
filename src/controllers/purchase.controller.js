import { customAlphabet } from "nanoid";
import inventoryModel from "../../DataBase/models/inventory.model.js";
import supplierModel from "../../DataBase/models/supplier.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";
import purchaseModel from "../../DataBase/models/purchase.model.js";

export const createPurchase = handlerAsync(async (req, res, next) => {
  const {
    title,
    supplierId,
    items,

    paidAmount,
  } = req.body;

  const supplierExist = await supplierModel.findById(supplierId);

  if (!supplierExist) return next(new AppError("supplier not found", 404));

  if (supplierExist.status === "inActive")
    return next(
      new AppError("please activate supplier before making purchase", 404)
    );

  let newPurchase = {};
  const checkingItems = await Promise.all(
    items.map((ele, index) =>
      inventoryModel.findById(ele.inventoryId).then((itemExist) => {
        if (!itemExist) {
          throw new AppError(
            `item number ${index + 1} not found in inventory`,
            404
          );
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

  const nanoId = customAlphabet("123456789", 7);
  newPurchase.invoiceNumber = nanoId();
  newPurchase.supplierId = supplierId;

  await purchaseModel.create(newPurchase);
  res.status(200).json({ message: "purchase process completed successfully" });
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

  const purchaseExist = await purchaseModel.findById(id);
  if (!purchaseExist) return next(new AppError("purchase not found", 404));

  res
    .status(200)
    .json({ message: "data retrieved successfully", data: purchaseExist });
});
export const updatePurchase = handlerAsync(async (req, res, next) => {});
