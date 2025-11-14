import categoryModel from "../../DataBase/models/category.model.js";
import productModel from "../../DataBase/models/product.model.js";
import subCategoryModel from "../../DataBase/models/subCategory.model.js";
import { deleteUploadedFile } from "../services/deleteFile.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";

export const createSubCategory = handlerAsync(async (req, res, next) => {
  const { title, category } = req.body;

  if (!req.file) return next(new AppError("image is required", 400));
  const subCategoryExist = await subCategoryModel.findOne({
    title: title.toLowerCase(),
  });

  if (subCategoryExist)
    return next(new AppError("subCategory is already exist", 409));
  const CategoryExist = await categoryModel.findById(category);

  if (!CategoryExist) return next(new AppError("category not  exist", 409));

  const isHasProductsWithOutSub = await productModel.find({
    category,
    subCategory: null,
  });

  if (isHasProductsWithOutSub.length > 0) {
    return next(
      new AppError(
        "Unable to create a sub-category. This category contains products that are not linked to any sub-category.",
        409
      )
    );
  }

  const newSubCategory = await subCategoryModel.create({
    title: title.toLowerCase(),
    createdBy: req.user._id,
    image: req.file.filename,
    category,
  });

  res
    .status(201)
    .json({ message: "category creatd successfully", data: newSubCategory });
});

export const updateSubCategory = handlerAsync(async (req, res, next) => {
  const { subCategoryId } = req.params;
  const { title, categoryId } = req.body;

  const foundedSubCategory = await subCategoryModel.findById(subCategoryId);
  if (!foundedSubCategory)
    return next(new AppError("subCategory not exist", 404));

  let image = foundedSubCategory.image;
  if (req.file) {
    deleteUploadedFile(foundedSubCategory.image);
    image = req.file.filename;
  }

  const updatedSubCategory = await subCategoryModel.findByIdAndUpdate(
    subCategoryId,
    { category: categoryId, title, image },
    { new: true }
  );

  res.status(200).json({
    message: "subCategory updated successfully",
    data: updatedSubCategory,
  });
});

export const deleteSubCategory = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const foundedSubCategory = await subCategoryModel.findById(id);

  if (!foundedSubCategory)
    return next(new AppError("subcategory not exist", 404));

  deleteUploadedFile(foundedSubCategory.image);

  await subCategoryModel.findByIdAndDelete(id);

  // Delete all products associated with this subcategory
  await productModel.deleteMany({ subCategory: id });

  res.status(200).json({ message: "subcategory deleted sucessfully" });
});

export const getSubCategories = handlerAsync(async (req, res, next) => {
  const Subcategories = await subCategoryModel.find().populate("category");
  let arr = [];
  for (const subCat of Subcategories) {
    let obj = { ...subCat.toObject() };
    const products = await productModel.countDocuments({
      subCategory: subCat._id,
    });
    obj.products = products;
    arr.push(obj);
  }

  res.status(200).json({ message: "success", data: arr });
});
export const getSubCategoriesbyCategory = handlerAsync(
  async (req, res, next) => {
    const { categoryId } = req.params;
    const Subcategories = await subCategoryModel.find({ category: categoryId });

    res.status(200).json({ message: "success", data: Subcategories });
  }
);

export const getSubCategoryByid = handlerAsync(async (req, res, next) => {
  const subCategory = await subCategoryModel
    .findById(req.params.id)
    .populate("products")
    .populate("category");

  if (!subCategory) return next(new AppError("subcategory not exist", 404));

  res.status(200).json({ message: "success", data: subCategory });
});
