(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const screens = ['titleScreen', 'onlineScreen', 'selectScreen', 'pauseScreen', 'endScreen'];
  const COLORS = {
    bg: '#090914', text: '#f6f2ff', muted: '#aaa4c1', cyan: '#4de4ef', pink: '#fa3d95', gold: '#ffd17e'
  };

  const ROSTER = [
    { id: 'kagura', name: 'KAGURA', epithet: 'BLAZING LOTUS', role: 'Rushdown · Twin-blade pressure', bio: 'A swift twin-blade fighter who strings precise slashes into a relentless crimson flurry.', hair: '#251725', hair2: '#a52e52', skin: '#f3c3b8', suit: '#25131f', suit2: '#7f2441', accent: '#ff477e', armor: '#df426e', style: 0, weapon: 'twin blades', portrait: './assets/characters/kagura/portrait.jpg' },
    { id: 'aurelia', name: 'AURELIA VOSS', epithet: 'ECLIPSE DUELIST', role: 'Balanced · Blade rush', bio: 'A disciplined moon-blade duelist who converts forward pressure into sharp, elegant strings.', hair: '#f1c5dc', hair2: '#a54e91', skin: '#f3c7b1', suit: '#26284e', suit2: '#5865a6', accent: '#59e1ea', armor: '#b9ecf3', style: 0, weapon: 'moon blade' },
    { id: 'kestrel', name: 'KAIA KESTREL', epithet: 'STORM BRAWLER', role: 'Rushdown · Close pressure', bio: 'A fearless hand-to-hand striker with explosive movement, feints and punishing close-range cancels.', hair: '#e8a55e', hair2: '#9f3d3e', skin: '#dba17d', suit: '#57263c', suit2: '#ae426a', accent: '#ffc875', armor: '#f6c36f', style: 1, weapon: 'impact gauntlets' },
    { id: 'nyx', name: 'NYX KAGAMI', epithet: 'VEIL ASSASSIN', role: 'Mobile · Trick angles', bio: 'A shadow-step specialist who uses evasive movement and low-profile attacks to open defenses.', hair: '#b6b7ed', hair2: '#49487c', skin: '#e7bcae', suit: '#202a38', suit2: '#405b74', accent: '#b3a0ff', armor: '#c9c1ff', style: 2, weapon: 'ribbon blades' },
    { id: 'seraphine', name: 'SERAPHINE RYU', epithet: 'ARC CASTER', role: 'Midrange · Burst control', bio: 'A stylish arc-tech combatant who shapes radiant energy into strings that keep opponents guessing.', hair: '#78d9d0', hair2: '#247f8c', skin: '#f0c3a8', suit: '#173c45', suit2: '#2d8c8b', accent: '#f78ecb', armor: '#91eee0', style: 3, weapon: 'arc fans' }
  ];
  const KAGURA_ANIMATIONS = {
    idle:       { url: './assets/characters/kagura/animations/idle.png', cols: 4, rows: 3, cell: 256, fps: 6.5, loop: true },
    walk:       { url: './assets/characters/kagura/animations/walk.png', cols: 4, rows: 2, cell: 256, fps: 10, loop: true },
    dash:       { url: './assets/characters/kagura/animations/dash.png', cols: 5, rows: 4, cell: 256, fps: 22, loop: true },
    jump:       { url: './assets/characters/kagura/animations/jump.png', cols: 5, rows: 3, cell: 256, fps: 13, loop: true },
    twinStab:   { url: './assets/characters/kagura/animations/twin-stab.png', cols: 4, rows: 4, cell: 512, fps: 30, loop: false },
    bladeFlurry:{ url: './assets/characters/kagura/animations/blade-flurry.png', cols: 4, rows: 4, cell: 512, fps: 30, loop: false }
  };
  const kaguraImages = {};
  Object.entries(KAGURA_ANIMATIONS).forEach(([key, info]) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = info.url;
    kaguraImages[key] = img;
  });
  const MOVES = {
    light: { id: 'light', name: 'QUICK STRIKE', duration: .30, startup: .055, damage: 5, armorDamage: 13, range: 91, stun: .25, knock: 105, target: 'upper', meter: 8, color: '#effbff' },
    heavy: { id: 'heavy', name: 'BREAKING BLOW', duration: .44, startup: .105, damage: 9, armorDamage: 24, range: 112, stun: .39, knock: 205, target: 'middle', meter: 12, color: '#ffd17e' },
    special: { id: 'special', name: 'VEIL ART', duration: .53, startup: .075, damage: 13, armorDamage: 31, range: 148, stun: .48, knock: 275, target: 'lower', meter: 20, color: '#fa3d95' },
    assist: { id: 'assist', name: 'PARTNER STRIKE', duration: .26, startup: .02, damage: 7, armorDamage: 21, range: 160, stun: .29, knock: 160, target: 'middle', meter: 0, color: '#4de4ef' }
  };
  const ARMOR_LAYERS = ['shoulderL', 'shoulderR', 'chestplate', 'waistL', 'waistR', 'thighL', 'thighR'];
  const LAYER_TARGETS = {
    upper: ['shoulderL', 'shoulderR', 'chestplate'],
    middle: ['waistL', 'waistR', 'chestplate'],
    lower: ['thighL', 'thighR', 'waistL', 'waistR']
  };

  let W = window.innerWidth, H = window.innerHeight, DPR = 1;
  let lastFrame = 0, globalTime = 0, screenShake = 0, screenFlash = 0;
  let gameStarted = false, gamePaused = false, gameMode = 'local', matchTime = 99, roundTimer = 99;
  let fighters = [], effects = [], floatTexts = [], backgroundStars = [];
  let roundCallout = '', roundCalloutTimer = 0, matchFinished = false, matchResult = '';
  let snapshotClock = 0, toastClock = 0, toastHideTimer = 0, aiLevel = 1;
  let audioCtx = null, announcerEnabled = true;
  const keysDown = new Set();
  const keysPressed = new Set();
  const touchState = { 1: new Set(), 2: new Set() };
  const prevGamepad = { 1: [], 2: [] };
  const selection = [
    { fighter: 'kagura', partner: 'kestrel' },
    { fighter: 'nyx', partner: 'seraphine' }
  ];
  const readyState = [false, false];
  let peerLoadPromise = null;
  const net = {
    peer: null, conn: null, role: null, connected: false, remoteInput: {}, lastRemoteSelection: null,
    reconnecting: false, lastSnapshotAt: 0, remoteReady: false, localReady: false, error: null
  };

  function resize() {
    const oldW = W || window.innerWidth;
    W = Math.max(320, window.innerWidth);
    H = Math.max(260, window.innerHeight);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (fighters.length && oldW > 0 && Math.abs(oldW - W) > 1) {
      const ratio = W / oldW;
      fighters.forEach(f => { f.x *= ratio; });
    }
    backgroundStars = Array.from({ length: Math.min(100, Math.floor(W / 10)) }, (_, i) => ({
      x: ((i * 131.7) % W), y: ((i * 79.1) % (H * .62)), r: .3 + ((i * 17) % 12) / 10, phase: (i * .7) % 6
    }));
    if (gameStarted) updateTouchVisibility();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function setView(id) {
    screens.forEach(screenId => $(screenId).classList.toggle('hidden', screenId !== id));
    $('matchTopbar').classList.toggle('hidden', !gameStarted || id === 'pauseScreen' || id === 'endScreen');
    updateTouchVisibility();
  }
  function updateTouchVisibility() {
    const show = gameStarted && !gamePaused && !matchFinished && matchCanUseTouch();
    $('touchP1').style.display = show && (gameMode !== 'online-guest') ? 'flex' : (show ? 'none' : 'none');
    $('touchP2').style.display = show && gameMode !== 'training' && gameMode !== 'online-host' ? 'flex' : 'none';
    if (gameMode === 'online-host') $('touchP2').style.display = 'none';
  }
  function matchCanUseTouch() { return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760; }
  function setNetworkStatus(message, error = false) {
    const node = $('networkStatus');
    node.textContent = message;
    node.style.borderLeftColor = error ? COLORS.pink : COLORS.magenta;
  }
  function showToast(message, duration = 2200) {
    const node = $('toast');
    node.textContent = message;
    node.classList.remove('hidden');
    toastHideTimer = globalTime + duration / 1000;
  }
  function character(id) { return ROSTER.find(c => c.id === id) || ROSTER[0]; }

  function populateSelects() {
    const fighterOptions = ROSTER.map(c => `<option value="${c.id}">${c.name} — ${c.epithet}</option>`).join('');
    const partnerOptions = ROSTER.map(c => `<option value="${c.id}">${c.name} · ASSIST</option>`).join('');
    ['p1Fighter', 'p2Fighter'].forEach(id => $(id).innerHTML = fighterOptions);
    ['p1Partner', 'p2Partner'].forEach(id => $(id).innerHTML = partnerOptions);
    $('p1Fighter').value = selection[0].fighter;
    $('p1Partner').value = selection[0].partner;
    $('p2Fighter').value = selection[1].fighter;
    $('p2Partner').value = selection[1].partner;
    $('rosterStrip').innerHTML = ROSTER.map(c => `<div class="roster-chip">${c.portrait ? `<img class="chip-portrait" src="${c.portrait}" alt="${c.name}">` : `<span class="chip-swatch" style="background:linear-gradient(145deg,${c.accent},${c.suit2})"></span>`}<div><b>${c.name}</b><small>${c.role}</small></div></div>`).join('');
    refreshSelectionUI();
  }
  function refreshSelectionUI() {
    for (let i = 0; i < 2; i++) {
      const c = character(selection[i].fighter), p = character(selection[i].partner);
      $(`p${i + 1}Hint`).textContent = `${p.name}: ${p.weapon} assist · ${p.role.split('·')[0].trim()}`;
      $(`p${i + 1}Summary`).innerHTML = `${c.portrait ? `<img class="summary-portrait" src="${c.portrait}" alt="">` : ''}<strong>${c.name}</strong><br><span>${c.epithet}</span><br>${c.bio}`;
    }
    if (gameMode === 'online-host' || (gameMode === 'online' && net.role === 'host')) {
      $('p2Fighter').disabled = $('p2Partner').disabled = true;
      $('p1Fighter').disabled = $('p1Partner').disabled = false;
      $('p1RoleNote').textContent = 'YOU · HOST'; $('p2RoleNote').textContent = net.connected ? 'OPPONENT · GUEST' : 'WAITING FOR OPPONENT';
    } else if (gameMode === 'online-guest' || (gameMode === 'online' && net.role === 'guest')) {
      $('p1Fighter').disabled = $('p1Partner').disabled = true;
      $('p2Fighter').disabled = $('p2Partner').disabled = false;
      $('p1RoleNote').textContent = 'OPPONENT · HOST'; $('p2RoleNote').textContent = 'YOU · GUEST';
    } else {
      $('p1Fighter').disabled = $('p1Partner').disabled = false;
      $('p2Fighter').disabled = $('p2Partner').disabled = false;
      $('p1RoleNote').textContent = gameMode === 'training' ? 'YOU · PLAYER ONE' : 'PLAYER ONE';
      $('p2RoleNote').textContent = gameMode === 'training' ? 'CPU OPPONENT' : 'PLAYER TWO';
    }
    const online = gameMode === 'online' || gameMode === 'online-host' || gameMode === 'online-guest';
    if (online) {
      $('readyStatus').innerHTML = `${net.connected ? '<strong>CONNECTED</strong>' : '<strong>WAITING FOR CONNECTION</strong>'} · ${readyState[0] ? 'P1 READY' : 'P1 NOT READY'} · ${readyState[1] ? 'P2 READY' : 'P2 NOT READY'}`;
      $('startMatchButton').innerHTML = (net.role === 'host' ? 'READY / START WHEN BOTH READY' : 'READY UP') + ' <span>↗</span>';
      $('startMatchButton').disabled = !net.connected;
    } else {
      $('readyStatus').textContent = gameMode === 'training' ? 'Use Player One controls. CPU difficulty: adaptive prototype.' : 'Choose two fighters and a partner for each side.';
      $('startMatchButton').innerHTML = 'ENTER THE ARENA <span>↗</span>';
      $('startMatchButton').disabled = false;
    }
  }
  populateSelects();

  function updateLocalSelection(index) {
    selection[index].fighter = $(`p${index + 1}Fighter`).value;
    selection[index].partner = $(`p${index + 1}Partner`).value;
    if (selection[index].partner === selection[index].fighter) {
      const fallback = ROSTER.find(c => c.id !== selection[index].fighter);
      selection[index].partner = fallback.id;
      $(`p${index + 1}Partner`).value = fallback.id;
    }
    refreshSelectionUI();
    if (net.connected && net.role) {
      netSend({ type: 'select', player: net.role === 'host' ? 0 : 1, selection: { ...selection[net.role === 'host' ? 0 : 1] } });
    }
  }
  ['p1Fighter', 'p1Partner'].forEach(id => $(id).addEventListener('change', () => updateLocalSelection(0)));
  ['p2Fighter', 'p2Partner'].forEach(id => $(id).addEventListener('change', () => updateLocalSelection(1)));

  function beginSetup(mode) {
    gameMode = mode;
    readyState[0] = readyState[1] = false;
    refreshSelectionUI();
    setView('selectScreen');
  }
  $('localButton').addEventListener('click', () => { unlockAudio(); beginSetup('local'); });
  $('trainingButton').addEventListener('click', () => { unlockAudio(); beginSetup('training'); });
  $('onlineButton').addEventListener('click', () => {
    unlockAudio(); gameMode = 'online'; readyState[0] = readyState[1] = false;
    $('roomInfo').classList.add('hidden'); setNetworkStatus('Create a room or join an existing room code.'); setView('onlineScreen');
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => setView(button.dataset.close)));
  $('selectBackButton').addEventListener('click', () => {
    if (gameMode === 'online' || gameMode === 'online-host' || gameMode === 'online-guest') setView('onlineScreen'); else setView('titleScreen');
  });

  function unlockAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  }
  function tone(freq, duration, type = 'sine', gain = .035, slide = 0) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator(), vol = audioCtx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), audioCtx.currentTime + duration);
      vol.gain.setValueAtTime(gain, audioCtx.currentTime);
      vol.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
      osc.connect(vol); vol.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (_) { /* Audio can be unavailable in privacy modes. */ }
  }
  function sound(type) {
    if (type === 'hit') { tone(150, .09, 'triangle', .065, -95); tone(650, .055, 'square', .016, -300); }
    else if (type === 'armor') { tone(740, .18, 'sawtooth', .04, -570); tone(240, .15, 'triangle', .05, 80); }
    else if (type === 'dash') { tone(310, .12, 'sawtooth', .025, 460); }
    else if (type === 'special') { tone(190, .22, 'sawtooth', .035, 850); tone(520, .25, 'triangle', .025, -140); }
    else if (type === 'menu') { tone(500, .06, 'sine', .02, 180); }
    else if (type === 'ko') { tone(95, .45, 'sawtooth', .05, -55); }
  }
  function announce(text, force = false) {
    roundCallout = text; roundCalloutTimer = 1.45;
    if (force || text === 'FIGHT!' || text === 'ARMOR BREAK!' || text === 'K.O.!' || text.includes('PERFECT')) {
      if (announcerEnabled && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text.replace('K.O.!', 'Knock out!').replace('!', ''));
          const voices = window.speechSynthesis.getVoices();
          const deepVoice = voices.find(v => /david|mark|daniel|alex|fred|guy|male|tom/i.test(v.name) && /^en/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
          if (deepVoice) utterance.voice = deepVoice;
          utterance.pitch = .55; utterance.rate = .84; utterance.volume = .85;
          window.speechSynthesis.speak(utterance);
        } catch (_) { /* Native announcer is an optional browser capability. */ }
      }
    }
  }

  function newFighter(player, fighterId, partnerId, x) {
    const c = character(fighterId);
    return {
      player, charId: c.id, partnerId, x, lane: player === 1 ? .12 : -.12, vx: 0,
      hp: 100, maxHp: 100, armorHP: 100, maxArmor: 100, meter: 45, maxMeter: 100,
      facing: player === 1 ? 1 : -1, action: 'idle', actionTime: 0, actionDuration: 0,
      moveId: null, moveHit: false, move: null, moveTargetX: 0, jumpY: 0, jumpV: 0,
      dashCooldown: 0, assistCooldown: 0, assistTimer: 0, assistHit: false,
      hitStun: 0, hitFlash: 0, invuln: 0, combo: 0, comboTimer: 0, armorStage: 0,
      armorLayers: { shoulderL: true, shoulderR: true, chestplate: true, waistL: true, waistR: true, thighL: true, thighR: true },
      prev: {}, lastInput: {}, walkPhase: Math.random() * 6, attackChain: 0, lastMoveTime: 0,
      assistX: x, assistLane: 0, win: false, inputLock: 0
    };
  }

  function startMatch() {
    gameStarted = true; gamePaused = false; matchFinished = false; matchResult = '';
    roundTimer = 99; matchTime = 99; screenShake = 0; screenFlash = 0; effects = []; floatTexts = [];
    fighters = [
      newFighter(1, selection[0].fighter, selection[0].partner, W * .31),
      newFighter(2, selection[1].fighter, selection[1].partner, W * .69)
    ];
    fighters[0].facing = 1; fighters[1].facing = -1;
    roundCallout = 'READY?'; roundCalloutTimer = .65;
    $('matchModeLabel').textContent = gameMode === 'training' ? 'TRAINING' : gameMode.startsWith('online') ? 'ONLINE DUEL' : 'LOCAL VERSUS';
    setView(null);
    $('matchTopbar').classList.remove('hidden');
    updateTouchVisibility();
    setTimeout(() => { if (gameStarted && !gamePaused) { announce('FIGHT!', true); sound('menu'); } }, 680);
  }
  function startOnlineMatch(authoritative) {
    if (!net.connected && authoritative) { showToast('Waiting for your opponent to connect.'); return; }
    gameMode = authoritative ? 'online-host' : 'online-guest';
    startMatch();
    if (authoritative) netSend({ type: 'match-start', selection: selection.map(s => ({ ...s })) });
  }
  $('startMatchButton').addEventListener('click', () => {
    unlockAudio(); sound('menu');
    const online = gameMode === 'online' || gameMode === 'online-host' || gameMode === 'online-guest';
    if (!online) { startMatch(); return; }
    if (!net.connected) { showToast('Connect to an opponent before readying up.'); return; }
    const player = net.role === 'host' ? 0 : 1;
    readyState[player] = true; net.localReady = true;
    netSend({ type: 'ready', player, selection: { ...selection[player] } });
    refreshSelectionUI();
    if (net.role === 'host') checkOnlineReady();
    else showToast('Ready sent. Waiting for host and opponent to be ready.');
  });
  function checkOnlineReady() {
    if (net.role === 'host' && net.connected && readyState[0] && readyState[1] && !gameStarted) startOnlineMatch(true);
  }

  function clearNet() {
    try { if (net.conn) net.conn.close(); } catch (_) {}
    try { if (net.peer && !net.peer.destroyed) net.peer.destroy(); } catch (_) {}
    net.peer = null; net.conn = null; net.role = null; net.connected = false; net.remoteInput = {};
    net.remoteReady = false; net.localReady = false; net.lastRemoteSelection = null;
    readyState[0] = readyState[1] = false;
  }
  function ensurePeerJS() {
    if (window.Peer) return Promise.resolve(true);
    if (peerLoadPromise) return peerLoadPromise;
    peerLoadPromise = new Promise(resolve => {
      const sources = [
        'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
        'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'
      ];
      let index = 0;
      const attempt = () => {
        if (window.Peer) { resolve(true); return; }
        if (index >= sources.length) { peerLoadPromise = null; resolve(false); return; }
        const script = document.createElement('script');
        script.async = true;
        script.id = `peerjs-dynamic-loader-${index + 1}`;
        script.src = sources[index++];
        let settled = false;
        const failover = () => {
          if (settled) return;
          settled = true;
          script.remove();
          attempt();
        };
        script.onload = () => {
          if (window.Peer) { settled = true; resolve(true); }
          else failover();
        };
        script.onerror = failover;
        document.head.appendChild(script);
        window.setTimeout(() => { if (!window.Peer) failover(); }, 6500);
      };
      attempt();
    });
    return peerLoadPromise;
  }

  function setUpPeerCommon() {
    if (!window.Peer) {
      setNetworkStatus('PeerJS did not load. Check your connection, then try again. Local play still works.', true);
      return false;
    }
    clearNet();
    try {
      net.peer = new Peer(undefined, { debug: 1, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
      net.peer.on('error', err => {
        net.error = err;
        setNetworkStatus(`Network error: ${err.type || err.message || 'connection failed'}. Local play still works.`, true);
      });
      net.peer.on('disconnected', () => setNetworkStatus('Signaling disconnected. Attempting to reconnect…', true));
      return true;
    } catch (err) {
      setNetworkStatus(`Could not start online mode: ${err.message}`, true);
      return false;
    }
  }
  function openConnectedView() {
    gameMode = 'online';
    refreshSelectionUI();
    setView('selectScreen');
    updateTouchVisibility();
  }
  function makeConnection(conn, role) {
    net.conn = conn; net.role = role;
    const onOpen = () => {
      if (net.connected) return;
      net.connected = true;
      setNetworkStatus(`Connected to ${role === 'host' ? 'guest' : 'host'} · both players can now select their duo.`);
      netSend({ type: 'hello', role, selection: { ...selection[role === 'host' ? 0 : 1] } });
      openConnectedView();
    };
    conn.on('open', onOpen);
    conn.on('data', handleNetMessage);
    conn.on('close', () => {
      net.connected = false;
      setNetworkStatus('Opponent disconnected. You can return to the menu or try again.', true);
      if (gameStarted && gameMode.startsWith('online')) showToast('Opponent disconnected. Match sync has stopped.', 4000);
    });
    conn.on('error', err => setNetworkStatus(`Connection error: ${err.message || 'unknown error'}`, true));
    if (conn.open) setTimeout(onOpen, 0);
  }
  $('createRoomButton').addEventListener('click', async () => {
    unlockAudio(); setNetworkStatus('Loading online connection tools…'); $('roomInfo').classList.add('hidden');
    const peerLoaded = await ensurePeerJS();
    if (!peerLoaded) { setNetworkStatus('PeerJS could not load from the CDN. Check your connection or try Local Versus.', true); return; }
    if (!setUpPeerCommon()) return;
    net.role = 'host';
    net.peer.on('open', id => {
      $('roomCode').textContent = id;
      $('roomInfo').classList.remove('hidden');
      setNetworkStatus('Room is open. Share the code and wait for your opponent.');
    });
    net.peer.on('connection', conn => { makeConnection(conn, 'host'); });
  });
  $('joinRoomButton').addEventListener('click', async () => {
    unlockAudio();
    const room = $('roomCodeInput').value.trim();
    if (!room) { setNetworkStatus('Enter the host’s room code first.', true); return; }
    setNetworkStatus('Loading online connection tools…');
    const peerLoaded = await ensurePeerJS();
    if (!peerLoaded) { setNetworkStatus('PeerJS could not load from the CDN. Check your connection or try Local Versus.', true); return; }
    setNetworkStatus('Connecting to room…');
    if (!setUpPeerCommon()) return;
    net.role = 'guest';
    net.peer.on('open', () => {
      try {
        const conn = net.peer.connect(room, { reliable: true, serialization: 'json' });
        makeConnection(conn, 'guest');
      } catch (err) { setNetworkStatus(`Could not join room: ${err.message}`, true); }
    });
  });
  $('copyRoomButton').addEventListener('click', async () => {
    const code = $('roomCode').textContent;
    try { await navigator.clipboard.writeText(code); showToast('Room code copied.'); }
    catch (_) { const range = document.createRange(); range.selectNodeContents($('roomCode')); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); showToast('Room code selected. Copy it manually.'); }
  });
  function netSend(data) {
    if (!net.conn || !net.connected || !net.conn.open) return;
    try { net.conn.send(data); } catch (_) { /* A dropped data channel is reported by PeerJS close/error handlers. */ }
  }
  function handleNetMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'hello') {
      const opponentIndex = msg.role === 'guest' ? 1 : 0;
      if (msg.selection) {
        selection[opponentIndex] = { fighter: msg.selection.fighter || selection[opponentIndex].fighter, partner: msg.selection.partner || selection[opponentIndex].partner };
        applySelectionValues();
      }
      refreshSelectionUI();
    } else if (msg.type === 'select') {
      const p = msg.player === 0 ? 0 : 1;
      if (msg.selection && (net.role === 'host' ? p === 1 : p === 0)) {
        selection[p] = { fighter: msg.selection.fighter, partner: msg.selection.partner };
        applySelectionValues(); refreshSelectionUI();
      }
    } else if (msg.type === 'ready') {
      const p = msg.player === 0 ? 0 : 1;
      readyState[p] = true;
      if (msg.selection) {
        selection[p] = { fighter: msg.selection.fighter || selection[p].fighter, partner: msg.selection.partner || selection[p].partner };
        applySelectionValues();
      }
      refreshSelectionUI();
      checkOnlineReady();
    } else if (msg.type === 'match-start' && net.role === 'guest') {
      if (msg.selection && Array.isArray(msg.selection)) {
        selection[0] = { ...msg.selection[0] }; selection[1] = { ...msg.selection[1] }; applySelectionValues();
      }
      startOnlineMatch(false);
    } else if (msg.type === 'input' && net.role === 'host') {
      net.remoteInput = msg.input || {};
    } else if (msg.type === 'snapshot' && net.role === 'guest') {
      applySnapshot(msg.snapshot);
    } else if (msg.type === 'event' && net.role === 'guest') {
      handleRemoteEvent(msg.event);
    } else if (msg.type === 'match-end' && net.role === 'guest') {
      finishMatch(msg.result || 'MATCH OVER', false);
    }
  }
  function applySelectionValues() {
    ['p1Fighter', 'p1Partner', 'p2Fighter', 'p2Partner'].forEach((id, i) => {
      const p = i < 2 ? 0 : 1;
      const field = i % 2 === 0 ? 'fighter' : 'partner';
      $(id).value = selection[p][field];
    });
  }

  function createInput(left = false, right = false, jump = false, crouch = false, near = false, far = false, light = false, heavy = false, special = false, assist = false, dash = false, guard = false) {
    return { left, right, jump, crouch, near, far, light, heavy, special, assist, dash, guard };
  }
  function anyKey(...names) { return names.some(name => { const key = String(name).toLowerCase(); return keysDown.has(key) || keysPressed.has(key); }); }
  function gamepadInput(player) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[player - 1] || (player === 1 ? pads[0] : null);
    if (!pad) return createInput();
    const axisX = pad.axes?.[0] || 0, axisY = pad.axes?.[1] || 0;
    const b = pad.buttons || [];
    const down = i => !!b[i] && (b[i].pressed || b[i].value > .5);
    return createInput(axisX < -.35 || down(14), axisX > .35 || down(15), axisY < -.55 || down(12), axisY > .55 || down(13), down(6), down(7), down(0), down(1), down(2), down(3), down(4), down(5) || down(8));
  }
  function getInput(player) {
    const g = gamepadInput(player), t = touchState[player];
    if (player === 1) {
      return createInput(
        anyKey('a') || g.left || t.has('left'), anyKey('d') || g.right || t.has('right'), anyKey('w') || g.jump || t.has('jump'), anyKey('s') || g.crouch || t.has('crouch'), anyKey('e') || g.near, anyKey('q') || g.far,
        anyKey('f') || g.light || t.has('light'), anyKey('g') || g.heavy || t.has('heavy'), anyKey('h') || g.special || t.has('special'), anyKey('r') || g.assist || t.has('assist'), anyKey('x') || g.dash || t.has('dash'), anyKey('c') || g.guard || t.has('guard')
      );
    }
    return createInput(
      anyKey('arrowleft') || g.left || t.has('left'), anyKey('arrowright') || g.right || t.has('right'), anyKey('arrowup') || g.jump || t.has('jump'), anyKey('arrowdown') || g.crouch || t.has('crouch'), anyKey('numpad9', 'u') || g.near, anyKey('numpad7', 'o') || g.far,
      anyKey('numpad1', '1') || g.light || t.has('light'), anyKey('numpad2', '2') || g.heavy || t.has('heavy'), anyKey('numpad3', '3') || g.special || t.has('special'), anyKey('numpad0', '0') || g.assist || t.has('assist'), anyKey('numpaddecimal', 'shiftright', '.') || g.dash || t.has('dash'), anyKey('rightcontrol', 'control') || g.guard || t.has('guard')
    );
  }
  function justPressed(f, input, key) { return !!input[key] && !f.prev[key]; }

  function startAttack(f, moveId) {
    const move = MOVES[moveId];
    if (!move || f.hitStun > 0 || f.invuln > 0) return;
    if (moveId === 'special' && f.meter < 25 && gameMode !== 'training') {
      // A dry special becomes a brisk light follow-up rather than freezing the player.
      moveId = 'light';
    }
    if (moveId === 'special' && gameMode !== 'training') f.meter = Math.max(0, f.meter - 25);
    f.move = { ...MOVES[moveId] };
    f.moveId = moveId; f.action = 'attack'; f.actionTime = 0; f.actionDuration = f.move.duration;
    f.moveHit = false; f.attackChain = Math.min(99, f.attackChain + 1); f.lastMoveTime = globalTime;
    f.inputLock = 0;
    if (moveId === 'special') { sound('special'); addFX('ring', f.x + f.facing * 35, groundYFor(f) - 96, character(f.charId).accent, 11); }
    else if (moveId === 'heavy') { sound('menu'); }
  }
  function startDash(f, input) {
    if (f.dashCooldown > 0 || f.hitStun > 0) return;
    let dir = input.left ? -1 : input.right ? 1 : f.facing;
    if (input.left && input.right) dir = f.facing;
    f.facing = dir;
    f.action = 'dash'; f.actionTime = 0; f.actionDuration = .19;
    f.dashCooldown = .32; f.invuln = Math.max(f.invuln, .08); f.vx = dir * 530;
    sound('dash'); addFX('dash', f.x - dir * 20, groundYFor(f) - 78, character(f.charId).accent, 8);
    f.move = null; f.moveId = null; f.moveHit = false; // Cancels attack startup/recovery instantly.
  }
  function makeAssistMove(partnerId) {
    const c = character(partnerId);
    const variants = [
      { name: 'MOON CROSS', damage: 8, armorDamage: 18, range: 176, stun: .34, knock: 190, target: 'upper', meter: 7 },
      { name: 'STORM FIST', damage: 10, armorDamage: 27, range: 128, stun: .42, knock: 235, target: 'middle', meter: 9 },
      { name: 'SHADOW STEP', damage: 6, armorDamage: 16, range: 205, stun: .28, knock: 95, target: 'lower', meter: 6 },
      { name: 'ARC BLOOM', damage: 8, armorDamage: 25, range: 190, stun: .36, knock: 160, target: 'upper', meter: 8 }
    ];
    return { ...MOVES.assist, ...variants[c.style] , color: c.accent };
  }
  function startAssist(f) {
    if (f.assistCooldown > 0 || f.hitStun > 0) return;
    f.assistCooldown = 5.5; f.assistTimer = .45; f.assistHit = false;
    f.assistMove = makeAssistMove(f.partnerId);
    f.assistX = f.x - f.facing * 70; f.assistLane = f.lane + .08;
    addFX('assist', f.x + f.facing * 35, groundYFor(f) - 60, character(f.partnerId).accent, 12);
    addFloatText(f.assistMove.name, f.x + f.facing * 58, groundYFor(f) - 160, character(f.partnerId).accent);
    sfxAssist();
  }
  function sfxAssist() { tone(420, .11, 'triangle', .03, 260); }
  function processInput(f, input, dt) {
    if (!input) input = createInput();
    const previous = f.prev || {};
    const pressed = key => !!input[key] && !previous[key];
    if (pressed('dash')) startDash(f, input);
    else if (pressed('assist')) startAssist(f);
    else if (pressed('special')) startAttack(f, 'special');
    else if (pressed('heavy')) startAttack(f, 'heavy');
    else if (pressed('light')) startAttack(f, 'light');

    // Directional movement and dash cancels stay live during attack recovery.
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction) {
      const c = character(f.charId);
      let speed = 255;
      if (f.action === 'attack') speed = 186;
      if (f.action === 'hit') speed = 65;
      if (f.action === 'dash') speed = 510;
      const target = direction * speed;
      f.vx += (target - f.vx) * Math.min(1, dt * (f.action === 'dash' ? 18 : 12));
      if (f.action !== 'attack' && f.action !== 'hit' && f.action !== 'dash' && f.jumpY <= 0 && !input.guard) f.action = 'walk';
      if (f.action !== 'attack' && f.action !== 'dash') f.facing = direction;
    } else if (f.action !== 'dash') {
      const friction = f.action === 'attack' ? 3.6 : 9.5;
      f.vx += (0 - f.vx) * Math.min(1, dt * friction);
      if (Math.abs(f.vx) < 7) f.vx = 0;
    }
    if (pressed('jump') && f.jumpY <= 0 && f.hitStun <= 0 && f.action !== 'dash') {
      f.jumpV = 415; f.action = 'jump'; f.actionTime = 0;
    }
    if (input.near) f.lane = Math.min(1, f.lane + dt * 1.15);
    if (input.far) f.lane = Math.max(-1, f.lane - dt * 1.15);
    if (input.guard && f.hitStun <= 0 && f.action !== 'attack' && f.action !== 'dash' && f.jumpY <= 0) f.action = 'guard';

    f.prev = { ...input };
    f.lastInput = input;
  }

  function groundYFor(f) { return H * .785 + f.lane * Math.min(26, H * .028); }
  function updateFighter(f, other, input, dt) {
    f.actionTime += dt;
    f.dashCooldown = Math.max(0, f.dashCooldown - dt);
    f.assistCooldown = Math.max(0, f.assistCooldown - dt);
    f.assistTimer = Math.max(0, f.assistTimer - dt);
    f.hitStun = Math.max(0, f.hitStun - dt);
    f.invuln = Math.max(0, f.invuln - dt);
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    f.comboTimer = Math.max(0, f.comboTimer - dt);
    if (f.comboTimer <= 0) f.combo = 0;
    f.facing = other.x >= f.x ? 1 : -1;
    if (input) processInput(f, input, dt);

    if (f.jumpY > 0 || f.jumpV > 0) {
      f.jumpY += f.jumpV * dt;
      f.jumpV -= 1040 * dt;
      if (f.jumpY <= 0) { f.jumpY = 0; f.jumpV = 0; if (f.action === 'jump') f.action = 'idle'; }
    }
    if (f.action === 'dash') {
      f.vx = f.facing * Math.max(150, Math.abs(f.vx) * .965);
      if (f.actionTime > f.actionDuration) { f.action = 'idle'; f.actionTime = 0; }
    } else if (f.action === 'attack' && f.move) {
      if (!f.moveHit && f.actionTime >= f.move.startup) resolveAttack(f, other, f.move);
      if (f.actionTime >= f.move.duration) {
        f.action = Math.abs(f.vx) > 24 ? 'walk' : 'idle'; f.actionTime = 0; f.move = null; f.moveId = null; f.moveHit = false;
      }
    } else if (f.action === 'hit') {
      if (f.hitStun <= 0) { f.action = Math.abs(f.vx) > 25 ? 'walk' : 'idle'; f.actionTime = 0; }
    } else if (f.action === 'guard') {
      if (!f.lastInput?.guard) { f.action = 'idle'; f.actionTime = 0; }
    } else if (f.action === 'walk' && Math.abs(f.vx) < 12) { f.action = 'idle'; f.actionTime = 0; }
    else if (f.action === 'idle' && (Math.abs(f.vx) > 24 || (input && (input.left || input.right)))) f.action = 'walk';
    else if (f.action === 'walk' && input && !input.left && !input.right && Math.abs(f.vx) < 45) { f.action = 'idle'; f.actionTime = 0; }

    f.x += f.vx * dt;
    f.x = Math.max(35, Math.min(W - 35, f.x));
    if (f.assistTimer > 0 && !f.assistHit && f.assistTimer < .30) {
      const d = Math.abs(other.x - (f.x + f.facing * 82));
      if (d < 166 && Math.abs(other.lane - f.lane) < .8) {
        f.assistHit = true;
        applyHit(f, other, f.assistMove || MOVES.assist, true);
      }
    }
  }
  function resolveAttack(attacker, defender, move) {
    attacker.moveHit = true;
    const dist = Math.abs(defender.x - attacker.x);
    const inFront = (defender.x - attacker.x) * attacker.facing >= -25;
    const laneOkay = Math.abs(defender.lane - attacker.lane) < .78;
    const airborneOkay = defender.jumpY < 95 || move.id === 'special';
    if (dist <= move.range + Math.abs(attacker.vx) * .045 && inFront && laneOkay && airborneOkay) {
      applyHit(attacker, defender, move, false);
    } else {
      addFX('whiff', attacker.x + attacker.facing * move.range * .58, groundYFor(attacker) - 86 - attacker.jumpY, move.color, 4);
    }
  }
  function availableLayer(target) {
    const wanted = LAYER_TARGETS[target] || ARMOR_LAYERS;
    return wanted.find(layer => fighters.some(f => f.armorLayers[layer])) || ARMOR_LAYERS.find(layer => fighters.some(f => f.armorLayers[layer]));
  }
  function breakLayer(defender, target) {
    const preferred = LAYER_TARGETS[target] || ARMOR_LAYERS;
    let layer = preferred.find(name => defender.armorLayers[name]);
    if (!layer) layer = ARMOR_LAYERS.find(name => defender.armorLayers[name]);
    if (!layer) return false;
    defender.armorLayers[layer] = false;
    const y = ({ shoulderL: -113, shoulderR: -113, chestplate: -96, waistL: -76, waistR: -76, thighL: -52, thighR: -52 })[layer] || -85;
    addFX('shard', defender.x, groundYFor(defender) + y - defender.jumpY, character(defender.charId).armor, 9);
    sound('armor'); screenShake = Math.max(screenShake, 6);
    announce('ARMOR BREAK!', true);
    return true;
  }
  function applyHit(attacker, defender, move, isAssist) {
    if (defender.invuln > 0) return;
    let damage = move.damage, armorDamage = move.armorDamage;
    if (defender.action === 'guard' && defender.lastInput?.guard) { damage *= .34; armorDamage *= .55; addFX('guard', defender.x, groundYFor(defender) - 86, COLORS.cyan, 8); }
    defender.hp = Math.max(0, defender.hp - damage);
    const armorBefore = defender.armorHP;
    defender.armorHP = Math.max(0, defender.armorHP - armorDamage);
    defender.meter = Math.min(defender.maxMeter, defender.meter + 4);
    attacker.meter = Math.min(attacker.maxMeter, attacker.meter + move.meter);
    attacker.combo = attacker.comboTimer > 0 ? attacker.combo + 1 : 1;
    attacker.comboTimer = 1.35;
    defender.hitStun = Math.max(defender.hitStun, move.stun);
    defender.action = 'hit'; defender.actionTime = 0; defender.actionDuration = move.stun;
    defender.move = null; defender.moveId = null; defender.moveHit = true;
    defender.vx = attacker.facing * move.knock;
    if (move.id === 'special') defender.jumpV = Math.max(defender.jumpV, 85);
    defender.hitFlash = .16;
    screenShake = Math.max(screenShake, move.id === 'special' ? 9 : move.id === 'heavy' ? 6 : 3);
    addFX(move.id === 'special' ? 'specialhit' : move.id === 'heavy' ? 'heavyhit' : isAssist ? 'assistHit' : 'hit', (attacker.x + defender.x) / 2, groundYFor(defender) - 95 - defender.jumpY, move.color, move.id === 'special' ? 22 : 12);
    addFloatText(`-${Math.round(damage)}`, defender.x, groundYFor(defender) - 128 - defender.jumpY, move.color);
    sound('hit');
    if (net.role === 'host' && gameMode === 'online-host') netSend({ type: 'event', event: { type: 'hit', x: (attacker.x + defender.x) / 2, y: groundYFor(defender) - 90, color: move.color, combo: attacker.combo } });
    const oldStage = defender.armorStage;
    defender.armorStage = Math.min(ARMOR_LAYERS.length, Math.floor((defender.maxArmor - defender.armorHP + .001) / (defender.maxArmor / ARMOR_LAYERS.length)));
    if (defender.armorStage > oldStage) {
      for (let i = oldStage; i < defender.armorStage; i++) breakLayer(defender, move.target);
    }
    if (armorBefore > 0 && defender.armorHP <= 0) {
      screenFlash = .24; announce('ARMOR SHATTERED!', true); addFX('burst', defender.x, groundYFor(defender) - 95, COLORS.gold, 30);
    }
    if (attacker.combo >= 3) addFloatText(`${attacker.combo} HIT`, attacker.x + attacker.facing * 46, groundYFor(attacker) - 157 - attacker.jumpY, COLORS.gold);
    if (net.role === 'host' && gameMode === 'online-host') netSend({ type: 'event', event: { type: 'armor', x: defender.x, y: groundYFor(defender) - 94, broken: defender.armorStage > oldStage, combo: attacker.combo } });
    if (defender.hp <= 0) finishMatch(attacker.player === 1 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS', true);
  }
  function handleRemoteEvent(event) {
    if (!event) return;
    if (event.type === 'hit') { addFX('specialhit', event.x || W / 2, event.y || H / 2, event.color || COLORS.cyan, 12); sound('hit'); }
    else if (event.type === 'armor') { addFX(event.broken ? 'shard' : 'hit', event.x || W / 2, event.y || H / 2, COLORS.gold, 9); if (event.broken) sound('armor'); }
  }

  function getAIInput(cpu, player, dt) {
    const distance = player.x - cpu.x, facingDirection = Math.sign(distance) || -1;
    const nearLane = Math.abs(player.lane - cpu.lane) > .25;
    const r = Math.random();
    const input = createInput(distance < -100, distance > 110, false, false, nearLane && player.lane > cpu.lane, nearLane && player.lane < cpu.lane, false, false, false, false, false, false);
    if (Math.abs(distance) > 125) { input.left = distance < 0; input.right = distance > 0; }
    else {
      if (cpu.dashCooldown <= 0 && r < .025) input.dash = true;
      if (cpu.action !== 'attack' && cpu.hitStun <= 0) {
        if (r < .12 * aiLevel) input.light = true;
        else if (r < .19 * aiLevel) input.heavy = true;
        else if (r < .24 * aiLevel && cpu.meter >= 25) input.special = true;
        if (r > .96) input.guard = true;
      }
    }
    // CPU gets a slightly broader awareness window, not bonus damage.
    if (Math.abs(distance) < 135 && cpu.action !== 'attack' && cpu.action !== 'hit' && r < .03) input.light = true;
    return input;
  }

  function separateFighters() {
    if (fighters.length !== 2) return;
    const [a, b] = fighters;
    if (Math.abs(a.lane - b.lane) > .78 || Math.abs(a.jumpY - b.jumpY) > 88) return;
    const minGap = Math.min(66, Math.max(48, H * .072));
    let gap = Math.abs(b.x - a.x);
    if (gap >= minGap) return;
    const direction = b.x >= a.x ? 1 : -1;
    const overlap = minGap - gap;
    a.x -= direction * overlap * .5;
    b.x += direction * overlap * .5;
    a.x = Math.max(35, Math.min(W - 35, a.x));
    b.x = Math.max(35, Math.min(W - 35, b.x));
    if (direction > 0) {
      if (a.vx > 0) a.vx *= .42;
      if (b.vx < 0) b.vx *= .42;
    } else {
      if (a.vx < 0) a.vx *= .42;
      if (b.vx > 0) b.vx *= .42;
    }
  }

  function updateGame(dt) {
    if (!gameStarted || matchFinished) return;
    if (gamePaused) { if (gameMode === 'online-guest') netSend({ type: 'input', input: createInput() }); return; }
    updateEffects(dt);
    if (gameMode === 'online-guest') {
      const input = getInput(2);
      netSend({ type: 'input', input });
      return;
    }
    matchTime = Math.max(0, matchTime - dt); roundTimer = Math.ceil(matchTime);
    const p1Input = getInput(1);
    const p2Input = gameMode === 'online-host' ? (net.remoteInput || createInput()) : gameMode === 'training' ? getAIInput(fighters[1], fighters[0], dt) : getInput(2);
    // Move facing is refreshed after input as well so cross-ups remain responsive.
    updateFighter(fighters[0], fighters[1], p1Input, dt);
    updateFighter(fighters[1], fighters[0], p2Input, dt);
    separateFighters();
    if (gameMode === 'online-host') {
      snapshotClock += dt;
      if (snapshotClock >= .035) { snapshotClock = 0; netSend({ type: 'snapshot', snapshot: makeSnapshot() }); }
    }
    if (matchTime <= 0 && !matchFinished) {
      const result = fighters[0].hp === fighters[1].hp ? 'DRAW' : fighters[0].hp > fighters[1].hp ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
      finishMatch(result, true);
    }
  }
  function makeSnapshot() {
    return {
      timer: matchTime, fighters: fighters.map(f => ({ player: f.player, charId: f.charId, partnerId: f.partnerId, x: f.x, lane: f.lane, vx: f.vx, hp: f.hp, armorHP: f.armorHP, meter: f.meter, facing: f.facing, action: f.action, actionTime: f.actionTime, actionDuration: f.actionDuration, moveId: f.moveId, moveHit: f.moveHit, move: f.move ? { ...f.move } : null, jumpY: f.jumpY, jumpV: f.jumpV, dashCooldown: f.dashCooldown, assistCooldown: f.assistCooldown, assistTimer: f.assistTimer, assistHit: f.assistHit, assistX: f.assistX, assistLane: f.assistLane, hitStun: f.hitStun, hitFlash: f.hitFlash, invuln: f.invuln, combo: f.combo, comboTimer: f.comboTimer, armorStage: f.armorStage, armorLayers: { ...f.armorLayers }, win: f.win }))
    };
  }
  function applySnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.fighters)) return;
    if (!gameStarted) return;
    matchTime = snapshot.timer || 0;
    snapshot.fighters.forEach((data, i) => {
      const f = fighters[i]; if (!f) return;
      Object.keys(data).forEach(key => { if (key === 'armorLayers') f.armorLayers = { ...data.armorLayers }; else f[key] = data[key]; });
    });
  }
  function finishMatch(result, authoritative) {
    if (matchFinished) return;
    matchFinished = true; matchResult = result; gamePaused = false;
    announce(result.includes('WINS') ? 'K.O.!' : result, true); sound('ko');
    if (authoritative && gameMode === 'online-host') netSend({ type: 'match-end', result });
    $('resultTitle').textContent = result;
    $('resultSubtitle').textContent = result.includes('DRAW') ? 'Neither fighter gave ground.' : 'A duel decided by timing, pressure and armor management.';
    setView('endScreen');
    $('matchTopbar').classList.add('hidden');
    $('touchP1').style.display = $('touchP2').style.display = 'none';
  }
  $('pauseButton').addEventListener('click', () => { gamePaused = true; setView('pauseScreen'); });
  $('matchMenuButton').addEventListener('click', () => resetToMenu());
  $('resumeButton').addEventListener('click', () => { gamePaused = false; setView(null); $('matchTopbar').classList.remove('hidden'); updateTouchVisibility(); });
  $('pauseMenuButton').addEventListener('click', () => resetToMenu());
  $('rematchButton').addEventListener('click', () => {
    if (gameMode.startsWith('online')) { showToast('Online rematch: both players return to character select.'); resetToMenu(); beginSetup('online'); }
    else startMatch();
  });
  $('resultSelectButton').addEventListener('click', () => { gameStarted = false; matchFinished = false; beginSetup(gameMode === 'training' ? 'training' : gameMode.startsWith('online') ? 'online' : 'local'); });
  $('resultMenuButton').addEventListener('click', resetToMenu);
  function resetToMenu() {
    gameStarted = false; gamePaused = false; matchFinished = false; effects = []; floatTexts = [];
    if (gameMode.startsWith('online')) clearNet();
    gameMode = 'local';
    touchState[1].clear(); touchState[2].clear();
    $('matchTopbar').classList.add('hidden'); setView('titleScreen');
  }

  function addFX(type, x, y, color, count = 8) {
    const n = Math.max(1, Math.min(34, count));
    if (type === 'ring' || type === 'assist' || type === 'dash') {
      effects.push({ type, x, y, color, life: type === 'dash' ? .22 : .42, maxLife: type === 'dash' ? .22 : .42, size: type === 'ring' ? 15 : 9, vx: 0, vy: 0, seed: Math.random() * 6 });
    }
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 35 + Math.random() * (type === 'shard' ? 190 : 260);
      effects.push({ type: type === 'shard' ? 'shard' : type === 'whiff' ? 'whiff' : 'particle', x, y, color, life: .18 + Math.random() * .36, maxLife: .54, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (type === 'shard' ? 70 : 0), size: 1.8 + Math.random() * (type === 'shard' ? 7 : 4), spin: Math.random() * 9, seed: Math.random() * 6 });
    }
  }
  function addFloatText(text, x, y, color) { floatTexts.push({ text, x, y, color, life: .7, maxLife: .7 }); }
  function updateEffects(dt) {
    effects.forEach(fx => { fx.life -= dt; if (fx.type === 'particle' || fx.type === 'shard') { fx.x += fx.vx * dt; fx.y += fx.vy * dt; fx.vy += 510 * dt; fx.vx *= Math.max(0, 1 - dt * 2.1); } });
    effects = effects.filter(fx => fx.life > 0);
    floatTexts.forEach(t => { t.life -= dt; t.y -= 30 * dt; }); floatTexts = floatTexts.filter(t => t.life > 0);
    screenShake = Math.max(0, screenShake - dt * 28); screenFlash = Math.max(0, screenFlash - dt);
    if (roundCalloutTimer > 0) roundCalloutTimer = Math.max(0, roundCalloutTimer - dt);
    if (toastHideTimer && globalTime > toastHideTimer) { $('toast').classList.add('hidden'); toastHideTimer = 0; }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#080916'); sky.addColorStop(.48, '#22172f'); sky.addColorStop(.72, '#3a2340'); sky.addColorStop(1, '#0b101c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * .75, H * .3, 4, W * .75, H * .3, H * .62);
    glow.addColorStop(0, 'rgba(104,64,139,.36)'); glow.addColorStop(1, 'rgba(104,64,139,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H * .8);
    backgroundStars.forEach(s => { const blink = .3 + .7 * Math.abs(Math.sin(globalTime * .6 + s.phase)); ctx.globalAlpha = blink * .65; ctx.fillStyle = s.r > 1.2 ? '#d9d9ff' : '#8ca9cd'; ctx.fillRect(s.x, s.y, s.r, s.r); }); ctx.globalAlpha = 1;
    const moonX = W * .76, moonY = H * .255, moonR = Math.min(H * .18, W * .13);
    const moonGrad = ctx.createRadialGradient(moonX - moonR * .34, moonY - moonR * .3, moonR * .06, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#e8e6f7'); moonGrad.addColorStop(.58, '#aba5d3'); moonGrad.addColorStop(1, '#665e91');
    ctx.save(); ctx.shadowColor = 'rgba(163,132,243,.46)'; ctx.shadowBlur = 40; ctx.fillStyle = moonGrad; ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(moonX, moonY, moonR * .99, 0, Math.PI * 2); ctx.clip();
    [[-.35,-.1,.12],[.23,-.39,.08],[.38,.18,.15],[-.08,.39,.095],[-.55,.33,.06],[.02,-.05,.04]].forEach(([dx,dy,r]) => { ctx.fillStyle = 'rgba(47,43,90,.15)'; ctx.beginPath(); ctx.arc(moonX + dx * moonR, moonY + dy * moonR, r * moonR, 0, Math.PI * 2); ctx.fill(); }); ctx.restore();
    // Abstract skyline silhouettes; deterministically generated to keep screenshots stable.
    const baseY = H * .675;
    for (let i = 0; i < 27; i++) {
      const bw = W / 25 * (.45 + ((i * 19) % 7) / 10), bx = i * W / 25 - 6, bh = H * (.075 + ((i * 31) % 10) / 105);
      ctx.fillStyle = i % 3 === 0 ? '#13152d' : '#101226'; ctx.fillRect(bx, baseY - bh, bw, bh + 4);
      if (i % 3 !== 1) {
        ctx.strokeStyle = i % 2 ? 'rgba(77,228,239,.17)' : 'rgba(250,61,149,.12)'; ctx.lineWidth = 1;
        for (let wy = baseY - bh + 8; wy < baseY - 8; wy += 13) for (let wx = bx + 5; wx < bx + bw - 3; wx += 10) if (((Math.floor(wx + wy) + i) % 4) === 0) ctx.fillRect(wx, wy, 2, 4);
      }
    }
    // Floating light fragments.
    for (let i = 0; i < 22; i++) {
      const x = ((i * 167 + globalTime * (8 + i % 5)) % (W + 60)) - 30;
      const y = H * (.3 + ((i * 23) % 35) / 100) + Math.sin(globalTime * .7 + i) * 9;
      ctx.globalAlpha = .12 + .14 * Math.sin(globalTime + i) ** 2; ctx.fillStyle = i % 2 ? COLORS.cyan : COLORS.pink; ctx.fillRect(x, y, 2, 2);
    } ctx.globalAlpha = 1;
  }
  function drawStage() {
    const floorY = H * .785;
    const floor = ctx.createLinearGradient(0, floorY - 20, 0, H);
    floor.addColorStop(0, '#17162d'); floor.addColorStop(.32, '#111426'); floor.addColorStop(1, '#070913');
    ctx.fillStyle = floor; ctx.beginPath(); ctx.moveTo(0, floorY - 23); ctx.lineTo(W, floorY - 23); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(77,228,239,.56)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, floorY - 22); ctx.lineTo(W, floorY - 22); ctx.stroke();
    const vpX = W * .5, vpY = floorY - 25;
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { ctx.strokeStyle = i % 2 === 0 ? 'rgba(77,228,239,.12)' : 'rgba(250,61,149,.065)'; ctx.beginPath(); ctx.moveTo(vpX + i * 3, vpY); ctx.lineTo(vpX + i * W * .105, H + 10); ctx.stroke(); }
    for (let k = 1; k <= 9; k++) {
      const t = (k / 9) ** 1.8; const y = vpY + (H - vpY) * t;
      ctx.strokeStyle = `rgba(127,130,198,${.07 + t * .08})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.save(); ctx.globalAlpha = .35; ctx.strokeStyle = COLORS.pink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * .2, floorY + 3); ctx.lineTo(W * .8, floorY + 3); ctx.stroke(); ctx.restore();
  }

  function drawLimb(x1, y1, x2, y2, width, color, highlight, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#151420'; ctx.lineWidth = width + 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (highlight && width > 5) { ctx.strokeStyle = highlight; ctx.lineWidth = Math.max(1, width * .13); ctx.beginPath(); ctx.moveTo(x1 - 1, y1); ctx.lineTo(x2 - 1, y2); ctx.stroke(); }
    ctx.restore();
  }
  function drawArmorPlate(points, fill, stroke, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.25; ctx.stroke(); ctx.restore();
  }
  function drawKaguraSprite(f, now, alpha = 1, assist = false) {
    const floor = groundYFor(f);
    const jump = f.jumpY || 0;
    const spriteScale = Math.min(1.22, Math.max(.78, H / 670)) + f.lane * .035;
    let animation = 'idle';
    if (f.action === 'dash') animation = 'dash';
    else if (f.action === 'attack') animation = f.moveId === 'special' ? 'bladeFlurry' : 'twinStab';
    else if (f.action === 'jump' || jump > 1 || f.action === 'hit') animation = 'jump';
    else if (f.action === 'walk') animation = 'walk';

    const info = KAGURA_ANIMATIONS[animation];
    const img = kaguraImages[animation];
    if (!img || !img.complete || !img.naturalWidth) return false;
    const total = info.cols * info.rows;
    const rawFrame = Math.floor(Math.max(0, f.actionTime || 0) * info.fps);
    const frame = info.loop ? rawFrame % total : Math.min(total - 1, rawFrame);
    const sx = (frame % info.cols) * info.cell;
    const sy = Math.floor(frame / info.cols) * info.cell;
    const destSize = info.cell === 512 ? 410 : 256;
    const left = -destSize / 2;
    const top = -destSize;

    // Keep the foot anchor on the same 2.5D ground plane as the procedural fighters.
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(0,0,0,.46)';
    ctx.beginPath();
    ctx.ellipse(f.x, floor + 2, 31 * spriteScale, 7 * spriteScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(f.x, floor - jump);
    ctx.scale(spriteScale * f.facing, spriteScale);
    if (f.action === 'hit') ctx.rotate(-.07 - Math.sin(f.actionTime * 19) * .035);
    else if (f.action === 'guard') ctx.rotate(-.025);
    if (f.hitFlash > 0) ctx.filter = 'brightness(1.7) saturate(1.2)';
    ctx.drawImage(img, sx, sy, info.cell, info.cell, left, top, destSize, destSize);
    ctx.restore();
    return true;
  }

  function drawFighter(f, now, alpha = 1, assist = false) {
    if (f.charId === 'kagura' && drawKaguraSprite(f, now, alpha, assist)) return;
    const c = character(f.charId), floor = groundYFor(f), bob = f.action === 'idle' ? Math.sin(now * 2.2 + f.player) * 2.1 : 0;
    const jump = f.jumpY || 0, scale = Math.min(1.48, Math.max(.88, H / 610)) + f.lane * .047;
    const x = f.x, y = floor - jump + bob;
    // Ground shadow remains at the floor while jumping.
    ctx.save(); ctx.globalAlpha = alpha * (1 - Math.min(.5, jump / 500)); ctx.fillStyle = 'rgba(0,0,0,.48)'; ctx.beginPath(); ctx.ellipse(x, floor + 2, 31 - Math.min(13, jump * .035), 7 - Math.min(2, jump * .006), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale * f.facing, scale);
    if (f.hitFlash > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; }
    const t = now * 10 + f.player * .8;
    const walking = f.action === 'walk' ? Math.sin(t) * .48 : 0;
    const idleSway = f.action === 'idle' ? Math.sin(now * 1.8 + f.player) * .025 : 0;
    const isDash = f.action === 'dash';
    const attacking = f.action === 'attack';
    const heavy = attacking && f.moveId === 'heavy';
    const special = attacking && f.moveId === 'special';
    const hit = f.action === 'hit';
    const guard = f.action === 'guard';
    const lean = isDash ? .28 : special ? .2 : heavy ? .14 : attacking ? .085 : hit ? -.16 : idleSway;
    ctx.rotate(lean);

    // Flowing hair / ribbon silhouette behind the body.
    ctx.fillStyle = c.hair2; ctx.strokeStyle = '#191322'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (c.style === 1) {
      ctx.moveTo(-8, -151); ctx.bezierCurveTo(-35, -147, -44, -117, -34, -88); ctx.quadraticCurveTo(-26, -103, -28, -121); ctx.quadraticCurveTo(-5, -115, 2, -148); ctx.closePath();
      ctx.moveTo(8, -151); ctx.bezierCurveTo(32, -148, 39, -125, 27, -101); ctx.quadraticCurveTo(18, -116, 13, -126); ctx.closePath();
    } else if (c.style === 2) {
      ctx.moveTo(-8, -151); ctx.bezierCurveTo(-29, -140, -31, -98, -18, -84); ctx.quadraticCurveTo(-14, -103, -9, -113); ctx.bezierCurveTo(-5, -128, 4, -140, 12, -151); ctx.closePath();
      ctx.moveTo(3, -146); ctx.quadraticCurveTo(36, -125, 31, -93); ctx.lineTo(22, -101); ctx.quadraticCurveTo(22, -125, 3, -146); ctx.closePath();
    } else {
      ctx.moveTo(-8, -151); ctx.bezierCurveTo(-28, -148, -39, -115, -27, -83); ctx.quadraticCurveTo(-12, -98, -13, -120); ctx.quadraticCurveTo(6, -131, 14, -151); ctx.closePath();
      ctx.moveTo(9, -151); ctx.bezierCurveTo(27, -144, 34, -114, 24, -82); ctx.quadraticCurveTo(9, -103, 15, -122); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    // Long suit-clad legs.
    const legSwing = isDash ? -.38 : walking;
    const hipY = -72, legWidth = c.style === 1 ? 12 : 11;
    let backKneeX = -13 + Math.sin(legSwing) * 8, frontKneeX = 12 - Math.sin(legSwing) * 8;
    if (special || heavy) { backKneeX -= 6; frontKneeX += 11; }
    if (hit) { backKneeX -= 3; frontKneeX -= 3; }
    drawLimb(-8, hipY, backKneeX, -39, legWidth, c.suit, c.suit2, .99);
    drawLimb(backKneeX, -39, backKneeX - 1, -12, legWidth * .88, c.suit2, c.accent, .99);
    drawLimb(8, hipY, frontKneeX, -39, legWidth, c.suit, c.suit2, .99);
    drawLimb(frontKneeX, -39, frontKneeX + 3, -11, legWidth * .9, c.suit2, c.accent, .99);
    // Boots with strong shape and lit edges.
    drawArmorPlate([[backKneeX - 8, -16], [backKneeX + 6, -16], [backKneeX + 10, -5], [backKneeX - 10, -4]], '#191b31', c.accent, 1);
    drawArmorPlate([[frontKneeX - 5, -15], [frontKneeX + 8, -15], [frontKneeX + 14, -5], [frontKneeX - 7, -4]], '#191b31', c.accent, 1);
    // Waist / suit silhouette, with a stable opaque bodysuit underneath removable armor.
    ctx.fillStyle = '#15172a'; ctx.strokeStyle = '#11111d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-15, -116); ctx.quadraticCurveTo(-23, -103, -19, -84); ctx.lineTo(-13, -70); ctx.quadraticCurveTo(0, -64, 15, -71); ctx.lineTo(21, -87); ctx.quadraticCurveTo(22, -104, 14, -116); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.suit; ctx.beginPath(); ctx.moveTo(-13, -112); ctx.quadraticCurveTo(-20, -101, -14, -84); ctx.lineTo(-10, -75); ctx.quadraticCurveTo(1, -70, 12, -76); ctx.lineTo(17, -89); ctx.quadraticCurveTo(18, -103, 11, -112); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.accent; ctx.globalAlpha *= .7; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, -111); ctx.lineTo(0, -78); ctx.stroke(); ctx.globalAlpha /= .7;
    // Hip guards follow the exact same suit silhouette, so breakage removes only this armor piece.
    if (f.armorLayers.waistL) drawArmorPlate([[-18, -83], [-10, -77], [-12, -62], [-23, -68]], c.armor, c.accent);
    if (f.armorLayers.waistR) drawArmorPlate([[11, -77], [20, -84], [25, -68], [14, -62]], c.armor, c.accent);
    if (f.armorLayers.thighL) drawArmorPlate([[backKneeX - 6, -49], [backKneeX + 5, -50], [backKneeX + 7, -37], [backKneeX - 5, -36]], c.armor, c.accent);
    if (f.armorLayers.thighR) drawArmorPlate([[frontKneeX - 5, -49], [frontKneeX + 6, -50], [frontKneeX + 8, -37], [frontKneeX - 3, -36]], c.armor, c.accent);
    // Arms: attack reach is animated, while velocity can continue changing independently.
    let shoulderX = 15, shoulderY = -108, forearmX = 24, forearmY = -83;
    if (attacking) {
      if (heavy) { forearmX = 53; forearmY = -96; }
      else if (special) { forearmX = 66; forearmY = -105; }
      else { forearmX = 43; forearmY = -101; }
    }
    if (isDash) { forearmX = 37; forearmY = -101; shoulderY = -103; }
    if (guard) { forearmX = 12; forearmY = -125; }
    if (hit) { forearmX = -2; forearmY = -93; }
    if (f.player === 2 && !attacking) { shoulderX = 15; forearmX = 19; }
    if (f.action === 'idle') {
      if (c.style === 0) { forearmX = 27; forearmY = -92; }
      else if (c.style === 1) { forearmX = 19; forearmY = -80; }
      else if (c.style === 2) { forearmX = -1; forearmY = -113; shoulderY = -106; }
      else { forearmX = 36; forearmY = -88; }
    }
    drawLimb(-14, -109, -24 + Math.sin(walking) * 4, -86, 8.5, c.suit2, c.accent);
    drawLimb(-24 + Math.sin(walking) * 4, -86, -20, -72, 7.5, c.skin, null);
    drawLimb(shoulderX, shoulderY, forearmX, forearmY, 9.5, c.suit2, c.accent);
    drawLimb(forearmX, forearmY, forearmX + (attacking ? 8 : 2), forearmY + (special ? -4 : 5), 6.5, c.skin, null);
    if (f.armorLayers.shoulderL) drawArmorPlate([[-24, -116], [-12, -121], [-7, -108], [-17, -101], [-26, -106]], c.armor, c.accent);
    if (f.armorLayers.shoulderR) drawArmorPlate([[10, -119], [24, -117], [29, -106], [16, -101], [8, -109]], c.armor, c.accent);
    if (f.armorLayers.chestplate) {
      drawArmorPlate([[-13, -111], [-5, -116], [7, -115], [15, -108], [12, -94], [0, -89], [-11, -95]], c.armor, c.accent);
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(0, -108); ctx.lineTo(4, -102); ctx.lineTo(0, -96); ctx.lineTo(-4, -102); ctx.closePath(); ctx.fill();
    } else {
      // The opaque undersuit stays intact; only the constructed armor layer disappears.
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-8, -104); ctx.quadraticCurveTo(0, -99, 8, -104); ctx.stroke();
    }
    // Collar and belt lighting.
    drawArmorPlate([[-8, -116], [7, -116], [4, -111], [-5, -111]], c.suit2, c.accent);
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -77); ctx.lineTo(11, -77); ctx.stroke();
    // Neck, face and anime eyes.
    ctx.fillStyle = c.skin; ctx.fillRect(-5, -127, 10, 12);
    ctx.fillStyle = '#211725'; ctx.strokeStyle = '#171322'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.ellipse(0, -143, 15.5, 18.5, -.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.ellipse(1, -144, 13.5, 16.7, -.05, 0, Math.PI * 2); ctx.fill();
    // cheek highlight and small nose
    ctx.fillStyle = 'rgba(246,135,157,.25)'; ctx.beginPath(); ctx.ellipse(7, -139, 4.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9a5d67'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, -141); ctx.lineTo(11, -139); ctx.stroke();
    // Eyes face forward, with graphic lashes.
    ctx.fillStyle = '#fff7f6'; ctx.beginPath(); ctx.ellipse(5, -148, 4.3, 5.2, -.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.ellipse(6.4, -147.6, 2.5, 3.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20172b'; ctx.beginPath(); ctx.ellipse(7, -147.5, 1.15, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#302031'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -152); ctx.quadraticCurveTo(5, -156, 10, -152); ctx.stroke();
    ctx.fillStyle = '#302031'; ctx.beginPath(); ctx.ellipse(-4, -148, 2.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b76d7a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(4, -134); ctx.quadraticCurveTo(8, -132, 11, -135); ctx.stroke();
    // Hair cap + bangs.
    ctx.fillStyle = c.hair; ctx.strokeStyle = '#22152b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -145); ctx.quadraticCurveTo(-19, -168, 0, -165); ctx.quadraticCurveTo(19, -167, 16, -145); ctx.quadraticCurveTo(8, -153, 3, -153); ctx.quadraticCurveTo(-1, -143, -6, -143); ctx.quadraticCurveTo(-4, -151, -10, -151); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.hair2; ctx.beginPath(); ctx.moveTo(-13, -148); ctx.quadraticCurveTo(-11, -160, -1, -162); ctx.quadraticCurveTo(-11, -154, -8, -147); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -161); ctx.quadraticCurveTo(2, -165, 8, -160); ctx.stroke();
    // Headpiece makes each roster silhouette more identifiable.
    if (c.style === 0) { drawArmorPlate([[-10, -157], [-4, -165], [1, -157], [-4, -155]], c.accent, '#182338'); }
    else if (c.style === 1) { ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(-10, -155, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(11, -155, 4, 0, Math.PI * 2); ctx.fill(); }
    else if (c.style === 2) { ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -150); ctx.lineTo(11, -158); ctx.stroke(); }
    else { drawArmorPlate([[9, -161], [19, -166], [15, -154]], c.accent, '#182338'); }
    // Weapon / combat trail cue, stylized rather than a static prop.
    if (attacking || isDash) {
      ctx.save(); ctx.globalAlpha *= attacking ? .85 : .25;
      const wx = attacking ? forearmX + 5 : 28, wy = attacking ? forearmY - 11 : -91;
      if (c.style === 0) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = special ? 5 : 2.5; ctx.shadowColor = c.accent; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(wx - 5, wy + 17); ctx.lineTo(wx + 18, wy - 16); ctx.stroke();
      } else if (c.style === 1) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(wx + 2, wy, 9, -.6, .8); ctx.stroke();
      } else if (c.style === 2) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, wy + 16); ctx.quadraticCurveTo(wx + 22, wy - 18, wx + 7, wy - 30); ctx.stroke();
      } else {
        ctx.fillStyle = c.accent; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.ellipse(wx + 9, wy - 5, 5, 18, .6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawEffects() {
    effects.forEach(fx => {
      const a = Math.max(0, fx.life / fx.maxLife); ctx.save(); ctx.globalAlpha = a;
      if (fx.type === 'ring' || fx.type === 'assist') {
        const radius = fx.size + (1 - a) * 36; ctx.strokeStyle = fx.color; ctx.lineWidth = fx.type === 'assist' ? 2 : 3; ctx.shadowColor = fx.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * 1.5, radius * .58, -.22, 0, Math.PI * 2); ctx.stroke();
        if (fx.type === 'assist') { ctx.beginPath(); ctx.ellipse(fx.x, fx.y, radius * .72, radius * .36, .3, 0, Math.PI * 2); ctx.stroke(); }
      } else if (fx.type === 'dash') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 2.4; for (let i = 0; i < 5; i++) { const yy = fx.y + (i - 2) * 6; ctx.beginPath(); ctx.moveTo(fx.x - 30 * a, yy); ctx.lineTo(fx.x + 20 * a, yy - 6); ctx.stroke(); }
      } else if (fx.type === 'whiff') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(fx.x - 13, fx.y - 4); ctx.lineTo(fx.x + 13, fx.y + 4); ctx.stroke();
      } else if (fx.type === 'shard') {
        ctx.translate(fx.x, fx.y); ctx.rotate(fx.spin * (1 - a)); ctx.fillStyle = fx.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(0, -fx.size * 1.3); ctx.lineTo(fx.size * .75, fx.size); ctx.lineTo(-fx.size * .8, fx.size * .5); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = fx.color; ctx.shadowColor = fx.color; ctx.shadowBlur = 9; ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.size * a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    floatTexts.forEach(t => { const a = Math.max(0, t.life / t.maxLife); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = '900 17px "Barlow Condensed", Impact, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,5,15,.8)'; ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); ctx.restore(); });
  }

  function drawBar(x, y, width, height, ratio, colorA, colorB, reverse = false) {
    ctx.fillStyle = 'rgba(4,5,14,.84)'; ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
    ctx.fillStyle = 'rgba(255,255,255,.085)'; ctx.fillRect(x, y, width, height);
    const fillWidth = Math.max(0, width * Math.max(0, Math.min(1, ratio)));
    const gradient = ctx.createLinearGradient(x, y, x + width, y); gradient.addColorStop(0, colorA); gradient.addColorStop(1, colorB); ctx.fillStyle = gradient;
    if (reverse) ctx.fillRect(x + width - fillWidth, y, fillWidth, height); else ctx.fillRect(x, y, fillWidth, height);
    ctx.strokeStyle = 'rgba(230,230,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x - .5, y - .5, width + 1, height + 1);
  }
  function drawHUD() {
    if (!fighters.length) return;
    const sideMargin = Math.max(14, W * .025), top = Math.max(42, H * .077), barW = Math.min(W * .335, 435), barH = Math.max(12, Math.min(18, H * .022));
    const leftX = sideMargin, rightX = W - sideMargin - barW;
    const c1 = character(fighters[0].charId), c2 = character(fighters[1].charId);
    ctx.save();
    ctx.font = `900 ${Math.max(11, Math.min(17, W * .014))}px "Barlow Condensed", Impact, sans-serif`; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#f8f3ff'; ctx.fillText(c1.name, leftX, top - 16);
    ctx.textAlign = 'right'; ctx.fillText(c2.name, rightX + barW, top - 16);
    drawBar(leftX, top, barW, barH, fighters[0].hp / fighters[0].maxHp, '#50e7e9', '#55a7e7');
    drawBar(rightX, top, barW, barH, fighters[1].hp / fighters[1].maxHp, '#ff4b99', '#a43beb', true);
    const armorY = top + barH + 5, segGap = 3, segW = (barW - (ARMOR_LAYERS.length - 1) * segGap) / ARMOR_LAYERS.length, stages1 = Math.ceil(fighters[0].armorHP / (fighters[0].maxArmor / ARMOR_LAYERS.length)), stages2 = Math.ceil(fighters[1].armorHP / (fighters[1].maxArmor / ARMOR_LAYERS.length));
    for (let i = 0; i < ARMOR_LAYERS.length; i++) {
      const x1 = leftX + i * (segW + segGap), x2 = rightX + i * (segW + segGap);
      ctx.fillStyle = i < stages1 ? '#dffaff' : 'rgba(255,255,255,.08)'; ctx.fillRect(x1, armorY, segW, 4);
      ctx.fillStyle = i < stages2 ? '#ffdff0' : 'rgba(255,255,255,.08)'; ctx.fillRect(x2, armorY, segW, 4);
    }
    const meterY = armorY + 7, meterH = 4;
    drawBar(leftX, meterY, barW * .62, meterH, fighters[0].meter / fighters[0].maxMeter, '#58f5e7', '#bcfbff');
    drawBar(rightX + barW * .38, meterY, barW * .62, meterH, fighters[1].meter / fighters[1].maxMeter, '#ff6db3', '#d5a0ff', true);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e9'; ctx.font = `900 ${Math.max(25, Math.min(42, W * .038))}px "Barlow Condensed", Impact, sans-serif`; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 9; ctx.fillText(String(Math.ceil(matchTime)).padStart(2, '0'), W / 2, top + barH * .65); ctx.shadowBlur = 0;
    ctx.font = '800 8px Inter, sans-serif'; ctx.fillStyle = 'rgba(232,227,249,.67)'; ctx.fillText('TIME', W / 2, top + barH + 6);
    [0, 1].forEach(i => { const f = fighters[i]; if (f.combo >= 2 && f.comboTimer > 0) { ctx.textAlign = i === 0 ? 'left' : 'right'; ctx.fillStyle = i === 0 ? COLORS.cyan : COLORS.pink; ctx.font = `900 ${Math.max(22, W * .025)}px "Barlow Condensed", Impact, sans-serif`; ctx.fillText(`${f.combo} HIT`, i === 0 ? leftX : rightX + barW, H * .34); } });
    ctx.restore();
  }
  function drawCallout() {
    if (roundCalloutTimer <= 0 || !roundCallout) return;
    const a = Math.min(1, roundCalloutTimer * 2.5); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fontSize = Math.min(78, Math.max(34, W * .073)); ctx.font = `900 italic ${fontSize}px "Barlow Condensed", Impact, sans-serif`; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(6,6,18,.8)'; ctx.shadowColor = COLORS.pink; ctx.shadowBlur = 25; ctx.strokeText(roundCallout, W / 2, H * .36); ctx.fillStyle = '#fff'; ctx.fillText(roundCallout, W / 2, H * .36); ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W * .22, H * .36 + fontSize * .68); ctx.lineTo(W * .42, H * .36 + fontSize * .68); ctx.moveTo(W * .58, H * .36 + fontSize * .68); ctx.lineTo(W * .78, H * .36 + fontSize * .68); ctx.stroke(); ctx.restore();
  }
  function render() {
    ctx.save();
    if (screenShake > 0 && gameStarted) ctx.translate((Math.random() - .5) * screenShake, (Math.random() - .5) * screenShake * .65);
    drawBackground(); drawStage();
    if (gameStarted && fighters.length) {
      // Draw far-lane fighter first to sell the 2.5D plane.
      const ordered = [...fighters].sort((a, b) => groundYFor(a) - groundYFor(b));
      ordered.forEach(f => drawFighter(f, globalTime));
      fighters.forEach(f => {
        if (f.assistTimer > 0) {
          const copy = newFighter(f.player, f.partnerId, f.charId, f.x - f.facing * 55);
          copy.x = f.x - f.facing * (72 + Math.sin(globalTime * 20) * 8); copy.lane = f.lane - .08; copy.facing = f.facing; copy.action = 'attack'; copy.actionTime = globalTime % .2; copy.moveId = character(f.partnerId).style === 0 || character(f.partnerId).style === 3 ? 'special' : character(f.partnerId).style === 1 ? 'heavy' : 'light'; copy.move = MOVES[copy.moveId];
          drawFighter(copy, globalTime, Math.min(.9, f.assistTimer * 3), true);
        }
      });
      drawHUD(); drawCallout();
    } else {
      const left = newFighter(1, 'aurelia', 'kestrel', W * .68), right = newFighter(2, 'nyx', 'seraphine', W * .85);
      left.facing = 1; right.facing = -1; left.lane = -.25; right.lane = .12;
      drawFighter(left, globalTime); drawFighter(right, globalTime);
      ctx.save(); ctx.globalAlpha = .17; ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(W * .77, H * .62, W * .15, H * .07, -.15, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    drawEffects();
    if (screenFlash > 0) { ctx.globalAlpha = Math.min(.4, screenFlash * 1.5); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.restore();
  }

  function frame(ts) {
    if (!lastFrame) lastFrame = ts;
    let dt = Math.min(.033, (ts - lastFrame) / 1000); lastFrame = ts;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    globalTime += dt;
    updateGame(dt);
    keysPressed.clear();
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Keyboard: keys are kept in a set so simultaneous directions/attacks stay responsive.
  const GAME_KEY_NAMES = new Set(['a','d','w','s','q','e','f','g','h','r','x','c','shift','arrowleft','arrowright','arrowup','arrowdown','numpad1','numpad2','numpad3','numpad0','numpad7','numpad9','numpaddecimal','u','o','1','2','3','0','.','rightshift','rightcontrol','control','escape']);
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase(), code = event.code.toLowerCase();
    if (gameStarted && (GAME_KEY_NAMES.has(key) || GAME_KEY_NAMES.has(code) || event.code.startsWith('Numpad'))) event.preventDefault();
    keysDown.add(key); keysDown.add(code);
    if (!event.repeat) { keysPressed.add(key); keysPressed.add(code); }
    if (event.key === 'Escape' && gameStarted && !matchFinished) { if (gamePaused) { gamePaused = false; setView(null); $('matchTopbar').classList.remove('hidden'); } else { gamePaused = true; setView('pauseScreen'); } }
  }, { passive: false });
  window.addEventListener('keyup', event => { keysDown.delete(event.key.toLowerCase()); keysDown.delete(event.code.toLowerCase()); });
  window.addEventListener('blur', () => { keysDown.clear(); touchState[1].clear(); touchState[2].clear(); });

  document.querySelectorAll('[data-control][data-player]').forEach(button => {
    const player = Number(button.dataset.player), control = button.dataset.control;
    const start = event => { event.preventDefault(); touchState[player].add(control); button.setPointerCapture?.(event.pointerId); unlockAudio(); };
    const end = event => { event.preventDefault(); touchState[player].delete(control); };
    button.addEventListener('pointerdown', start, { passive: false });
    button.addEventListener('pointerup', end, { passive: false });
    button.addEventListener('pointercancel', end, { passive: false });
    button.addEventListener('lostpointercapture', end, { passive: false });
    button.addEventListener('contextmenu', event => event.preventDefault());
  });

  // Native controller support: P1 uses the first pad, P2 the second pad in local matches.
  window.addEventListener('gamepadconnected', () => showToast('Controller connected. Standard gamepad mapping enabled.'));
  window.addEventListener('gamepaddisconnected', () => showToast('Controller disconnected.'));

  // Wait for a first user gesture before asking browsers for available speech voices.
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => {};

})();
