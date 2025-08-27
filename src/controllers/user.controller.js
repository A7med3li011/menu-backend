import userModel from "../../DataBase/models/user.model.js";
import { AppError } from "../utilities/AppError.js";
import { handlerAsync } from "../utilities/handleAsync.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utilities/sendEmail.js";

export const handleRegister = handlerAsync(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  const emailExist = await userModel.findOne({ email });

  if (emailExist) return next(new AppError("email already exist", 409));
  const hashedPassword = await bcrypt.hash(password, +process.env.SLAT);

  await userModel.create({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
  });

  res.status(201).json({ message: "user created successfully" });
});
export const handle_add_staff = handlerAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    sections,
    shiftFrom,
    shiftTo,
    age,
    salary,
  } = req.body;

  const emailExist = await userModel.findOne({ email });

  if (emailExist) return next(new AppError("email already exist", 409));
  const hashedPassword = await bcrypt.hash(password, +process.env.SLAT);

  await userModel.create({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
    sections: sections,
    shiftFrom,
    shiftTo,
    age,
    salary,
  });

  res.status(201).json({ message: "user created successfully" });
});
export const handle_update_staff = handlerAsync(async (req, res, next) => {
  const { id } = req.params;
  const body = req.body;
  const userExist = await userModel.findById(id);
  if (!userExist) return next(new AppError("user not found", 404));
  if (body.email) {
    const emailExists = await userModel.findOne({
      email: body.email,
      _id: { $ne: id },
    });
    if (emailExists) {
      return next(new AppError("Email already in use by another user", 400));
    }
  }
  const data = await userModel.findByIdAndUpdate(id, {
    ...body,
    sections: body.sections,
  });
  res.status(200).json({ message: "user updated successfully" });
});

export const handleLogin = handlerAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const emailExist = await userModel.findOne({ email });
  if (emailExist) {
    const checkPassword = await bcrypt.compare(password, emailExist.password);

    if (!checkPassword) return next(new AppError("password is incorrect", 400));

    const user = await userModel.findOne({ email }).select("-password");

    const token = jwt.sign({ user }, process.env.SECRETEKEY);

    res.json({ message: "login successfully", user: user, token });
  } else {
    return next(new AppError("email is not exsit", 404));
  }
});

export const handleUpdateUser = handlerAsync(async (req, res, next) => {
  const userExist = await userModel.findById({ _id: req.user._id });

  if (!userExist) return next(new AppError("user not found", 404));
  let user = {};
  if (req.file) {
    const alldata = { ...req.body, pic: req.file.filename };
    user = await userModel.findByIdAndUpdate(
      req.user._id,
      { ...alldata },
      { new: true }
    );
  } else {
    user = await userModel.findByIdAndUpdate(
      req.user._id,
      { ...req.body },
      { new: true }
    );
  }

  res.status(200).json({ message: "user updated successfully", data: user });
});

export const handlegetUser = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await userModel.findById(id).select("-password");
  if (!user) return next(new AppError("user not found", 404));

  const token = jwt.sign({ user }, process.env.SECRETEKEY);

  res.status(200).json({ message: "user founded successfully", user, token });
});
export const handlegetAllStaff = handlerAsync(async (req, res, next) => {
  const staff = await userModel
    .find({ role: { $ne: "customer" } })
    .select("-passowrd")
    .lean();

  if (!staff.length) return next(new AppError("staff not found", 404));

  res.status(200).json({ message: "staff founded successfully", data: staff });
});
export const delet_staff = handlerAsync(async (req, res, next) => {
  const { id } = req.params;

  const userExits = await userModel.findOne({
    _id: id,
    role: { $ne: "customer" },
  });

  if (!userExits) return next(new AppError("staff not found", 404));

  if (userExits && userExits.role == "admin")
    return next(new AppError("you have no permission", 401));

  await userModel.findByIdAndDelete(id);

  res.status(200).json({ message: "user deleted  successfully" });
});

export const contactUs = handlerAsync(async (req, res, next) => {
  const { name, email, Note } = req.body;

  // 3- send email
  const message = `
New Customer Note Submitted

Name: ${name}
Email: ${email}
Note: ${Note || "No note provided"}

Please follow up if needed.
-- Restaurant App System
`;

  try {
    await sendEmail({
      email: "mohamedelsaid3963@gmail.com",
      subject: "Customer Note",
      message,
    });
  } catch (err) {
    return next(new ApiError("Email could not be sent", 500));
  }

  res
    .status(200)
    .json({ status: "Success", message: "Your message sent to support team" });
});
