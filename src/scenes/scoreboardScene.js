import Phaser from 'phaser';

export default class ScoreboardScene extends Phaser.Scene {
    constructor() {
        super('ScoreboardScene');
    }

    init(data) {
        this.cameFromMenu = data.cameFromMenu || false;
    }

    preload() {
        // avatarji
        for (let i = 1; i <= 14; i++) {
            this.load.image(`avatar${i}`, `src/avatars/avatar${i}.png`);
        }
    }

    create() {
        const { width, height } = this.scale;

        // ozadje
        this.add.rectangle(0, 0, width, height - 150, 0xe8e8e8).setOrigin(0);
        this.add.rectangle(0, height - 150, width, 150, 0xd4c4a8).setOrigin(0);

        // miza
        const tableX = width / 2;
        const tableY = height / 2 + 50;
        const tableWidth = 600;
        const tableHeight = 280;

        this.add.rectangle(tableX, tableY, tableWidth, 30, 0x8b4513).setOrigin(0.5);
        const surface = this.add.rectangle(
            tableX,
            tableY + 15,
            tableWidth - 30,
            tableHeight - 30,
            0xa0826d
        ).setOrigin(0.5, 0);

        // mreža
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x8b7355, 0.3);
        const gridSize = 30;
        const gridStartX = tableX - (tableWidth - 30) / 2;
        const gridStartY = tableY + 15;
        const gridEndX = tableX + (tableWidth - 30) / 2;
        const gridEndY = tableY + 15 + (tableHeight - 30);

        for (let x = gridStartX; x <= gridEndX; x += gridSize) {
            grid.beginPath();
            grid.moveTo(x, gridStartY);
            grid.lineTo(x, gridEndY);
            grid.strokePath();
        }
        for (let y = gridStartY; y <= gridEndY; y += gridSize) {
            grid.beginPath();
            grid.moveTo(gridStartX, y);
            grid.lineTo(gridEndX, y);
            grid.strokePath();
        }

        // nogice mize
        const legWidth = 20;
        const legHeight = 150;
        this.add.rectangle(
            tableX - tableWidth / 2 + 40,
            tableY + tableHeight / 2 + 20,
            legWidth,
            legHeight,
            0x654321
        );
        this.add.rectangle(
            tableX + tableWidth / 2 - 40,
            tableY + tableHeight / 2 + 20,
            legWidth,
            legHeight,
            0x654321
        );

        // okvir
        const panelWidth = 600;
        const panelHeight = 400;
        const panelX = width / 2 - panelWidth / 2;
        const panelY = height / 2 - panelHeight / 2 - 30;

        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.92);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);
        panel.lineStyle(3, 0xcccccc, 1);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

        // naslov
        this.add.text(width / 2, panelY + 35, 'LESTVICA', {
            fontFamily: 'Arial',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#222'
        }).setOrigin(0.5);

        // trenutno prijavljen user (za highlight)
        const loggedUsername = localStorage.getItem('username');

        // "Nalagam..." tekst
        const loadingText = this.add.text(width / 2, panelY + 100, 'Nalagam lestvico...', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#666'
        }).setOrigin(0.5);

        // naloži leaderboard iz backenda
        this.loadLeaderboard(panelX, panelY, panelWidth, loggedUsername, loadingText);

        // ESC tipka
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('LabScene');
        });

        // gumb nazaj (če ni prišel iz menija, ampak iz igre)
        if (this.cameFromMenu === false) {
            const backButton = this.add.text(width / 2, panelY + panelHeight - 40, '↩ Nazaj', {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#0066ff',
                padding: { x: 20, y: 10 }
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => backButton.setStyle({ color: '#0044cc' }))
                .on('pointerout', () => backButton.setStyle({ color: '#0066ff' }))
                .on('pointerdown', () => {
                    this.scene.start('WorkspaceScene');
                });
        }
    }

    loadLeaderboard(panelX, panelY, panelWidth, loggedUsername, loadingText) {
        fetch('/api/users/leaderboard')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Napaka pri fetchu leaderboarda');
                }
                return res.json();
            })
            .then(users => {
                loadingText.destroy(); // odstranimo "Nalagam..."

                if (!Array.isArray(users) || users.length === 0) {
                    this.add.text(panelX + panelWidth / 2, panelY + 140, 'Ni še rezultatov.', {
                        fontFamily: 'Arial',
                        fontSize: '22px',
                        color: '#666'
                    }).setOrigin(0.5);
                    return;
                }

                users.forEach((user, index) => {
                    const y = panelY + 90 + index * 35;
                    const rank = index + 1;

                    const avatarKey = user.avatarPath || 'avatar1';

                    // avatar
                    this.add.image(panelX + 60, y + 15, avatarKey)
                        .setDisplaySize(40, 40)
                        .setOrigin(0.5);

                    // mesto
                    this.add.text(panelX + 100, y + 5, `${rank}.`, {
                        fontSize: '22px',
                        color: '#444'
                    });

                    // ime (highlight, če je prijavljen user)
                    const style = (user.username === loggedUsername)
                        ? { fontSize: '22px', color: '#0f5cad', fontStyle: 'bold' }
                        : { fontSize: '22px', color: '#222' };

                    this.add.text(panelX + 140, y + 5, user.username, style);

                    // točke (uporabimo highScore)
                    this.add.text(panelX + panelWidth - 100, y + 5, `${user.highScore ?? 0}`, {
                        fontSize: '22px',
                        color: '#0044cc'
                    }).setOrigin(1, 0);
                });
            })
            .catch(err => {
                console.error(err);
                loadingText.setText('Napaka pri nalaganju lestvice.');
            });
    }
}