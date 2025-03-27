const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 3009;

// Cấu hình middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// Serve static files từ root của project
const gamePath = __dirname;

app.use(
  express.static(gamePath, {
    etag: true,
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".gz")) {
        res.setHeader("Content-Encoding", "gzip");
      }
      if (filePath.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm");
      }
      if (filePath.endsWith(".glb") || filePath.endsWith(".gltf")) {
        res.setHeader("Content-Type", "model/gltf-binary");
      }
      if (filePath.endsWith(".jpg") || filePath.endsWith(".png")) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

// API endpoints cho score
const scores = [];
app.post("/save-score", (req, res) => {
  const { name, score } = req.body;
  scores.push({ name, score, date: new Date() });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(10); // Giữ top 10
  res.status(200).json({ success: true });
});

app.get("/get-scores", (req, res) => {
  res.json(scores.slice(0, 10));
});

// Xử lý Socket.IO
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("playerJoin", (playerData) => {
    socket.broadcast.emit("newPlayer", playerData);
  });

  socket.on("playerUpdate", (updateData) => {
    socket.broadcast.emit("playerMove", {
      id: socket.id,
      ...updateData,
    });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    io.emit("playerLeave", socket.id);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server running at:
  - Local: http://localhost:${port}
  - Network: http://${getIPAddress()}:${port}
  - Game path: ${gamePath}`);
});

function getIPAddress() {
  return (
    Object.values(require("os").networkInterfaces())
      .flat()
      .find((i) => i.family === "IPv4" && !i.internal)?.address || "localhost"
  );
}
