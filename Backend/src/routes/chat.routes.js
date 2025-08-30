const express = require("express");
const authMiddlewares = require("../middlewares/auth.middleware.js");
const chatControllers = require("../controllers/chat.controller.js")
const router = express.Router();

router.post("/", authMiddlewares.authUser,chatControllers.createChat)
router.get("/",authMiddlewares.authUser, chatControllers.getChats)
/* GET /api/chat/messages/:id */
router.get('/messages/:id', authMiddlewares.authUser, chatControllers.getMessages)

module.exports = router;