const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 3009;
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// **Quản lý trạng thái game**
const gameState = {
  players: {}, // Lưu trữ thông tin người chơi (id, position, health, score)
  monsters: [], // Lưu trữ thông tin quái vật (id, type, position, health)
};

// Hàm tạo quái vật
function createMonsters() {
  // Quái vật bị động
  for (let i = 0; i < 5; i++) {
    const pos = {
      x: Math.random() * 50 - 25,
      y: 0,
      z: Math.random() * 50 - 25,
    };
    const monster = {
      id: `passive-${i}`,
      type: "passive",
      position: pos,
      health: 100,
      radius: 10,
      home: { ...pos },
    };
    gameState.monsters.push(monster);
  }

  // Quái vật chủ động
  for (let i = 0; i < 3; i++) {
    const pos = {
      x: Math.random() * 50 - 25,
      y: 0,
      z: Math.random() * 50 - 25,
    };
    const monster = {
      id: `aggressive-${i}`,
      type: "aggressive",
      position: pos,
      health: 100,
      radius: 15,
      home: { ...pos },
    };
    gameState.monsters.push(monster);
  }
}
createMonsters();

// Hàm cập nhật quái vật
function updateMonster(monster) {
  if (monster.health <= 0) return;
  const player = Object.values(gameState.players)[0];
  if (!player) return;
  const distanceToPlayer = Math.sqrt(
    Math.pow(monster.position.x - player.position.x, 2) +
      Math.pow(monster.position.z - player.position.z, 2)
  );

  if (monster.type === "aggressive" && distanceToPlayer < 15) {
    monster.target = { ...player.position };
  } else {
    monster.target = null;
  }

  if (monster.target) {
    const direction = {
      x: monster.target.x - monster.position.x,
      z: monster.target.z - monster.position.z,
    };
    const length = Math.sqrt(
      Math.pow(direction.x, 2) + Math.pow(direction.z, 2)
    );
    direction.x /= length;
    direction.z /= length;
    monster.position.x += direction.x * 0.1;
    monster.position.z += direction.z * 0.1;
  } else {
    const angle = Math.random() * Math.PI * 2;
    monster.position.x += Math.cos(angle) * 0.05;
    monster.position.z += Math.sin(angle) * 0.05;
  }

  if (
    Math.sqrt(
      Math.pow(monster.position.x - monster.home.x, 2) +
        Math.pow(monster.position.z - monster.home.z, 2)
    ) > monster.radius
  ) {
    const returnDir = {
      x: monster.home.x - monster.position.x,
      z: monster.home.z - monster.position.z,
    };
    const length = Math.sqrt(
      Math.pow(returnDir.x, 2) + Math.pow(returnDir.z, 2)
    );
    returnDir.x /= length;
    returnDir.z /= length;
    monster.position.x += returnDir.x * 0.2;
    monster.position.z += returnDir.z * 0.2;
  }
  monster.position.y = 0;
}

// Hàm cập nhật game
function updateGame() {
  // Cập nhật quái vật
  gameState.monsters.forEach((monster) => {
    updateMonster(monster);
  });
  // Gửi trạng thái game cho client
  io.emit("updateGameState", gameState);
}

// Cập nhật game mỗi 16ms (khoảng 60fps)
setInterval(updateGame, 16);

io.on("connection", (socket) => {
  console.log("Người chơi đã kết nối:", socket.id);

  // Thêm người chơi mới vào trạng thái game
  gameState.players[socket.id] = {
    position: { x: 0, y: 1, z: 0 },
    health: 100,
    score: 0,
    rotation: { y: 0 },
  };

  // Gửi trạng thái game ban đầu cho người chơi mới
  socket.emit("updateGameState", gameState);

  socket.on("playerMovement", (data) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    const speed = 0.3;
    if (data.direction === "up") {
      player.position.z -= speed * Math.cos(player.rotation.y);
      player.position.x -= speed * Math.sin(player.rotation.y);
    } else if (data.direction === "down") {
      player.position.z += speed * Math.cos(player.rotation.y);
      player.position.x += speed * Math.sin(player.rotation.y);
    } else if (data.direction === "left") {
      player.rotation.y += 0.05;
    } else if (data.direction === "right") {
      player.rotation.y -= 0.05;
    }
  });

  socket.on("performAttack", () => {
    const player = gameState.players[socket.id];
    if (!player) return;
    const ATTACK_RANGE = 5;
    const ATTACK_ANGLE = Math.PI / 3;
    const forwardVector = {
      x: -Math.sin(player.rotation.y),
      z: -Math.cos(player.rotation.y),
    };

    gameState.monsters.forEach((monster) => {
      if (monster.health <= 0) return;
      const direction = {
        x: monster.position.x - player.position.x,
        z: monster.position.z - player.position.z,
      };
      const distance = Math.sqrt(
        Math.pow(direction.x, 2) + Math.pow(direction.z, 2)
      );
      const dotProduct =
        forwardVector.x * direction.x + forwardVector.z * direction.z;
      const angle = Math.acos(dotProduct / (distance * Math.sqrt(1)));

      if (distance < ATTACK_RANGE && Math.abs(angle) < ATTACK_ANGLE / 2) {
        monster.health -= 30;
        if (monster.health <= 0) {
          player.score += 100;
        }
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("Người chơi đã ngắt kết nối:", socket.id);
    delete gameState.players[socket.id];
  });
});

server.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
