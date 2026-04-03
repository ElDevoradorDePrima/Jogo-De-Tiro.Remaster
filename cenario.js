class SistemaEstelar {
    constructor(largura, altura) {
        this.estrelas = [];
        for (let i = 0; i < 150; i++) {
            this.estrelas.push({
                x: Math.random() * largura * 2,
                y: Math.random() * altura * 2,
                tamanho: Math.random() * 2 + 0.5,
                parallax: Math.random() * 0.15 + 0.02,
                brilho: Math.random()
            });
        }
    }

    desenhar(ctx, canvas, playerX, playerY, timeScale) {
        ctx.fillStyle = '#010105';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grelha Synthwave
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 128, 0.12)';
        const gridSize = 100;
        const offX = -(playerX * 0.5) % gridSize;
        const offY = -(playerY * 0.5) % gridSize;
        ctx.beginPath();
        for (let x = offX - gridSize; x < canvas.width + gridSize; x += gridSize) {
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = offY - gridSize; y < canvas.height + gridSize; y += gridSize) {
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
        ctx.restore();

        // Estrelas
        this.estrelas.forEach(e => {
            let sx = (e.x - (playerX * e.parallax * timeScale)) % canvas.width;
            let sy = (e.y - (playerY * e.parallax * timeScale)) % canvas.height;
            if (sx < 0) sx += canvas.width; if (sy < 0) sy += canvas.height;
            ctx.beginPath();
            ctx.arc(sx, sy, e.tamanho, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 230, 255, ${e.brilho})`;
            ctx.fill();
        });
    }
}