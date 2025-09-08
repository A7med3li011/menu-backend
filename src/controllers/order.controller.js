import { customAlphabet } from "nanoid";
import orderMdoel from "../../DataBase/models/order.mdoel.js";
import productModel from "../../DataBase/models/product.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";
import tableModel from "../../DataBase/models/Tables.model.js";
import userModel from "../../DataBase/models/user.model.js";
import mongoose from "mongoose";

export const createOrder = handlerAsync(async (req, res, next) => {
  const { items, orderType, location, locationMap, table, guestCount } =
    req.body;

  console.log(items);
  if (orderType === "delivery") {
    if (!location || !locationMap) {
      return next(
        new AppError(
          "Location and locationMap are required for delivery orders",
          400
        )
      );
    }
  }
  const location1 =
    typeof location === "string" ? JSON.parse(location) : location;
  let totalPrice = 0;
  for (const item of items) {
    const product = await productModel.findById({ _id: item.product });
    if (!product) return next(new AppError("product not found", 404));
    let addtionalPrice = 0;
    if (
      item?.customizations &&
      item?.customizations?.extrasWithPrices &&
      item?.customizations?.extrasWithPrices.length
    ) {
      addtionalPrice = item?.customizations?.extrasWithPrices.reduce(
        (acc, curr) => acc + Number(curr.price),
        0
      );
    }
    totalPrice += product.price * item.quantity + addtionalPrice;
  }

  const nanoidNumber = customAlphabet("0123456789", 6);

  if (table) {
    await tableModel.findByIdAndUpdate(table, { status: "Occupied" });
  }
  const randomNumber = nanoidNumber();

  let UTP = 0;
  if (guestCount) {
    const totlQan = items.reduce((acc, curr) => acc + Number(curr.quantity), 0);

    UTP = totlQan / Number(guestCount);
  }
  const order = await orderMdoel.create({
    items,
    orderType,
    OrderNumber: randomNumber,
    table: table || null,
    location: orderType == "delivery" ? location1 : undefined,
    locationMap: orderType == "delivery" ? locationMap : undefined,
    totalPrice,
    customer: req.user._id,
    guestCount: guestCount || 0,
    UTP,
  });

  res.status(201).json({ message: "order created successfully" });
});
export const MergeOrder = handlerAsync(async (req, res, next) => {
  const { orderId, tableId } = req.body;

  const firstOrder = await orderMdoel.findById(orderId);
  if (!firstOrder) return next(new AppError("Order not found", 404));

  const secondOrder = await orderMdoel
    .findOne({
      table: tableId,
      status: { $nin: ["checkout", "cancelled"] },
    })
    .sort({ createdAt: -1 });

  // ❌ if no active order exists on that table

  if (!secondOrder) {
    return next(new AppError("There is no active order in this table", 404));
  }

  // ✅ merge logic
  // Merge items
  const mergedItems = [...secondOrder.items];
  firstOrder.items.forEach((item) => {
    const existingItem = mergedItems.find(
      (i) => i.product.toString() === item.product.toString()
    );
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      mergedItems.push(item);
    }
  });

  secondOrder.items = mergedItems;
  secondOrder.guestCount += firstOrder.guestCount;
  secondOrder.totalPrice += firstOrder.totalPrice;

  let totalQunt = secondOrder?.items?.reduce(
    (acc, curr) => acc + curr.quantity,
    0
  );
  secondOrder.UTP = Number(totalQunt) / Number(secondOrder.guestCount);
  await secondOrder.save();

  await tableModel.findByIdAndUpdate(firstOrder.table, { status: "Available" });
  // Optionally delete the merged order or mark it as merged
  await orderMdoel.findByIdAndDelete(orderId);

  res.status(201).json({
    message: "Orders merged successfully",
    mergedOrder: secondOrder,
  });
});

export const updateOrder = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const orderExist = await orderMdoel.findById({ _id: id });
  if (!orderExist) next(new AppError("order not found", 404));
  await orderMdoel.findByIdAndUpdate({ _id: id }, { ...req.body });
  res.status(200).json({ message: "order updated successfully" });
});
export const updateOrderItems = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const { items } = req.body;
  const orderExist = await orderMdoel.findById({ _id: id });
  if (!orderExist) next(new AppError("order not found", 404));

  if (!items.length) {
    await orderMdoel.findByIdAndDelete(id);
    res.status(200).json({ message: "order deleted successfully" });
  }
  let totalPrice = 0;

  for (const item of items) {
    const product = await productModel.findById({ _id: item.product._id });
    if (!product) return next(new AppError("product not found", 404));
    let addtionalPrice = 0;
    if (
      item?.customizations &&
      item?.customizations?.extrasWithPrices &&
      item?.customizations?.extrasWithPrices.length
    ) {
      addtionalPrice = item?.customizations?.extrasWithPrices.reduce(
        (acc, curr) => acc + Number(curr.price),
        0
      );
    }
    totalPrice += product.price * item.quantity + addtionalPrice;
  }

  let arr;

  arr = items.map((ele) => ({
    product: ele.product._id,
    quantity: ele.quantity,
    notes: ele.notes,
    customizations: ele.customizations,
    innerStatus: ele.innerStatus,
    innerStatus: ele.innerStatus,
    _id: ele._id,
  }));

  orderExist.items = arr;
  orderExist.totalPrice = totalPrice;
  await orderExist.save();

  res.status(200).json({ message: "order updated successfully" });
});
export const updateOrderStatus = handlerAsync(async (req, res, next) => {
  const { orderId, itemId, status } = req.body;
  const orderExist = await orderMdoel.findById({ _id: orderId });
  if (!orderExist) return next(new AppError("order not found", 404));

  const item = orderExist.items.find((ele) => ele._id.toString() == itemId);

  item.innerStatus = status;
  const updatedOrder = await orderExist.save();

  const items = updatedOrder.items;

  const flag = items.every((ele) => ele.innerStatus == "ready");
  const flag2 = items.every((ele) => ele.innerStatus == "completed");
  const flag3 = items.find((ele) => ele.innerStatus == "preparing");

  if (flag) {
    orderExist.status = "ready";
    await orderExist.save();
  }

  if (flag2) {
    orderExist.status = "completed";
    await orderExist.save();
  }
  if (flag3) {
    orderExist.status = "preparing";
    await orderExist.save();
  }

  res.status(200).json({ message: "order updated successfully" });
});

// export const getAllOrders = handlerAsync(async (req, res, next) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;
//   const from = req.query.from;
//   const search = req.query.search;

//   // Build base query for fromApp and orderType filter
//   let query = {};

//   if (from === "true" || from === true) {
//     // Get only orders from app with delivery type
//     query = {
//       fromApp: false,
//       orderType: "delivery",
//     };
//   } else if (from === "false" || from === false) {
//     // Get only orders from website with dine-in type (note: dine-in with hyphen)
//     query = {
//       $or: [{ fromApp: false }, { fromApp: { $exists: false } }],
//       orderType: "dine-in",
//     };
//   }
//   // If from is not provided, get all orders (no filter applied)

//   // If search is provided, find matching customers and tables first
//   if (search && search.trim()) {
//     const searchRegex = new RegExp(search.trim(), "i");
//     // Find matching customers and tables in parallel
//     const [matchingCustomers, matchingTables] = await Promise.all([
//       // Replace 'Customer' with your actual customer model
//       userModel.find({ phone: searchRegex }).select("_id").lean(),
//       userModel.find({ name: searchRegex }).select("_id").lean(),
//       // Replace 'Table' with your actual table model
//       tableModel.find({ title: searchRegex }).select("_id").lean(),
//     ]);
//     const customerIds = matchingCustomers.map((c) => c._id);
//     const tableIds = matchingTables.map((t) => t._id);
//     // Add search conditions to the main query
//     const searchConditions = [{ OrderNumber: searchRegex }];
//     if (customerIds.length > 0) {
//       searchConditions.push({ customer: { $in: customerIds } });
//     }
//     if (tableIds.length > 0) {
//       searchConditions.push({ table: { $in: tableIds } });
//     }

//     // Combine with existing query using $and only if there's a filter
//     if (Object.keys(query).length > 0) {
//       query = {
//         $and: [
//           query, // existing fromApp and orderType filter
//           { $or: searchConditions },
//         ],
//       };
//     } else {
//       // If no filter, just use search conditions
//       query = { $or: searchConditions };
//     }
//   }

//   // First, get ALL matching orders without pagination to sort them properly
//   const [allOrders, totalOrders] = await Promise.all([
//     orderMdoel
//       .find(query)
//       .populate({
//         path: "customer",
//         select: `name ${
//           from === "true" || from === true ? "phone address" : ""
//         }`,
//       })
//       .populate({ path: "items.product", select: "title price" })
//       .populate("table", "title")
//       .lean(),
//     orderMdoel.countDocuments(query),
//   ]);

//   // Sort ALL orders by status: pending -> preparing -> completed -> ready -> canceled
//   allOrders.sort((a, b) => {
//     const statusOrder = [
//       "pending",
//       "preparing",
//       "completed",
//       "ready",
//       "canceled",
//     ];
//     const aIndex = statusOrder.indexOf(a.status?.toLowerCase());
//     const bIndex = statusOrder.indexOf(b.status?.toLowerCase());
//     // If status not found, put at end
//     const aPos = aIndex === -1 ? 999 : aIndex;
//     const bPos = bIndex === -1 ? 999 : bIndex;
//     if (aPos !== bPos) {
//       return aPos - bPos;
//     }
//     // If same status, sort by newest first
//     return new Date(b.createdAt) - new Date(a.createdAt);
//   });

//   // THEN apply pagination to the sorted results
//   const orders = allOrders.slice(skip, skip + limit);

//   res.status(200).json({
//     message: "Orders found successfully",
//     data: orders,
//     pagination: {
//       total: totalOrders,
//       page,
//       limit,
//       totalPages: Math.ceil(totalOrders / limit),
//     },
//   });
// });
export const getAllOrders = handlerAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search;
  const from = req.query.from;
  const query = {};

  if (from == 1) {
    query.orderType = "delivery";
  }
  if (from == 2) {
    query.orderType = "dine-in";
  }
  if (req.query.filter != "all") {
    query.status = req.query.filter;
  } else {
    delete query.status;
  }

  if (req?.user?.role == "waiter") {
    query.customer = new mongoose.Types.ObjectId(req.user._id);
  }
  if (search) {
    const regex = new RegExp(search, "i");
    query.$or = [
      { location: regex },
      { OrderNumber: regex },
      { status: regex },
      { orderType: regex },
    ];
  }

  const pipeline = [
    { $match: query },
    {
      $addFields: {
        statusOrder: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "pending"] }, then: 1 },
              { case: { $eq: ["$status", "completed"] }, then: 2 },
              { case: { $eq: ["$status", "ready"] }, then: 3 },
              { case: { $eq: ["$status", "canceled"] }, then: 4 },
            ],
            default: 5, // any other status goes last
          },
        },
      },
    },
    { $sort: { statusOrder: 1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              $mergeObjects: [
                "$$item",
                {
                  productId: "$$item.product", // Store original product ID
                },
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "productData",
      },
    },
    {
      $addFields: {
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              $mergeObjects: [
                "$$item",
                {
                  product: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$productData",
                          cond: { $eq: ["$$this._id", "$$item.productId"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        productData: 0, // Remove the temporary productData array
        "items.productId": 0, // Remove the temporary productId field
      },
    },
    {
      $lookup: {
        from: "tables",
        localField: "table",
        foreignField: "_id",
        as: "table",
      },
    },
    { $unwind: { path: "$table", preserveNullAndEmptyArrays: true } },
  ];

  const [orders, totalOrders] = await Promise.all([
    orderMdoel.aggregate(pipeline),
    orderMdoel.countDocuments(query),
  ]);

  res.status(200).json({
    message: "Orders found successfully",
    data: orders,
    pagination: {
      total: totalOrders,
      page,
      limit,
      totalPages: Math.ceil(totalOrders / limit),
    },
  });
});

export const getAllOrdersStats = handlerAsync(async (req, res, next) => {
  const topProductsStats = await orderMdoel.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        value: { $sum: { $ifNull: ["$items.quantity", 1] } },
      },
    },
    { $sort: { value: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "products", // Make sure this matches your actual collection name
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $project: {
        productId: "$_id",
        value: 1,
        name: "$productDetails.title",
        // image: "$productDetails.image",
        _id: 0,
      },
    },
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    todayOrderCount,
    countOfCustomer,
    ordersPricing,
    allRodersCount,
    countStaff,
    countOperators,
    countWaiter,
  ] = await Promise.all([
    orderMdoel.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }),

    userModel.countDocuments({ role: "customer" }),
    orderMdoel.find().select("totalPrice"),
    orderMdoel.countDocuments(),
    userModel.countDocuments({ role: "staff" }),
    userModel.countDocuments({ role: "operation" }),
    userModel.countDocuments({ role: "waiter" }),
  ]);

  const revenue = ordersPricing.reduce(
    (acc, curr) => acc + curr?.totalPrice,
    0
  );
  res.status(200).json({
    message: "data success",
    data: topProductsStats,
    countOfCustomer,
    todayOrderCount,
    revenue,
    allRodersCount,
    countStaff,
    countOperators,
    countWaiter,
  });
});

const dayMap = {
  1: "Sun", // MongoDB $dayOfWeek: 1 = Sunday
  2: "Mon", // 2 = Monday
  3: "Tue", // 3 = Tuesday
  4: "Wed", // 4 = Wednesday
  5: "Thu", // 5 = Thursday
  6: "Fri", // 6 = Friday
  7: "Sat", // 7 = Saturday
};

const getEgyptDate = () => {
  const now = new Date();
  const egyptTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Africa/Cairo" })
  );
  return egyptTime;
};

export const getWeeklyOrder = handlerAsync(async (req, res, next) => {
  const now = getEgyptDate();
  const day = now.getDay(); // Sunday = 0
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week

  const startOfWeek = new Date(now);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Convert to UTC for MongoDB query to avoid timezone issues
  const startOfWeekUTC = new Date(
    startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000
  );
  const endOfWeekUTC = new Date(
    endOfWeek.getTime() - endOfWeek.getTimezoneOffset() * 60000
  );

  const orders = await orderMdoel.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfWeekUTC,
          $lte: endOfWeekUTC,
        },
      },
    },
    {
      $addFields: {
        // Convert to Egypt timezone before extracting day
        egyptDate: {
          $dateToString: {
            date: "$createdAt",
            timezone: "Africa/Cairo",
          },
        },
      },
    },
    {
      $addFields: {
        egyptDateObj: {
          $dateFromString: {
            dateString: "$egyptDate",
          },
        },
      },
    },
    {
      $group: {
        _id: { $dayOfWeek: "$egyptDateObj" }, // Now using Egypt timezone
        count: { $sum: 1 },
      },
    },
  ]);

  const dailyOrdersData = [
    { day: "Mon", orders: 0 },
    { day: "Tue", orders: 0 },
    { day: "Wed", orders: 0 },
    { day: "Thu", orders: 0 },
    { day: "Fri", orders: 0 },
    { day: "Sat", orders: 0 },
    { day: "Sun", orders: 0 },
  ];

  orders.forEach(({ _id, count }) => {
    const dayLabel = dayMap[_id];
    const entry = dailyOrdersData.find((d) => d.day === dayLabel);
    if (entry) entry.orders = count;
  });

  res.status(200).json(dailyOrdersData);
});
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const revenueMonthly = handlerAsync(async (req, res, next) => {
  // Generate the last 6 months
  const generateLast6Months = () => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1, // MongoDB months are 1-indexed
        monthName: monthNames[date.getMonth()],
      });
    }
    return months;
  };

  const last6Months = generateLast6Months();

  // Get actual revenue data
  const revenueData = await orderMdoel.aggregate([
    {
      $addFields: {
        egyptDate: {
          $dateToParts: {
            date: "$createdAt",
            timezone: "Africa/Cairo",
          },
        },
      },
    },
    {
      $group: {
        _id: {
          year: "$egyptDate.year",
          month: "$egyptDate.month",
        },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
      },
    },
  ]);

  // Create a map of existing data for quick lookup
  const revenueMap = new Map();
  revenueData.forEach((item) => {
    const key = `${item._id.year}-${item._id.month}`;
    revenueMap.set(key, {
      revenue: item.revenue,
      orders: item.orders,
    });
  });

  // Merge generated months with actual data
  const result = last6Months.map((monthInfo) => {
    const key = `${monthInfo.year}-${monthInfo.month}`;
    const data = revenueMap.get(key);

    return {
      month: monthInfo.monthName,
      revenue: data ? data.revenue : 0,
      orders: data ? data.orders : 0,
    };
  });

  res.status(200).json(result);
});

export const getOrderBYKitchen = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  // Calculate date range for today and yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1); // Start of yesterday

  const orders = await orderMdoel
    .find({
      status: { $ne: "cancelled" },
      createdAt: {
        $gte: yesterday, // From start of yesterday
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Until end of today
      },
      $or: [
        { "items.product": { $exists: true } },
        { "items.customProduct": { $exists: true } },
      ],
    })
    .populate({
      path: "items.product",
      match: { kitchen: id },
    })
    .populate({
      path: "items.customProduct",
      match: { kitchen: id },
      populate: {
        path: "ingredients.ingredient",
        select: "name",
      },
    })
    .populate("table")
    .lean();

  // Filter orders to only include those with items that match the kitchen
  const filteredOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter(
        (item) =>
          (item.product && item.product.kitchen?.toString() === id) ||
          (item.customProduct && item.customProduct.kitchen?.toString() === id)
      ),
    }))
    .filter((order) => order.items.length > 0);

  res
    .status(200)
    .json({ message: "order founded successfully", data: filteredOrders });
});

export const getorderByUser = handlerAsync(async (req, res, next) => {
  const { status } = req.query;

  const query = { customer: req.user._id };
  if (status) {
    query.status = status;
  }

  const orders = await orderMdoel.find(query).populate({
    path: "items.product",
    select: "title price image",
  });

  if (!orders || orders.length === 0) {
    return res.status(200).json({ message: "no orders exist", data: orders });
  }

  res.status(200).json({
    message: "Orders found successfully",
    data: orders,
  });
});
