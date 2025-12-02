// src/logic/workspaceSceneLogic.js
import Phaser from 'phaser';
import { Battery } from '../components/battery';
import { Bulb } from '../components/bulb';
import { Wire } from '../components/wire';
import { Resistor } from '../components/resistor';
import { Switch } from '../components/switch';

import { CircuitGraph } from './circuit_graph';
import { Node } from './node';

// kateri ključi v localStorage so povezani z igranjem v WorkspaceScene
const WORKSPACE_STORAGE_KEYS = ['currentChallengeIndex'];

/**
 * Pobriše vse podatke o igranju za WorkspaceScene iz localStorage.
 * Kličeš, ko uporabnik zapusti WorkspaceScene (nazaj gumb).
 */
export function resetWorkspaceProgress() {
  WORKSPACE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

/**
 * Inicializira logiko za WorkspaceScene.
 * Kličeš v preload() scene.
 */
export function initWorkspaceLogic(scene) {
  scene.graph = new CircuitGraph();
  scene.placedComponents = [];
  scene.gridSize = 40;
  scene.challenges = [];
  scene.sim = undefined;
  scene.sessionPoints = 0;
}

/**
 * Naloži izzive iz API-ja in posodobi promptText.
 */
export function loadChallengesFromApi(scene) {
  fetch('/api/challenges')
    .then((res) => {
      if (!res.ok) throw new Error('Napaka pri nalaganju izzivov');
      return res.json();
    })
    .then((challenges) => {
      if (!Array.isArray(challenges) || challenges.length === 0) {
        scene.promptText.setText('Ni definiranih izzivov.');
        return;
      }

      scene.challenges = challenges;

      if (scene.currentChallengeIndex >= scene.challenges.length) {
        scene.currentChallengeIndex = 0;
        localStorage.removeItem('currentChallengeIndex');
      }

      const current = scene.challenges[scene.currentChallengeIndex];
      scene.promptText.setText(current.prompt);
    })
    .catch((err) => {
      console.error(err);
      scene.promptText.setText('Napaka pri nalaganju izzivov.');
    });
}

function getComponentDetails(type) {
  const details = {
    baterija: 'Baterija je vir napetosti\n\nNapetost: 3.3 V\n+ pol (rdeč) = pozitivni pol\n− pol (moder) = negativni pol\n\nPriklopi žico na + in − pol za sklenitev vezja',
    upor: 'Uporabnost: omejuje tok\nMeri se v ohmih (Ω)',
    svetilka: 'Pretvarja električno energijo v svetlobo',
    'stikalo-on': 'Dovoljuje pretok toka',
    'stikalo-off': 'Prepreči pretok toka',
    žica: 'Povezuje komponente\nKlikni za obračanje',
    ampermeter: 'Meri električni tok\nEnota: amperi (A)',
    voltmeter: 'Meri električno napetost\nEnota: volti (V)',
  };
  return details[type] || 'Komponenta';
}

function snapToGrid(scene, x, y) {
  const gridSize = scene.gridSize;
  const startX = 200;

  const snappedX = Math.round((x - startX) / gridSize) * gridSize + startX;
  const snappedY = Math.round(y / gridSize) * gridSize;

  return { x: snappedX, y: snappedY };
}

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

function updateLogicNodePositions(scene, component) {
  const comp = component.getData('logicComponent');
  if (!comp) return;

  const halfW = 40;
  const halfH = 40;

  const localStart = comp.localStart || { x: -halfW, y: 0 };
  const localEnd = comp.localEnd || { x: halfW, y: 0 };

const theta = Phaser.Math.DegToRad(
  component.getData('rotation') || 0
);

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const rotate = (p) => ({
    x: Math.round(p.x * cos - p.y * sin),
    y: Math.round(p.x * sin + p.y * cos),
  });

  const rStart = rotate(localStart);
  const rEnd = rotate(localEnd);

  const worldStart = { x: component.x + rStart.x, y: component.y + rStart.y };
  const worldEnd = { x: component.x + rEnd.x, y: component.y + rEnd.y };

  const snappedStart = snapToGrid(scene, worldStart.x, worldStart.y);
  const snappedEnd = snapToGrid(scene, worldEnd.x, worldEnd.y);

  if (comp.start) {
    comp.start.x = snappedStart.x;
    comp.start.y = snappedStart.y;
    if (!comp.start.connected) comp.start.connected = new Set();
    scene.graph.addNode(comp.start);
  }
  if (comp.end) {
    comp.end.x = snappedEnd.x;
    comp.end.y = snappedEnd.y;
    if (!comp.end.connected) comp.end.connected = new Set();
    scene.graph.addNode(comp.end);
  }

  const startDot = component.getData('startDot');
  const endDot = component.getData('endDot');
  if (startDot && comp.start) {
    startDot.x = comp.start.x;
    startDot.y = comp.start.y;
  }
  if (endDot && comp.end) {
    endDot.x = comp.end.x;
    endDot.y = comp.end.y;
  }
}

/**
 * Ustvari eno komponento (baterija, žica, stikalo, …) v sceni.
 */
export function createComponent(scene, x, y, type, color) {
  const component = scene.add.container(x, y);

  let comp = null;
  let componentImage;
  let id;

  switch (type) {
    case 'baterija':
      id = 'bat_' + getRandomInt(1000, 9999);
      comp = new Battery(
        id,
        new Node(id + '_start', -40, 0),
        new Node(id + '_end', 40, 0),
        3.3
      );
      comp.type = 'battery';
      comp.localStart = { x: -40, y: 0 };
      comp.localEnd = { x: 40, y: 0 };
      componentImage = scene.add
        .image(0, 0, 'baterija')
        .setOrigin(0.5)
        .setDisplaySize(130, 130);
      component.add(componentImage);
      
      // Add + and - pole labels for clarity
      const plusLabel = scene.add
        .text(-25, -15, '+', {
          fontSize: '24px',
          color: '#ff0000',
          fontStyle: 'bold',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);
      const minusLabel = scene.add
        .text(25, -15, '−', {
          fontSize: '24px',
          color: '#0000ff',
          fontStyle: 'bold',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);
      component.add([plusLabel, minusLabel]);
      component.setData('plusLabel', plusLabel);
      component.setData('minusLabel', minusLabel);
      
      component.setData('logicComponent', comp);
      break;

    case 'upor':
      id = 'res_' + getRandomInt(1000, 9999);
      comp = new Resistor(
        id,
        new Node(id + '_start', -40, 0),
        new Node(id + '_end', 40, 0),
        1.5
      );
      comp.type = 'resistor';
      comp.localStart = { x: -40, y: 0 };
      comp.localEnd = { x: 40, y: 0 };
      componentImage = scene.add
        .image(0, 0, 'upor')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      component.setData('logicComponent', comp);
      break;

    case 'svetilka':
      id = 'bulb_' + getRandomInt(1000, 9999);
      comp = new Bulb(
        id,
        new Node(id + '_start', -40, 0),
        new Node(id + '_end', 40, 0)
      );
      comp.type = 'bulb';
      comp.localStart = { x: -40, y: 0 };
      comp.localEnd = { x: 40, y: 0 };
      componentImage = scene.add
        .image(0, 0, 'svetilka')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      component.setData('logicComponent', comp);
      break;

    case 'stikalo-on':
      id = 'switch_' + getRandomInt(1000, 9999);
      comp = new Switch(
        id,
        new Node(id + '_start', -40, 0),
        new Node(id + '_end', 40, 0),
        true
      );
      comp.type = 'switch';
      comp.localStart = { x: -40, y: 0 };
      comp.localEnd = { x: 40, y: 0 };
      componentImage = scene.add
        .image(0, 0, 'stikalo-on')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      component.setData('logicComponent', comp);
      break;

    case 'stikalo-off':
      id = 'switch_' + getRandomInt(1000, 9999);
      comp = new Switch(
        id,
        new Node(id + '_start', -40, 0),
        new Node(id + '_end', 40, 0),
        false
      );
      comp.type = 'switch';
      comp.localStart = { x: -40, y: 0 };
      comp.localEnd = { x: 40, y: 0 };
      componentImage = scene.add
        .image(0, 0, 'stikalo-off')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      component.setData('logicComponent', comp);
      break;

    case 'žica':
      id = 'wire_' + getRandomInt(1000, 9999);
      comp = new Wire(
        id,
        new Node(id + '_start', -40, 0),
        new Node(id + '_end', 40, 0)
      );
      comp.type = 'wire';
      comp.localStart = { x: -40, y: 0 };
      comp.localEnd = { x: 40, y: 0 };
      
      componentImage = scene.add
        .image(0, 0, 'žica')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      
      component.setData('logicComponent', comp);
      break;

    case 'ampermeter':
      id = 'ammeter_' + getRandomInt(1000, 9999);
      componentImage = scene.add
        .image(0, 0, 'ampermeter')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      component.setData('logicComponent', null);
      break;

    case 'voltmeter':
      id = 'voltmeter_' + getRandomInt(1000, 9999);
      componentImage = scene.add
        .image(0, 0, 'voltmeter')
        .setOrigin(0.5)
        .setDisplaySize(100, 100);
      component.add(componentImage);
      component.setData('logicComponent', null);
      break;
  }

  component.on('pointerover', () => {
    if (component.getData('isInPanel')) {
      const details = getComponentDetails(type);
      scene.infoText.setText(details);
      
      // Calculate dynamic box size based on text
      const textBounds = scene.infoText.getBounds();
      const padding = 20;
      const boxWidth = Math.max(textBounds.width + padding * 2, 200);
      const boxHeight = Math.max(textBounds.height + padding * 2, 60);
      
      // Update box size
      scene.infoBox.setSize(boxWidth, boxHeight);
      scene.infoBox.setDisplaySize(boxWidth, boxHeight);
      
      // Position to the right of component with larger offset
      scene.infoWindow.x = x + boxWidth / 2 + 90;
      scene.infoWindow.y = y;
      scene.infoWindow.setVisible(true);
    }
    component.setScale(1.1);
  });

  component.on('pointerout', () => {
    if (component.getData('isInPanel')) {
      scene.infoWindow.setVisible(false);
    }
    component.setScale(1);
  });

  const label = scene.add
    .text(0, 30, type, {
      fontSize: '11px',
      color: '#fff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5);
  component.add(label);

  component.setSize(70, 70);
  component.setInteractive({ draggable: true, useHandCursor: true });

  component.setData('originalX', x);
  component.setData('originalY', y);
  component.setData('type', type);
  component.setData('color', color);
  component.setData('isInPanel', true);
  component.setData('rotation', 0);
  if (comp) component.setData('logicComponent', comp);
  component.setData('isDragging', false);
  component.setData('wasDragged', false);

  scene.input.setDraggable(component);

  component.on('dragstart', () => {
    component.setData('isDragging', true);
  });

  component.on('drag', (pointer, dragX, dragY) => {
    component.x = dragX;
    component.y = dragY;
    component.setData('wasDragged', true);
  });

  component.on('dragend', () => {
    const isInPanel = component.x < 200;

    if (isInPanel && !component.getData('isInPanel')) {
      component.destroy();
    } else if (!isInPanel && component.getData('isInPanel')) {
      const snapped = snapToGrid(scene, component.x, component.y);
      component.x = snapped.x;
      component.y = snapped.y;

      const compLogic = component.getData('logicComponent');
      if (compLogic) {
        scene.graph.addComponent(compLogic);
        if (compLogic.start) scene.graph.addNode(compLogic.start);
        if (compLogic.end) scene.graph.addNode(compLogic.end);
      }

      updateLogicNodePositions(scene, component);

      component.setData('isRotated', false);
      component.setData('isInPanel', false);

      // Show first-time battery tutorial
      if (type === 'baterija' && !localStorage.getItem('batteryTutorialShown')) {
        showBatteryTutorial(scene);
        localStorage.setItem('batteryTutorialShown', 'true');
      }

      // ponovno ustvarimo "template" v panelu
      createComponent(
        scene,
        component.getData('originalX'),
        component.getData('originalY'),
        component.getData('type'),
        component.getData('color')
      );

      scene.placedComponents.push(component);
    } else if (!component.getData('isInPanel')) {
      const snapped = snapToGrid(scene, component.x, component.y);
      component.x = snapped.x;
      component.y = snapped.y;
      updateLogicNodePositions(scene, component);
    } else {
      component.x = component.getData('originalX');
      component.y = component.getData('originalY');
      updateLogicNodePositions(scene, component);
    }

    component.setData('isDragging', false);
  });


  component.on('pointerup', (pointer) => {
    console.log('pointerup on component', type);
    if (component.getData('isInPanel')) return;
    if (component.getData('wasDragged')) {
      component.setData('wasDragged', false);
      return;
    }

    const currentRotation = component.getData('rotation') || 0;
    console.log('Current rotation:', currentRotation);
    const logicalRotation = (currentRotation + 90) % 360; // for your own data
    component.setData('rotation', logicalRotation);
    component.setData('isRotated', !component.getData('isRotated'));
    updateLogicNodePositions(scene, component);
    const targetAngle = componentImage.angle + 90; // always +90 from current

    scene.tweens.add({
  targets: componentImage,
  angle: targetAngle,
  duration: 150,
  ease: 'Cubic.easeOut',
  onComplete: () => {
    updateLogicNodePositions(scene, componentImage);
  }
});
  });
}

/**
 * Show battery tutorial for first-time users
 */
function showBatteryTutorial(scene) {
  const { width, height } = scene.cameras.main;

  const tutorialBack = scene.add
    .rectangle(width / 2, height / 2, 500, 200, 0x1e40af, 0.95)
    .setOrigin(0.5)
    .setDepth(1000)
    .setStrokeStyle(3, 0xffffff, 1);

  const tutorialTitle = scene.add
    .text(width / 2, height / 2 - 60, '💡 Navodilo: Baterija', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(1001);

  const tutorialText = scene.add
    .text(
      width / 2,
      height / 2 - 10,
      'Baterija je vir napetosti.\n\nPriklopi žico na + (rdeč) in − (moder) pol,\nda zaključiš vezje in ustvariš električni tok.',
      {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 450 },
      }
    )
    .setOrigin(0.5)
    .setDepth(1001);

  const closeButton = scene.add
    .text(width / 2, height / 2 + 70, 'Razumem', {
      fontSize: '18px',
      color: '#1e40af',
      backgroundColor: '#ffffff',
      padding: { x: 24, y: 10 },
    })
    .setOrigin(0.5)
    .setDepth(1001)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => closeButton.setStyle({ backgroundColor: '#e5e7eb' }))
    .on('pointerout', () => closeButton.setStyle({ backgroundColor: '#ffffff' }))
    .on('pointerdown', () => {
      tutorialBack.destroy();
      tutorialTitle.destroy();
      tutorialText.destroy();
      closeButton.destroy();
    });
}

/**
 * Simulira krog in nastavi scene.sim + checkText.
 */
export function simulateCircuit(scene) {
  scene.connected = scene.graph.simulate();
  if (scene.connected === 1) {
    scene.checkText.setStyle({ color: '#00aa00' });
    scene.checkText.setText('Električni tok je sklenjen');
    scene.sim = true;
    return;
  }
  scene.checkText.setStyle({ color: '#cc0000' });
  if (scene.connected === -1) {
    scene.checkText.setText('Manjka ti baterija');
  } else if (scene.connected === -2) {
    scene.checkText.setText('Stikalo je izklopljeno');
  } else if (scene.connected === 0) {
    scene.checkText.setText('Električni tok ni sklenjen');
  }
  scene.sim = false;
}

/**
 * Preveri krog glede na trenutni izziv.
 */
export function checkCircuit(scene) {
    if (!scene.challenges || scene.challenges.length === 0) {
      scene.checkText.setStyle({ color: '#cc0000' });
      scene.checkText.setText('Izzivi se še nalagajo...');
      return;
    }
  
    const currentChallenge = scene.challenges[scene.currentChallengeIndex];
    const placedTypes = scene.placedComponents.map((comp) =>
      comp.getData('type')
    );
    console.log('components', placedTypes);
  
    scene.checkText.setStyle({ color: '#cc0000' });
  
    if (
      !currentChallenge.requiredComponents.every((req) =>
        placedTypes.includes(req)
      )
    ) {
      scene.checkText.setText('Manjkajo komponente za krog.');
      return;
    }
  
    if (scene.sim === undefined) {
      scene.checkText.setText('Zaženi simulacijo');
      return;
    }
  
    if (scene.sim === false) {
      scene.checkText.setText(
        'Električni krog ni sklenjen. Preveri kako si ga sestavil'
      );
      return;
    }
  
    // ✅ krog je pravilen
    scene.checkText.setStyle({ color: '#00aa00' });
    scene.checkText.setText('Čestitke! Krog je pravilen.');
  
    const basePoints = 10;
    const multiplier = currentChallenge.pointsMultiplier || 1;
    const totalPoints = basePoints * multiplier;
  
    // 👉 TE točke gredo v trenutni session, ne direkt v bazo
    scene.sessionPoints = (scene.sessionPoints || 0) + totalPoints;
    console.log('Session points (trenutni):', scene.sessionPoints);
  
    if (currentChallenge.theory && currentChallenge.theory.length > 0) {
      showTheory(scene, currentChallenge.theory);
    } else {
      scene.time.delayedCall(2000, () => nextChallenge(scene));
    }
  }

export function nextChallenge(scene) {
  scene.currentChallengeIndex++;
  localStorage.setItem(
    'currentChallengeIndex',
    scene.currentChallengeIndex.toString()
  );
  scene.checkText.setText('');

  if (!scene.challenges || scene.challenges.length === 0) {
    scene.promptText.setText('Izzivi se še nalagajo...');
    return;
  }

  if (scene.currentChallengeIndex < scene.challenges.length) {
    const current = scene.challenges[scene.currentChallengeIndex];
    scene.promptText.setText(current.prompt);
  } else {
    scene.promptText.setText(
      'Vse naloge so uspešno opravljene! Čestitke!'
    );
    localStorage.removeItem('currentChallengeIndex');
  }
}

/**
 * Pošlje točke v bazo.
 */
export async function addPoints(scene, sessionScore) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.warn('Ni userId v localStorage – uporabnik ni prijavljen?');
      return;
    }
  
    if (!sessionScore || sessionScore <= 0) {
      console.log('SessionScore je 0 ali neobstoječ, ne pošiljam v bazo.');
      return;
    }
  
    try {
      const res = await fetch(`/api/users/${userId}/scores`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionScore }),
      });
  
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Napaka pri posodobitvi točk:', err.message || res.status);
      } else {
        const updatedUser = await res.json();
        console.log(
          'Session zaključen:',
          sessionScore,
          ' | Zadnji session (points):',
          updatedUser.points,
          ' | HighScore:',
          updatedUser.highScore,
          ' | Total:',
          updatedUser.totalPoints
        );
      }
    } catch (e) {
      console.error('Napaka pri povezavi s strežnikom (točke):', e);
    }
  }

export function showTheory(scene, theoryText) {
  const { width, height } = scene.cameras.main;

  const textToShow = Array.isArray(theoryText)
    ? theoryText.join('\n\n')
    : theoryText;

  scene.theoryBack = scene.add
    .rectangle(width / 2, height / 2, width - 100, 150, 0x000000, 0.8)
    .setOrigin(0.5)
    .setDepth(10);

  scene.theoryText = scene.add
    .text(width / 2, height / 2, textToShow, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 150 },
    })
    .setOrigin(0.5)
    .setDepth(11);

  scene.continueButton = scene.add
    .text(width / 2, height / 2 + 70, 'Nadaljuj', {
      fontSize: '18px',
      color: '#0066ff',
      backgroundColor: '#ffffff',
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0.5)
    .setDepth(11)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () =>
      scene.continueButton.setStyle({ color: '#0044cc' })
    )
    .on('pointerout', () =>
      scene.continueButton.setStyle({ color: '#0066ff' })
    )
    .on('pointerdown', () => {
      hideTheory(scene);
      scene.placedComponents.forEach((comp) => comp.destroy());
      scene.placedComponents = [];
      nextChallenge(scene);
    });
}

export function hideTheory(scene) {
  if (scene.theoryBack) {
    scene.theoryBack.destroy();
    scene.theoryBack = null;
  }
  if (scene.theoryText) {
    scene.theoryText.destroy();
    scene.theoryText = null;
  }
  if (scene.continueButton) {
    scene.continueButton.destroy();
    scene.continueButton = null;
  }
}

export async function finalizeSession(scene) {
    const sessionScore = scene.sessionPoints || 0;
    await addPoints(scene, sessionScore);
  
    // lokalni reset sessiona (baza hrani lastSession / total / highScore)
    scene.sessionPoints = 0;
  }
