require("dotenv").config();
const app = require("./src/app.js");
const connectDB = require("./src/db/db.js");
const initSocketServer = require("./src/sockets/socket.server.js");
const httpServer = require("http").createServer(app);

connectDB();
initSocketServer(httpServer);


httpServer.listen(3000, () => {
  console.log("Pinecone API key loaded:", Boolean(process.env.PINECONE_API_KEY));
  console.log("Gemini API key loaded:", Boolean(process.env.GEMINI_API_KEY));
  console.log("Server connected on 3000");
});
