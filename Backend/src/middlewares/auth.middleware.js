const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");

async function authUser(req, res, next) {
  const {token} = req.cookies;

  if (!token) return res.status(401).json({ message: "Unauthorized access" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await userModel.findById( decoded.id );

    if(!user) return res.status(400).json({ message: "User not found"});
    req.user = user;


    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized access" });
  }
}

module.exports = {
    authUser
}