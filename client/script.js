let scene, camera, renderer, player;
        let monsters = [];
        let attackCooldown = 0;
        const PLAYER_SPEED = 0.3;
        const ATTACK_RANGE = 5;
        const ATTACK_ANGLE = Math.PI/3;
        const keys = {};

        class Monster {
            constructor(type, position, radius) {
                this.type = type;
                this.radius = radius;
                this.home = position.clone();
                this.health = 100;
                this.mesh = this.createMesh(type);
                this.mesh.position.copy(position);
                this.target = null;
            }

            createMesh(type) {
                const geometry = new THREE.ConeGeometry(2, 4, 8);
                const material = new THREE.MeshPhongMaterial({
                    color: type === 'aggressive' ? 0xff0000 : 0x00ff00,
                    shininess: 100
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = Math.PI/2;
                mesh.castShadow = true;
                return mesh;
            }

            update(delta) {
                if (this.health <= 0) return;

                const distanceToPlayer = this.mesh.position.distanceTo(player.position);
                
                if (this.type === 'aggressive' && distanceToPlayer < 15) {
                    this.target = player.position.clone();
                } else {
                    this.target = null;
                }

                if (this.target) {
                    const direction = this.target.sub(this.mesh.position).normalize();
                    this.mesh.position.add(direction.multiplyScalar(0.1));
                } else {
                    const angle = Math.random() * Math.PI * 2;
                    this.mesh.position.x += Math.cos(angle) * 0.05;
                    this.mesh.position.z += Math.sin(angle) * 0.05;
                }

                if (this.mesh.position.distanceTo(this.home) > this.radius) {
                    const returnDir = this.home.clone().sub(this.mesh.position).normalize();
                    this.mesh.position.add(returnDir.multiplyScalar(0.2));
                }

                // Giữ quái vật trên mặt đất
                this.mesh.position.y = 0;
            }
        }

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
                color: 0x228B22,
                shininess: 100
            });
            const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
            terrain.rotation.x = -Math.PI/2;
            terrain.receiveShadow = true;
            scene.add(terrain);

            // Player
            
            const playerGeometry = new THREE.CylinderGeometry(1, 1, 2, 8);
            const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });
            player = new THREE.Mesh(playerGeometry, playerMaterial);
            player.position.set(0, 1, 0); // Điều chỉnh vị trí
            player.castShadow = true;
            scene.add(player);


            // Camera
            camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            
            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);

            // Tạo quái vật
            createMonsters();
            
            // Controls
            document.addEventListener('keydown', (e) => {
                keys[e.key] = true;
                if (e.code === 'Space') performAttack();
            });
            
            document.addEventListener('keyup', (e) => {
                keys[e.key] = false;
            });

            // Xử lý resize window
            window.addEventListener('resize', onWindowResize, false);
        }

        function createMonsters() {
            // Quái vật bị động
            for (let i = 0; i < 5; i++) {
                const pos = new THREE.Vector3(
                    Math.random() * 50 - 25,
                    0,
                    Math.random() * 50 - 25
                );
                const monster = new Monster('passive', pos, 10);
                scene.add(monster.mesh);
                monsters.push(monster);
            }

            // Quái vật chủ động
            for (let i = 0; i < 3; i++) {
                const pos = new THREE.Vector3(
                    Math.random() * 50 - 25,
                    0,
                    Math.random() * 50 - 25
                );
                const monster = new Monster('aggressive', pos, 15);
                scene.add(monster.mesh);
                monsters.push(monster);
            }
        }

        function performAttack() {
            if (attackCooldown > 0) return;
            attackCooldown = 0.5;

            // Tạo vector hướng nhìn
            const forwardVector = new THREE.Vector3(0, 0, -1)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

            // Hiệu ứng tấn công
            const attackGeometry = new THREE.ConeGeometry(ATTACK_RANGE, 2, 8);
            const attackMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.5
            });
            const attackMesh = new THREE.Mesh(attackGeometry, attackMaterial);
            attackMesh.rotation.x = -Math.PI/2;
            attackMesh.position.copy(player.position);
            attackMesh.rotation.y = player.rotation.y;
            scene.add(attackMesh);

            // Kiểm tra trúng quái vật
            monsters.forEach(monster => {
                if (monster.health <= 0) return;
                
                const direction = monster.mesh.position.clone().sub(player.position);
                const angle = direction.angleTo(forwardVector);
                
                if (direction.length() < ATTACK_RANGE && Math.abs(angle) < ATTACK_ANGLE/2) {
                    monster.health -= 30;
                    if (monster.health <= 0) {
                        monster.mesh.position.y = -10;
                        document.getElementById('score').textContent = 
                            parseInt(document.getElementById('score').textContent) + 100;
                    }
                }
            });

            setTimeout(() => scene.remove(attackMesh), 200);
        }

        function updatePlayer(delta) {
            // Di chuyển player
            const speed = PLAYER_SPEED * delta * 60;
            
            if (keys['w'] || keys['ArrowUp']) {
                player.position.z -= speed * Math.cos(player.rotation.y);
                player.position.x -= speed * Math.sin(player.rotation.y);
            }
            if (keys['s'] || keys['ArrowDown']) {
                player.position.z += speed * Math.cos(player.rotation.y);
                player.position.x += speed * Math.sin(player.rotation.y);
            }
            if (keys['a'] || keys['ArrowLeft']) {
                player.rotation.y += 0.05;
            }
            if (keys['d'] || keys['ArrowRight']) {
                player.rotation.y -= 0.05;
            }
        }

        function updateCamera() {
            const cameraOffset = new THREE.Vector3(
                0,
                20,
                30
            ).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
            
            camera.position.copy(player.position).add(cameraOffset);
            camera.lookAt(player.position);
        }

        function animate() {
            requestAnimationFrame(animate);
            const delta = 0.016;

            // Cập nhật cooldown
            if (attackCooldown > 0) attackCooldown -= delta;

            // Di chuyển player
            updatePlayer(delta);

            // Cập nhật quái vật
            monsters.forEach(monster => monster.update(delta));

            // Cập nhật camera
            updateCamera();

            renderer.render(scene, camera);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        init();
        animate();