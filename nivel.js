/**
 * SISTEMA DE PROGRESSÃO CORE
 */
class SistemaNivel {
    constructor() {
        this.nivel = 1;
        this.xpAtual = 0;
        this.xpProximoNivel = 100;
        this.multiplicadorXP = 1.6; // Aumenta a quantidade de XP necessária em 60% por nível
    }

    ganharXP(quantidade) {
        this.xpAtual += quantidade;
        let subiu = false;
        
        // Verifica se subiu de nível (pode subir múltiplos níveis se ganhar muito XP de uma vez)
        while (this.xpAtual >= this.xpProximoNivel) {
            this.subirDeNivel();
            subiu = true;
        }
        
        this.atualizarInterfaceNivel();
        return subiu; // Retorna true para avisar o script.js que ocorreu um level up
    }

    subirDeNivel() {
        this.nivel++;
        this.xpAtual -= this.xpProximoNivel;
        this.xpProximoNivel = Math.floor(this.xpProximoNivel * this.multiplicadorXP);
    }

    atualizarInterfaceNivel() {
        const progresso = (this.xpAtual / this.xpProximoNivel) * 100;
        const bar = document.getElementById('xp-bar');
        const text = document.getElementById('nivel-text');
        
        if (bar) bar.style.width = progresso + '%';
        if (text) text.innerText = `NÍVEL: ${this.nivel} (SISTEMA EVOLUINDO)`;
    }

    resetar() {
        this.nivel = 1;
        this.xpAtual = 0;
        this.xpProximoNivel = 100;
        this.atualizarInterfaceNivel();
    }
}