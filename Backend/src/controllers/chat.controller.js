const chatModel = require("../models/chat.model.js");
const messageModel = require("../models/message.model.js");
const userModel = require("../models/user.model.js");

const createChat = async (req, res) => {

    const {title} = req.body;
    const user = req.user;

    const chat = await chatModel.create({
        user: user._id,
        title
    });

    return res.status(201).json({
        message: "New Chat created",
        chat:{
            _id: chat._id,
            title: chat.title,
            lastActivity:  chat.lastActivity,
            user: chat.user
        }
    });

}

const getChats = async (req,res ) => {
    const user = req.user;

    const chats = await chatModel.find({user: user._id});

    res.status(200).json({
        chats: chats.map(chat =>( {
            _id:chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user
        }))
    })
}

async function getMessages(req, res) {

    const chatId = req.params.id;

    const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 });

    res.status(200).json({
        message: "Messages retrieved successfully",
        messages: messages
    })

}

module.exports = {
    createChat,
    getChats,
    getMessages
}