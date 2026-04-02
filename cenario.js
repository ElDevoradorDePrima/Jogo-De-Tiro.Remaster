// --- cenario.js (Sistema de Fundo 3D Parallax) ---

class SistemaEstelar {
    constructor(largura, altura) {
        this.estrelas = [];
        this.quantidade = 200;

        // Cria estrelas aleatórias
        for (let i = 0; i < this.quantidade; i++) {
            this.estrelas.push({
                x: Math.random() * largura * 2, // Espaço maior que a tela
                y: Math.random() * altura * 2,
                tamanho: Math.random() * 2 + 0.5,
                // Estrelas menores movem-se mais devagar (mais distantes)
                parallax: Math.random() * 0.3 + 0.05,
                brilho: Math.random()
            });
        }
    }

    desenhar(ctx, canvas, playerX, playerY) {
        // Fundo espacial profundo
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenha as estrelas movendo-se na direção oposta ao jogador
        this.estrelas.forEach(estrela => {
            // O modulo (%) faz com que as estrelas reapareçam do outro lado da tela
            let sx = (estrela.x - (playerX * estrela.parallax)) % canvas.width;
            let sy = (estrela.y - (playerY * estrela.parallax)) % canvas.height;

            // Corrige posições negativas do modulo
            if (sx < 0) sx += canvas.width;
            if (sy < 0) sy += canvas.height;

            // Piscar das estrelas
            estrela.brilho += (Math.random() - 0.5) * 0.1;
            if (estrela.brilho > 1) estrela.brilho = 1;
            if (estrela.brilho < 0.2) estrela.brilho = 0.2;

            ctx.beginPath();
            ctx.arc(sx, sy, estrela.tamanho, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${estrela.brilho})`;
            ctx.fill();
        });
    }
}