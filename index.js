const express = require("express");
var cors = require("cors");
const User = require("./model/user");
const Message = require("./model/message");
const http = require("http");
const app = express();
const config = require("./service/config");
const { connectDb } = require("./service/db");
app.use(cors());
require("./service/routes")(app);
const server = http.createServer(app);
const io = require("socket.io")(server);

connectDb().then(() => {
  server.listen(config.PORT, () => {
    console.log(`Connected to port ${config.PORT}`);
  });
});

const jwt = require("jsonwebtoken");
const { updateOne } = require("./model/user");
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    const decoded = await jwt.verify(token, config.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });
    if (!user) {
    } else {
      socket.user = user;
      next();
    }
  } catch (err) {}
});

io.on("connection", async (socket) => {
  const user = await User.findOneAndUpdate(
    { _id: socket.user._id },
    { $set: { socketId: socket.id } },
    { upsert: true }
  );
  socket.user = user;

  socket.on("joinRoom", (data) => {
    socket.join(data);
  });

  socket.on("chatMesssage", async (data) => {
    const uid = data.sender._id + data.recv._id;
    const uid2 = data.recv._id + data.sender._id;
    const chat = await Message.findOne({
      $or: [
        {
          _id: uid,
        },
        {
          _id: uid2,
        },
      ],
    });
    var time = "";
    var date = "";
    var d = new Date();
    date +=
      d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " ";
    time += d.getHours() + ":" + d.getMinutes();
    const mssg = {
      message: data.mssg,
      sender: data.sender._id,
      reciever: data.recv._id,
      time: time,
      date: date,
    };

    if (chat) {
      const updated = await Message.findOneAndUpdate(
        {
          $or: [
            {
              _id: uid,
            },
            {
              _id: uid2,
            },
          ],
        },
        { $push: { message: mssg } },
        { new: true }
      );

      const recieverSocket = await User.findOne({ _id: mssg.reciever });
      const senderSocket = await User.findOne({ _id: mssg.sender });
      io.to(senderSocket.socketId).emit("chatMessage", updated);
      io.to(recieverSocket.socketId).emit("chatMessage", updated);
    } else {
      await Message.create({
        _id: uid,
      });

      const updated = await Message.findOneAndUpdate(
        {
          $or: [
            {
              _id: uid,
            },
            {
              _id: uid2,
            },
          ],
        },
        { $push: { message: mssg } },
        { new: true }
      );

      const recieverSocket = await User.findOne({ _id: mssg.reciever });
      const senderSocket = await User.findOne({ _id: mssg.sender });
      io.to(senderSocket.socketId).emit("chatMessage", updated);
      io.to(recieverSocket.socketId).emit("chatMessage", updated);
    }
  });

  socket.on("getChat", async (data, callback) => {
    const uid = data.sender._id + data.recv._id;
    const uid2 = data.recv._id + data.sender._id;
    const chat = await Message.findOne({
      $or: [
        {
          _id: uid,
        },
        {
          _id: uid2,
        },
      ],
    });
    if (chat) {
      if (chat.message) {
        callback({ chat: chat.message });
      }
    } else {
      callback({ chat: {} });
    }
  });
  socket.on("getUsers", async () => {
    const users = await User.find({ _id: { $ne: socket.user._id } });
    io.to().emit("getUsers", users);
  });
  socket.on("lastMessage", async (data, callback) => {
    const uid = data.currentUser._id + data.user._id;
    const uid2 = data.user._id + data.currentUser._id;
    const chat = await Message.findOne({
      $or: [
        {
          _id: uid,
        },
        {
          _id: uid2,
        },
      ],
    });

    if (chat) {
      const senderSocket = await User.findOne({ _id: data.currentUser._id });
      io.to(senderSocket.socketId).emit("lastMessage", chat);
      //io.to(recieverSocket.socketId).emit("chatMessage", updated);
    }
  });
  socket.on("userTyping", async (data, callback) => {
    const user_ = await User.findOne({ _id: data.sender._id });
    const user = await User.findOne({ _id: data.recv._id });
    const uid = data.sender._id + data.recv._id;
    const uid2 = data.recv._id + data.sender._id;

    const chat = await Message.findOne({
      $or: [
        {
          _id: uid,
        },
        {
          _id: uid2,
        },
      ],
    });
    if (chat) {
      const typ = {
        sender: data.sender,
        recv: data.recv,
        typ: `${user_.username} is typing...`,
        chatId: chat._id,
      };

      io.to(user.socketId).emit("userTyping", typ);
    } else {
      const typ = {
        sender: data.sender,
        recv: data.recv,
        typ: `${user_.username} is typing...`,
        chatId: uid,
      };
      io.to(user.socketId).emit("userTyping", typ);
    }
  });
  socket.on("stopTyping", async (data, callback) => {
    const user = await User.findOne({ _id: data.recv._id });
    const user_ = await User.findOne({ _id: data.sender._id });
    const uid = data.sender._id + data.recv._id;
    const uid2 = data.recv._id + data.sender._id;

    const chat = await Message.findOne({
      $or: [
        {
          _id: uid,
        },
        {
          _id: uid2,
        },
      ],
    });
    if (chat) {
      const typ = {
        sender: data.sender,
        recv: data.recv,
        typ: ``,
        chatId: chat._id,
      };

      io.to(user.socketId).emit("stopTyping", typ);
    } else {
      const typ = {
        sender: data.sender,
        recv: data.recv,
        typ: `${user_.username} is typing...`,
        chatId: uid,
      };
      io.to(user.socketId).emit("stopTyping", typ);
    }
  });
  socket.on("leaveRoom", () => {});
  socket.on("disconnect", async () => {
    await User.findOneAndUpdate(
      { _id: socket.user.id },
      { $set: { socketId: socket.id } },
      { upsert: true }
    );
  });
});
