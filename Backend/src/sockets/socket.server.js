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
    console.log(`Socket connected: ${socket.id}`);
    socket.onAny((eventName) => {
      console.log(`[${socket.id}] Received socket event "${eventName}"`);
    });

    socket.on("ai-message", async (messagePayload) => {
      let stage = "validating message";
      try {
        console.log(`[${socket.id}] Received ai-message event`);
        if (
          !messagePayload ||
          typeof messagePayload.chatid !== "string" ||
          typeof messagePayload.content !== "string" ||
          !messagePayload.content.trim()
        ) {
          throw new Error("Payload must include chatid and non-empty content");
        }

        stage = "saving user message and generating embedding";
        console.log(`[${socket.id}] ${stage}`);
        const [message, vectors] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chatid,
            user: socket.user._id,
            content: messagePayload.content,
            role: "user",
          }),
          aiService.generateVector(messagePayload.content),
        ]);

        stage = "storing message memory";
        console.log(`[${socket.id}] ${stage}`);
        await createMemory({
          vectors,
          messageId: message._id,
          metadata: {
            chat: messagePayload.chatid,
            userid: String(socket.user._id),
            text: messagePayload.content,
          },
        });

        stage = "retrieving chat context";
        console.log(`[${socket.id}] ${stage}`);
        const [memory, chatHistory] = await Promise.all([
          queryMemory({
            queryVector: vectors,
            limit: 3,
            metadata: {
              userid: { $eq: String(socket.user._id) },
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

        stage = "generating AI response";
        console.log(`[${socket.id}] ${stage}`);
        const response = await aiService.generateResponse([...ltm, ...stm]);

        console.log(`[${socket.id}] AI response generated; emitting ai-message-response`);
        socket.emit("ai-message-response", {
          content: response,
          chat: messagePayload.chatid,
        });

        stage = "saving AI response";
        console.log(`[${socket.id}] ${stage}`);
        const [responseMessage, responseVectors] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chatid,
            user: socket.user._id,
            content: response,
            role: "model",
          }),
          aiService.generateVector(response),
        ]);

        await createMemory({
          vectors: responseVectors,
          messageId: responseMessage._id,
          metadata: {
            chat: messagePayload.chatid,
            userid: String(socket.user._id),
            text: response,
          },
        });
        console.log(`[${socket.id}] Message processing completed`);
      } catch (error) {
        console.error(
          `[${socket.id}] Failed to process ai-message while ${stage}:`,
          error?.stack || error
        );
        socket.emit("ai-message-error", {
          chat: messagePayload?.chatid,
          stage,
          message: error.message || "Message processing failed",
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });
};

module.exports = initSocketServer;
