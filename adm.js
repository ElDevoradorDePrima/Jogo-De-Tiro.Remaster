// adm.js - Painel de Desenvolvedor

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
    width: 250px; 
    border-radius: 10px;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
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
        <label style="cursor: pointer;">
            <input type="checkbox" id="dev-nocd"> SEM COOLDOWN (Cheat)
        </label>
    </div>

    <button id="close-dev" style="width: 100%; background: #0f0; color: #000; border: none; padding: 5px; cursor: pointer; font-weight: bold;">FECHAR PANEL [ESC]</button>
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

// 3. Funções de Sincronização e Atualização
function syncPanel() {
    document.getElementById('dev-hp').value = Math.floor(player.hp);
    document.getElementById('dev-speed').value = player.speed;
    document.getElementById('val-speed').innerText = player.speed;
    document.getElementById('dev-level').value = sistemaNivel.nivel;
    document.getElementById('dev-combo').value = combo; // Sincroniza o combo
}

// Eventos de alteração dos inputs
document.getElementById('dev-hp').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if(!isNaN(val)) {
        player.hp = val;
        player.maxHp = val;
    }
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

// --- LÓGICA DO COMBO ---
document.getElementById('dev-combo').addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if(!isNaN(val)) {
        combo = val;
        comboTimer = 180; // Dá um tempo de respiro para o combo não resetar na hora
    }
});

// --- LÓGICA DO SPAWN DE INIMIGOS ---
document.getElementById('btn-spawn').addEventListener('click', () => {
    let qtd = parseInt(document.getElementById('dev-spawn-qtd').value);
    if(!isNaN(qtd) && qtd > 0) {
        for(let i = 0; i < qtd; i++) {
            // Usa a classe Enemy já existente no script.js
            enemies.push(new Enemy());
        }
    }
});

// Lógica de resfriamento infinito
setInterval(() => {
    if (document.getElementById('dev-nocd').checked) {
        Object.keys(cooldowns).forEach(key => {
            cooldowns[key].lastUsed = 0; 
        });
    }
}, 50);

// Fechar painel
document.getElementById('close-dev').onclick = () => devPanel.style.display = 'none';
