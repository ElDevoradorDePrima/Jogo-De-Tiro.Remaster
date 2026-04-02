class SistemaEstelar {
    constructor(largura, altura) {
        this.estrelas = [];
        this.quantidade = 150;

        for (let i = 0; i < this.quantidade; i++) {
            this.estrelas.push({
                x: Math.random() * largura * 2,
                y: Math.random() * altura * 2,
                tamanho: Math.random() * 2 + 0.5,
                parallax: Math.random() * 0.2 + 0.02, // Estrelas mais lentas para focar na grelha
                brilho: Math.random()
            });
        }
    }

    desenhar(ctx, canvas, playerX, playerY, timeScale) {
        // Fundo escuro profundo
        ctx.fillStyle = '#010105';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Desenhar a Grelha Synthwave Dinâmica (Chão Virtual)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 128, 0.15)'; // Rosa néon sutil
        ctx.lineWidth = 1;
        
        const gridSize = 100;
        // O offset cria a ilusão de que a grelha se move com o jogador
        const offsetX = -(playerX * 0.5) % gridSize;
        const offsetY = -(playerY * 0.5) % gridSize;

        ctx.beginPath();
        // Linhas Verticais
        for (let x = offsetX - gridSize; x < canvas.width + gridSize; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        // Linhas Horizontais
        for (let y = offsetY - gridSize; y < canvas.height + gridSize; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
        ctx.restore();

        // 2. Desenhar Estrelas (Background profundo)
        this.estrelas.forEach(estrela => {
            let moveX = (playerX * estrela.parallax * timeScale);
            let moveY = (playerY * estrela.parallax * timeScale);

            let sx = (estrela.x - moveX) % canvas.width;
            let sy = (estrela.y - moveY) % canvas.height;

            if (sx < 0) sx += canvas.width;
            if (sy < 0) sy += canvas.height;

            estrela.brilho += (Math.random() - 0.5) * 0.1 * timeScale;
            if (estrela.brilho > 1) estrela.brilho = 1;
            if (estrela.brilho < 0.2) estrela.brilho = 0.2;

            ctx.beginPath();
            ctx.arc(sx, sy, estrela.tamanho, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 200, 255, ${estrela.brilho})`;
            ctx.fill();
        });
    }
}
