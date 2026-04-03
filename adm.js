// adm.js - Painel de Desenvolvedor Completo

// 1. Criar o HTML do Painel via JavaScript
const devPanel = document.createElement('div');
devPanel.id = 'dev-menu';
devPanel.style = `
    position: fixed; 
    top: 20px; 
    right: 20px; 
    background: rgba(0, 0, 0, 0.9); 
    color: #0f0; 
    padding: 20px; 
    border: 2px solid #0f0; 
    font-family: 'Courier New', monospace; 
    z-index: 9999;
    display: none; 
    width: 260px; 
    border-radius: 10px;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    max-height: 90vh;
    overflow-y: auto;
`;

devPanel.innerHTML = `
    <h2 style="margin: 0 0 15px 0; font-size: 18px; text-align: center; border-bottom: 1px solid #0f0;">DEBUG PANEL</h2>
    
    <div style="margin-bottom: 10px;">
        <label>Vida (HP):</label><br>
        <input type="number" id="dev-hp" style="width: 100%; background: #111; color: #0f0; border: 1px solid #0f0;">
    </div>

    <div style="margin-bottom: 10px;">
        <label>Velocidade: <span id="val-speed">5</span></label><br>
        <input type="range" id="dev-speed" min="1" max="50" value="5" style="width: 100%;">
    </div>

    <div style="margin-bottom: 10px;">
        <label>Nível:</label><br>
        <input type="number" id="dev-level" style="width: 100%; background: #111; color: #0f0; border: 1px solid #0f0;">
    </div>

    <div style="margin-bottom: 10px;">
        <label>Kills:</label><br>
        <input type="number" id="dev-kills" style="width: 100%; background: #111; color: #0f0; border: 1px solid #0f0;">
    </div>

    <div style="margin-bottom: 10px;">
        <label>Combo Atual:</label><br>
        <input type="number" id="dev-combo" style="width: 100%; background: #111; color: #0f0; border: 1px solid #0f0;">
    </div>

    <div style="margin-bottom: 15px;">
        <label>Spawn Inimigos (Qtd):</label><br>
        <div style="display: flex; gap: 5px;">
            <input type="number" id="dev-spawn-qtd" value="1" min="1" style="width: 60%; background: #111; color: #0f0; border: 1px solid #0f0;">
            <button id="btn-spawn" style="width: 40%; background: #0f0; color: #000; border: none; cursor: pointer; font-weight: bold;">SPAWN</button>
        </div>
    </div>

    <div style="margin-bottom: 15px;">
        <button id="dev-kill-all" style="width: 100%; background: #ff0044; color: #fff; border: none; padding: 8px; cursor: pointer; font-weight: bold; text-shadow: 1px 1px black;">MATAR TODOS OS INIMIGOS</button>
    </div>

    <div style="margin-bottom: 15px; border-top: 1px solid #333; padding-top: 10px;">
        <button id="dev-unlock-skills" style="width: 100%; background: #00d2ff; color: #000; border: none; padding: 5px; cursor: pointer; font-weight: bold; margin-bottom: 5px;">LIBERAR TODAS AS SKILLS</button>
        
        <label style="cursor: pointer; font-size: 12px; color: #0f0;">
            <input type="checkbox" id="dev-nocd"> SEM COOLDOWN (Cheat)
        </label>
    </div>

    <button id="close-dev" style="width: 100%; background: #444; color: #fff; border: none; padding: 5px; cursor: pointer; font-weight: bold;">FECHAR PANEL [ESC]</button>
`;

document.body.appendChild(devPanel);

// 2. Lógica de Ativação (Tecla \ )
window.addEventListener('keydown', (e) => {
    if (e.key === '\\') {
        const pass = prompt("MODO DESENVOLVEDOR: Digite a senha de acesso:");
        if (pass === "eldevoradordeprima") {
            devPanel.style.display = 'block';
            syncPanel(); 
        } else {
            alert("Acesso Negado.");
        }
    }
    
    if (e.key === 'Escape' && devPanel.style.display === 'block') {
        devPanel.style.display = 'none';
    }
});

// 3. Sincronização dos Dados
function syncPanel() {
    document.getElementById('dev-hp').value = Math.floor(player.hp);
    document.getElementById('dev-speed').value = player.speed;
    document.getElementById('val-speed').innerText = player.speed;
    document.getElementById('dev-level').value = sistemaNivel.nivel;
    document.getElementById('dev-combo').value = combo; 
    document.getElementById('dev-kills').value = player.kills;
}

// 4. Listeners de Alteração
document.getElementById('dev-hp').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if(!isNaN(val)) { player.hp = val; player.maxHp = val; }
});

document.getElementById('dev-speed').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    player.speed = val;
    document.getElementById('val-speed').innerText = val;
});

document.getElementById('dev-level').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if(!isNaN(val)) {
        sistemaNivel.nivel = val;
        if(typeof dispararEfeitosLevelUp === "function") dispararEfeitosLevelUp(val);
    }
});

document.getElementById('dev-kills').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if(!isNaN(val)) player.kills = val;
});

document.getElementById('dev-combo').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if(!isNaN(val)) { combo = val; comboTimer = 180; }
});

// --- LÓGICA DO SPAWN INTELIGENTE (LINHA ~105) ---
document.getElementById('btn-spawn').addEventListener('click', () => {
    let qtd = parseInt(document.getElementById('dev-spawn-qtd').value);
    const margemBorda = 50; 
    const distMinima = 300; 

    if(!isNaN(qtd) && qtd > 0) {
        for(let i = 0; i < qtd; i++) {
            let novoInimigo = new Enemy();
            let posX, posY, dist;
            let tentativas = 0;

            do {
                posX = margemBorda + Math.random() * (canvas.width - margemBorda * 2);
                posY = margemBorda + Math.random() * (canvas.height - margemBorda * 2);
                let dx = posX - player.x;
                let dy = posY - player.y;
                dist = Math.sqrt(dx * dx + dy * dy);
                tentativas++;
            } while (dist < distMinima && tentativas < 100);

            novoInimigo.x = posX;
            novoInimigo.y = posY;
            enemies.push(novoInimigo);
        }
    }
});

// Matar todos
document.getElementById('dev-kill-all').addEventListener('click', () => {
    enemies.forEach(en => en.hp = 0);
});

// Liberar Skills
document.getElementById('dev-unlock-skills').addEventListener('click', (e) => {
    Object.keys(cooldowns).forEach(key => cooldowns[key].unlock = 1);
    e.target.innerText = "SKILLS LIBERADAS!";
    setTimeout(() => e.target.innerText = "LIBERAR TODAS AS SKILLS", 1500);
});

// Cheat Sem Cooldown
setInterval(() => {
    if (document.getElementById('dev-nocd').checked) {
        Object.keys(cooldowns).forEach(key => cooldowns[key].lastUsed = 0);
    }
}, 50);

document.getElementById('close-dev').onclick = () => devPanel.style.display = 'none';
