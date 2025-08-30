const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model.js");
const chatModel = require("../models/chat.model.js");
const aiService = require("../service/ai.service.js");
const { createMemory, queryMemory } = require("../service/vector.service.js");
const messageModel = require("../models/message.model.js");

const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    if (!cookies.token) {
      next(new Error("Authentication Error: No token found"));
    }

    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET_KEY);

      const user = await userModel.findById(decoded.id);

      socket.user = user;

      next();
    } catch (err) {
      next(new Error("Authentication error. Invalid token"));
    }
  });
  io.on("connection", (socket) => {
    socket.on("ai-message", async (messagePayload) => {
      const [message, vectors] = await Promise.all([
        messageModel.create({
          chat: messagePayload.chatid,
          user: socket.user._id,
          content: messagePayload.content,
          role: "user",
        }),
        aiService.generateVector(messagePayload.content),
      ]);

      await createMemory({
        vectors,
        messageId: message._id,
        metadata: {
          chat: messagePayload.chatid,
          userid: socket.user._id,
          text: messagePayload.content,
        },
      });

      const [memory, chatHistory] = await Promise.all([
        queryMemory({
          queryVector: vectors,
          limit: 3,
          metadata: {
            user: socket.user._id,
          },
        }),
        messageModel
          .find({
            chat: messagePayload.chatid,
          })
          .limit(20)
          .lean(),
      ]);

      const stm = chatHistory.map((item) => {
        return {
          role: item.role,
          parts: [{ text: item.content }],
        };
      });

      const ltm = [
        {
          role: "user",
          parts: [
            {
              text: `these are some of the previous chats, use them to generate the response 
            ${memory.map((item) => item.metadata.text).join("\n")}
            `,
            },
          ],
        },
      ];
      const response = await aiService.generateResponse([...ltm, ...stm]);

      console.log("LTM AND STM ARE: ",ltm[0], stm);

      socket.emit("ai-message-response", {
        content: response,
        chat: messagePayload.chatid,
      });

      const [responseMessage, responseVectors] = await Promise.all([
        messageModel.create({
          chat: messagePayload.chatid,
          user: socket.user._id,
          content: response,
          role: "model",
        }),
        aiService.generateVector(response),
      ]);

      // creating & saving vectors for bot's response in PinceCone
      await createMemory({
        vectors: responseVectors,
        messageId: responseMessage._id,
        metadata: {
          chat: messagePayload.chatid,
          user: socket.user._id,
          text: response,
        },
      });
    });
  });
};

module.exports = initSocketServer;
