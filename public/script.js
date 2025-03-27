// public/script.js
const socket = io();

let scene, camera, renderer, player;
let monsters = {};
let playerMeshes = {}; // Store all player meshes

function init() {
  scene = new THREE.Scene();

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 50, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Terrain
  const terrainGeometry = new THREE.PlaneGeometry(200, 200);
  const terrainMaterial = new THREE.MeshPhongMaterial({
    color: 0x228b22,
    shininess: 100,
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 20, 30);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Xử lý resize window
  window.addEventListener("resize", onWindowResize, false);
}

function createPlayerMesh() {
  const playerGeometry = new THREE.CylinderGeometry(1, 1, 2, 8);
  const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x4169e1 });
  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.castShadow = true;
  return playerMesh;
}

function createMonsterMesh(monster) {
  const geometry = new THREE.ConeGeometry(2, 4, 8);
  const material = new THREE.MeshPhongMaterial({
    color: monster.type === "aggressive" ? 0xff0000 : 0x00ff00,
    shininess: 100,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  return mesh;
}

socket.on("updateGameState", (gameState) => {
  // Cập nhật vị trí người chơi
  for (const playerId in gameState.players) {
    const player = gameState.players[playerId];
    if (!playerMeshes[playerId]) {
      playerMeshes[playerId] = createPlayerMesh();
      scene.add(playerMeshes[playerId]);
    }
    playerMeshes[playerId].position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );
    playerMeshes[playerId].rotation.y = player.rotation.y;
    if (playerId === socket.id) {
      document.getElementById("health").textContent = player.health;
      document.getElementById("score").textContent = player.score;
      player = playerMeshes[playerId];
    }
  }
  // Remove disconnected players
  for (const playerId in playerMeshes) {
    if (!gameState.players[playerId]) {
      scene.remove(playerMeshes[playerId]);
      delete playerMeshes[playerId];
    }
  }

  // Cập nhật vị trí quái vật
  gameState.monsters.forEach((monster) => {
    if (!monsters[monster.id]) {
      monsters[monster.id] = createMonsterMesh(monster);
      scene.add(monsters[monster.id]);
    }
    monsters[monster.id].position.set(
      monster.position.x,
      monster.position.y,
      monster.position.z
    );
    if (monster.health <= 0) {
      monsters[monster.id].position.y = -10;
    }
  });
});

document.addEventListener("keydown", (event) => {
  let direction;
  if (event.key === "w" || event.key === "ArrowUp") direction = "up";
  else if (event.key === "s" || event.key === "ArrowDown") direction = "down";
  else if (event.key === "a" || event.key === "ArrowLeft") direction = "left";
  else if (event.key === "d" || event.key === "ArrowRight") direction = "right";

  if (direction) {
    socket.emit("playerMovement", { direction: direction });
  }
  if (event.code === "Space") {
    socket.emit("performAttack");
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (player) {
    updateCamera();
  }
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCamera() {
  const cameraOffset = new THREE.Vector3(0, 20, 30).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    player.rotation.y
  );

  camera.position.copy(player.position).add(cameraOffset);
  camera.lookAt(player.position);
}

init();
animate();
