const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Inicializa o cenário do arquivo cenario.js
const universo = new SistemaEstelar(canvas.width, canvas.height);

const initPlayer = () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    radius: 20, color: '#00d2ff', speed: 5,
    hp: 100, maxHp: 100, kills: 0, 
    isDashing: false,
    shieldTime: 0 // Novo: Tempo restante do escudo
});

let player = initPlayer();
const mouse = { x: 0, y: 0 };

const cooldowns = {
    q: { lastUsed: 0, duration: 500 },
    e: { lastUsed: 0, duration: 5000 },
    space: { lastUsed: 0, duration: 3000 },
    shift: { lastUsed: 0, duration: 10000 }, // Novo: Escudo
    f: { lastUsed: 0, duration: 15000 }      // Novo: Buraco Negro
};

const keys = {};
let enemies = [];
let bullets = [];
let particles = [];
let blackHoles = []; // Lista de buracos negros ativos
let screenShakeTime = 0;

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
});

function applyScreenShake() {
    if (screenShakeTime > 0) {
        const dx = Math.random() * 8 - 4;
        const dy = Math.random() * 8 - 4;
        ctx.translate(dx, dy);
        screenShakeTime--;
    }
}

// --- NOVAS CLASSES ---
class BlackHole {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 5;
        this.maxRadius = 60;
        this.life = 300; // Dura 5 segundos (a 60fps)
        this.suckPower = 3;
    }
    update() {
        if (this.radius < this.maxRadius) this.radius += 2; // Cresce no início
        this.life--;
    }
    draw() {
        // Efeito visual do buraco negro
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(138, 43, 226, ${Math.random() * 0.5 + 0.5})`; // Roxo brilhante
        ctx.stroke();
    }
}

class Enemy {
    constructor() {
        this.radius = 15;
        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
        }
        this.speed = 1.5 + (player.kills * 0.05);
        this.hp = 20 + (player.kills * 0.5);
    }
    update() {
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        // Movimento normal em direção ao jogador
        let moveX = (dx / dist) * this.speed;
        let moveY = (dy / dist) * this.speed;

        // Lógica de ser sugado pelo Buraco Negro
        blackHoles.forEach(bh => {
            let bhDx = bh.x - this.x;
            let bhDy = bh.y - this.y;
            let bhDist = Math.sqrt(bhDx*bhDx + bhDy*bhDy);
            
            if (bhDist < 300) { // Raio de sucção
                moveX += (bhDx / bhDist) * bh.suckPower;
                moveY += (bhDy / bhDist) * bh.suckPower;
            }
            if (bhDist < bh.radius) {
                this.hp -= 2; // Dano massivo no centro do buraco negro
                createParticles(this.x, this.y, 'purple', 1);
            }
        });

        this.x += moveX;
        this.y += moveY;

        // Colisão com o jogador
        if (dist < this.radius + player.radius) {
            if (player.shieldTime > 0) {
                // Se o escudo estiver ativo, repele o inimigo
                this.x -= moveX * 10;
                this.y -= moveY * 10;
                this.hp -= 5; // Escudo também dá dano!
                createParticles(this.x, this.y, '#00ffcc', 3);
            } else {
                player.hp -= 0.5;
                screenShakeTime = 5;
                createParticles(this.x, this.y, '#ff0000', 2);
            }
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x - 10, this.y - 25, 20 * (this.hp/(20 + player.kills * 0.5)), 4);
    }
}

// (As classes Bullet e as funções createParticles, spawnEnemy e resetGame permanecem iguais)
class Bullet {
    constructor(x, y, targetX, targetY, isExplosion = false) {
        this.x = x; this.y = y;
        this.radius = isExplosion ? 120 : 5;
        this.color = isExplosion ? 'rgba(255, 174, 0, 0.4)' : '#fff';
        this.isExplosion = isExplosion;
        this.life = isExplosion ? 15 : 120;
        const dx = targetX - x; const dy = targetY - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        this.vx = (dx / dist) * 12; this.vy = (dy / dist) * 12;
    }
    update() { if (!this.isExplosion) { this.x += this.vx; this.y += this.vy; } this.life--; }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = this.color; ctx.fill();
    }
}

function createParticles(x, y, color, count) {
    for(let i=0; i<count; i++) particles.push({ x, y, vx: Math.random()*6-3, vy: Math.random()*6-3, life: 30, color });
}

function spawnEnemy() {
    if (player.hp > 0 && enemies.length < 10 + player.kills/2) enemies.push(new Enemy());
    setTimeout(spawnEnemy, 1000);
}

function updateUI() {
    const now = Date.now();
    document.getElementById('hp-bar').style.width = Math.max(0, (player.hp / player.maxHp * 100)) + '%';
    document.getElementById('hp-text').innerText = `HP: ${Math.max(0, Math.floor(player.hp))} / 100`;
    document.getElementById('score').innerText = `Kills: ${player.kills}`;

    ['q', 'e', 'space', 'shift', 'f'].forEach((key, index) => {
        const el = document.getElementById(`skill${index+1}`);
        if (now - cooldowns[key].lastUsed > cooldowns[key].duration) el.classList.add('ready');
        else el.classList.remove('ready');
    });
}

function resetGame() {
    player = initPlayer(); enemies = []; bullets = []; particles = []; blackHoles = [];
}

function animate() {
    ctx.save();
    
    // Chama o cenário incrível que criamos no outro arquivo!
    universo.desenhar(ctx, canvas, player.x, player.y);

    applyScreenShake();

    if (player.hp <= 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"; ctx.font = "bold 50px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("VOCÊ FOI DESTRUÍDO", canvas.width/2, canvas.height/2);
        ctx.font = "20px sans-serif"; ctx.fillText("Pressione 'R' para recomeçar", canvas.width/2, canvas.height/2 + 50);
        if (keys['r']) resetGame();
        ctx.restore(); requestAnimationFrame(animate); return;
    }

    const now = Date.now();
    let currentSpeed = player.speed;

    // Habilidades
    if (keys[' '] && now - cooldowns.space.lastUsed > cooldowns.space.duration) {
        player.isDashing = true; cooldowns.space.lastUsed = now;
        setTimeout(() => player.isDashing = false, 150);
        createParticles(player.x, player.y, '#00d2ff', 20);
    }
    if (keys['shift'] && now - cooldowns.shift.lastUsed > cooldowns.shift.duration) {
        player.shieldTime = 180; // 3 Segundos de escudo
        cooldowns.shift.lastUsed = now;
    }
    if (keys['f'] && now - cooldowns.f.lastUsed > cooldowns.f.duration) {
        blackHoles.push(new BlackHole(mouse.x, mouse.y));
        cooldowns.f.lastUsed = now;
        screenShakeTime = 15; // Tremor forte ao invocar o buraco negro
    }
    
    if (player.isDashing) currentSpeed = player.speed * 4;
    if (player.shieldTime > 0) player.shieldTime--;

    // Movimento
    if (keys['w'] && player.y > player.radius) player.y -= currentSpeed;
    if (keys['s'] && player.y < canvas.height - player.radius) player.y += currentSpeed;
    if (keys['a'] && player.x > player.radius) player.x -= currentSpeed;
    if (keys['d'] && player.x < canvas.width - player.radius) player.x += currentSpeed;

    // Ataques básicos
    if (keys['q'] && now - cooldowns.q.lastUsed > cooldowns.q.duration) {
        bullets.push(new Bullet(player.x, player.y, mouse.x, mouse.y)); cooldowns.q.lastUsed = now;
    }
    if (keys['e'] && now - cooldowns.e.lastUsed > cooldowns.e.duration) {
        bullets.push(new Bullet(player.x, player.y, player.x, player.y, true)); cooldowns.e.lastUsed = now;
        screenShakeTime = 10;
    }

    // Atualizar Buracos Negros
    blackHoles.forEach((bh, i) => {
        bh.update(); bh.draw();
        if (bh.life <= 0) blackHoles.splice(i, 1);
    });

    // Linha de mira
    ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(mouse.x, mouse.y);
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.2)'; ctx.stroke();

    // Desenhar Jogador
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = player.color; ctx.fill();

    // Desenhar Escudo (se ativo)
    if (player.shieldTime > 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0, 255, 204, ${Math.random() * 0.5 + 0.5})`; // Pisca neon
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    bullets.forEach((b, bi) => { b.update(); b.draw(); if (b.life <= 0) bullets.splice(bi, 1); });

    enemies.forEach((en, ei) => {
        en.update(); en.draw();
        bullets.forEach((b, bi) => {
            const dist = Math.sqrt((b.x - en.x)**2 + (b.y - en.y)**2);
            if (dist < b.radius + en.radius) {
                en.hp -= b.isExplosion ? 2.5 : 10;
                if (!b.isExplosion) bullets.splice(bi, 1);
                createParticles(en.x, en.y, '#fff', 5);
            }
        });
        if (en.hp <= 0) {
            player.kills++;
            createParticles(en.x, en.y, '#ffae00', 15);
            enemies.splice(ei, 1);
        }
    });

    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 30; ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1; if(p.life <= 0) particles.splice(i, 1);
    });

    updateUI();
    ctx.restore();
    requestAnimationFrame(animate);
}

spawnEnemy();
animate();

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });