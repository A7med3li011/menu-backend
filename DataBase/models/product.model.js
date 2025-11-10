import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: mongoose.Types.ObjectId,
    ref: "Category",
    required: true,
  },

  price: {
    type: Number,
    min: 0,
  },
  priceAfterDiscount: {
    type: Number,
    min: 0,
  },
  ingredients: [{ type: String }],
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  image: {
    type: String,
  },
  description: {
    type: String,
  },

  available: {
    type: Boolean,
    default: true,
  },
  extras: [
    {
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        min: 0,
        required: true,
      },
    },
  ],
});

productSchema.pre(/^find/, function (next) {
  // Ensure we always include a custom field container
  if (!this._mongooseOptions) this._mongooseOptions = {};
  this._mongooseOptions.isFavouriteFor = this.getOptions().isFavouriteFor;
  next();
});

productSchema.post(/^find/, async function (docs) {
  if (!this._mongooseOptions || !this._mongooseOptions.isFavouriteFor) return;

  const userId = this._mongooseOptions.isFavouriteFor;
  const User = mongoose.model("User");

  const user = await User.findById(userId).select("wishlist");
  if (!user) return;

  const wishlistSet = new Set(user.wishlist.map((id) => id.toString()));

  docs.forEach((doc) => {
    doc._doc.is_favourite = wishlistSet.has(doc._id.toString());
  });
});

const productModel = mongoose.model("Product", productSchema);

export default productModel;
