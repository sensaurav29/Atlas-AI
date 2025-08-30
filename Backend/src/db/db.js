const mongoose = require("mongoose");

function connectDB() {
  try{
    mongoose
    .connect(process.env.MONGO_URI)
    console.log("DB connected");
    
  }catch(err) {
      console.error("Error connecting to DB: ", err);
  };
}
module.exports = connectDB;
