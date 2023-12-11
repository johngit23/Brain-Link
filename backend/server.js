const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

const httpServer = createServer(app);

dotenv.config();
app.use(express.json());
connectDB();

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/dist")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "dist", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------
// ERROR HANDLING MIDDLEWARES
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    //credentials: true,
  },
  pingTimeOut: 60000,
});
io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });
  socket.on("join chat", (room) => {
    socket.join(room);
    // console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });
  // socket.off("setup", () => {
  //   console.log("USER DISCONNECTED");
  //   socket.leave(userData._id);
  // });
});

httpServer.listen(PORT||3000);
