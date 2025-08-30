const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

async function registerUser(req, res) {
  const {
    fullName: { firstName, lastName },
    email,
    password,
  } = req.body;

  const isUserExists = await userModel.findOne({ email: email });

  if (isUserExists)
    return res
      .status(400)
      .json({ message: "User already exists. Please Login!" });

  const hashpassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    fullName: {
      firstName,
      lastName,
    },
    email,
    password: hashpassword,
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
  res.cookie("token", token);

  res.status(201).json({
    message: "User successfully created",
    user: {
      email: user.email,
      id: user._id,
      fullName: user.fullName,
    },
  });
}

async function loginUser(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({
    email: email,
  });

  if (!user) return res.status(401).json({ message: "Unauthorized access" });

  const isVaildPassword = bcrypt.compare(password, user.password);

  if (!isVaildPassword)
    res.status(401).json({ message: "Invalid Credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
  res.cookie("token", token);

  res.status(200).json({
    message: "User logged in successfully",
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
    },
  });
}

module.exports = {
  registerUser,
  loginUser
};
