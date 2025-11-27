// src/scenes/WorkspaceScene.js
import Phaser from 'phaser';
import LabScene from './labScene';

// logika
import {
  initWorkspaceLogic,
  loadChallengesFromApi,
  createComponent,
  checkCircuit,
  simulateCircuit,
  resetWorkspaceProgress,
  finalizeSession,
} from '../logic/workspaceSceneLogic';

export default class WorkspaceScene extends Phaser.Scene {
  constructor() {
    super('WorkspaceScene');
  }

  init() {
    this.currentChallengeIndex = 0;
  }

  preload() {
    // logika (graph, placedComponents, ...)
    initWorkspaceLogic(this);

    // asseti za izgled
    this.load.image('baterija', 'src/components/battery.png');
    this.load.image('upor', 'src/components/resistor.png');
    this.load.image('svetilka', 'src/components/lamp.png');
    this.load.image('stikalo-on', 'src/components/switch-on.png');
    this.load.image('stikalo-off', 'src/components/switch-off.png');
    this.load.image('žica', 'src/components/wire.png');
    this.load.image('ampermeter', 'src/components/ammeter.png');
    this.load.image('voltmeter', 'src/components/voltmeter.png');
  }

  create() {
    const { width, height } = this.cameras.main;
    localStorage.setItem('lastScene', 'WorkspaceScene');

    // površje mize + grid
    const desk = this.add
      .rectangle(0, 0, width, height, 0xe0c9a6)
      .setOrigin(0);
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x8b7355, 0.35);
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, height);
      gridGraphics.strokePath();
    }
    for (let y = 0; y < height; y += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(width, y);
      gridGraphics.strokePath();
    }

    // info okno
    this.infoWindow = this.add.container(0, 0);
    this.infoWindow.setDepth(1000);
    this.infoWindow.setVisible(false);

    const infoBox = this.add.rectangle(0, 0, 200, 80, 0x2c2c2c, 0.95);
    infoBox.setStrokeStyle(2, 0xffffff);
    const infoText = this.add
      .text(0, 0, '', {
        fontSize: '14px',
        color: '#ffffff',
        align: 'left',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);

    this.infoWindow.add([infoBox, infoText]);
    this.infoText = infoText;

    // text za izzive + feedback
    this.promptText = this.add
      .text(width / 1.8, height - 30, 'Nalagam izzive...', {
        fontSize: '20px',
        color: '#333',
        fontStyle: 'bold',
        backgroundColor: '#ffffff88',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5);

    this.checkText = this.add
      .text(width / 2, height - 70, '', {
        fontSize: '18px',
        color: '#cc0000',
        fontStyle: 'bold',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5);

    // gumbi
    const buttonWidth = 180;
    const buttonHeight = 45;
    const cornerRadius = 10;

    const makeButton = (x, y, label, onClick) => {
      const bg = this.add.graphics();
      bg.fillStyle(0x3399ff, 1);
      bg.fillRoundedRect(
        x - buttonWidth / 2,
        y - buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        cornerRadius
      );

      const text = this.add
        .text(x, y, label, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          bg.clear();
          bg.fillStyle(0x0f5cad, 1);
          bg.fillRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            cornerRadius
          );
        })
        .on('pointerout', () => {
          bg.clear();
          bg.fillStyle(0x3399ff, 1);
          bg.fillRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            cornerRadius
          );
        })
        .on('pointerdown', onClick);

      return { bg, text };
    };

    makeButton(width - 140, 75, 'Lestvica', () =>
      this.scene.start('ScoreboardScene', { cameFromMenu: false })
    );
    makeButton(width - 140, 125, 'Preveri krog', () => checkCircuit(this));
    makeButton(width - 140, 175, 'Simulacija', () =>
      simulateCircuit(this)
    );

    // stranska vrstica
    const panelWidth = 150;
    this.add.rectangle(0, 0, panelWidth, height, 0xc0c0c0).setOrigin(0);
    this.add
      .rectangle(0, 0, panelWidth, height, 0x000000, 0.2)
      .setOrigin(0);

    this.add
      .text(panelWidth / 2, 60, 'Komponente', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // komponente v stranski vrstici (kličeš logični helper)
    createComponent(this, panelWidth / 2, 100, 'baterija', 0xffcc00);
    createComponent(this, panelWidth / 2, 180, 'upor', 0xff6600);
    createComponent(this, panelWidth / 2, 260, 'svetilka', 0xff0000);
    createComponent(this, panelWidth / 2, 340, 'stikalo-on', 0x666666);
    createComponent(this, panelWidth / 2, 420, 'stikalo-off', 0x666666);
    createComponent(this, panelWidth / 2, 500, 'žica', 0x0066cc);
    createComponent(this, panelWidth / 2, 580, 'ampermeter', 0x00cc66);
    createComponent(this, panelWidth / 2, 660, 'voltmeter', 0x00cc66);

    // back button
    
    const backButton = this.add
    .text(12, 10, '↩ Nazaj', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#387affff',
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () =>
      backButton.setStyle({ color: '#0054fdff' })
    )
    .on('pointerout', () =>
      backButton.setStyle({ color: '#387affff' })
    )
    .on('pointerdown', async () => {
      // 1️⃣ zaključi session in pošlji score v bazo
      await finalizeSession(this);
    
      // 2️⃣ pobriši localStorage state za WorkspaceScene
      resetWorkspaceProgress();
    
      // 3️⃣ označi, da zadnja scena ni več Workspace
      localStorage.setItem('lastScene', 'LabScene');
    
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('LabScene');
      });
    });

    this.add
      .text(
        width / 2 + 50,
        30,
        'Povleci komponente na mizo in zgradi svoj električni krog!',
        {
          fontSize: '20px',
          color: '#333',
          fontStyle: 'bold',
          align: 'center',
          backgroundColor: '#ffffff88',
          padding: { x: 15, y: 8 },
        }
      )
      .setOrigin(0.5);

    console.log(JSON.parse(localStorage.getItem('users')));

    // naloži izzive iz backenda
    loadChallengesFromApi(this);
  }
}