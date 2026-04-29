/* ===== Smart Decision Maker – App Logic ===== */
(() => {
  'use strict';

  // --- DOM refs ---
  const optionInput   = document.getElementById('optionInput');
  const addBtn        = document.getElementById('addBtn');
  const optionsList   = document.getElementById('optionsList');
  const decideBtn     = document.getElementById('decideBtn');
  const clearBtn      = document.getElementById('clearBtn');
  const resultSection = document.getElementById('resultSection');
  const resultCard    = document.getElementById('resultCard');
  const resultValue   = document.getElementById('resultValue');
  const resultEmoji   = document.getElementById('resultEmoji');
  const historyList   = document.getElementById('historyList');
  const clearHistBtn  = document.getElementById('clearHistoryBtn');
  const audioToggle   = document.getElementById('audioToggle');
  const audioIcon     = document.getElementById('audioIcon');
  const themeToggle   = document.getElementById('themeToggle');
  const themeIcon     = document.getElementById('themeIcon');
  const confettiCanvas = document.getElementById('confetti-canvas');

  // --- State ---
  let options = [];
  let history = [];
  let isDeciding = false;

  // --- Fun emojis for results ---
  const celebrationEmojis = ['🎉','🥳','🎊','✨','🌟','🔥','💥','🚀','🏆','💎','🦄','🍀'];

  // --- Sound effects via Web Audio API ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let musicPlaying = false;
  let musicOsc = null;
  let musicGain = null;

  function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(freq, duration, type = 'sine', volume = 0.12) {
    ensureAudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playAddSound() {
    playTone(600, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(800, 0.1, 'sine', 0.08), 60);
  }

  function playRemoveSound() {
    playTone(300, 0.15, 'triangle', 0.08);
  }

  function playTickSound() {
    playTone(440 + Math.random() * 400, 0.06, 'square', 0.04);
  }

  function playRevealSound() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.25, 'sine', 0.1), i * 100);
    });
  }

  // --- Background music (simple looping melody) ---
  function startMusic() {
    ensureAudioCtx();
    if (musicOsc) return;
    musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    musicGain.connect(audioCtx.destination);

    musicOsc = audioCtx.createOscillator();
    musicOsc.type = 'triangle';
    musicOsc.frequency.setValueAtTime(220, audioCtx.currentTime);
    musicOsc.connect(musicGain);

    // Simple melody loop using frequency scheduling
    const melody = [262, 294, 330, 349, 392, 349, 330, 294];
    const noteLen = 0.5;
    let t = audioCtx.currentTime;
    function scheduleMelody() {
      for (let i = 0; i < melody.length; i++) {
        musicOsc.frequency.setValueAtTime(melody[i], t + i * noteLen);
      }
      t += melody.length * noteLen;
    }
    // Schedule several loops ahead
    for (let loop = 0; loop < 50; loop++) scheduleMelody();

    musicOsc.start();
    musicPlaying = true;
  }

  function stopMusic() {
    if (musicOsc) {
      musicOsc.stop();
      musicOsc.disconnect();
      musicOsc = null;
    }
    if (musicGain) {
      musicGain.disconnect();
      musicGain = null;
    }
    musicPlaying = false;
  }

  audioToggle.addEventListener('click', () => {
    if (musicPlaying) {
      stopMusic();
      audioIcon.textContent = '🔇';
    } else {
      startMusic();
      audioIcon.textContent = '🔊';
    }
  });

  // --- Theme toggle ---
  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    themeIcon.textContent = dark ? '☀️' : '🌙';
    localStorage.setItem('sdm-theme', dark ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(!isDark);
  });

  // Restore theme
  const savedTheme = localStorage.getItem('sdm-theme');
  if (savedTheme === 'dark') setTheme(true);

  // --- Confetti ---
  const ctx = confettiCanvas.getContext('2d');
  let confettiPieces = [];
  let confettiAnimId = null;

  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function launchConfetti() {
    confettiPieces = [];
    const colors = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#01a3a4','#f368e0'];
    for (let i = 0; i < 120; i++) {
      confettiPieces.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    if (!confettiAnimId) animateConfetti();
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;
    confettiPieces.forEach(p => {
      if (p.opacity <= 0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.rot += p.rotSpeed;
      p.opacity -= 0.004;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (alive) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiAnimId = null;
    }
  }

  // --- Options management ---
  function updateDecideBtn() {
    decideBtn.disabled = options.length < 2;
  }

  function renderOptions() {
    optionsList.innerHTML = '';
    options.forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = 'option-chip';
      li.innerHTML = `
        <span>${escapeHtml(opt)}</span>
        <button class="remove-chip" aria-label="Remove ${escapeHtml(opt)}" data-index="${i}">&times;</button>
      `;
      optionsList.appendChild(li);
    });
    updateDecideBtn();
  }

  function addOption(text) {
    const trimmed = text.trim();
    if (!trimmed || options.length >= 30) return;
    if (options.includes(trimmed)) {
      // Shake the input to indicate duplicate
      optionInput.style.animation = 'none';
      void optionInput.offsetHeight;
      optionInput.style.animation = 'shake 0.4s ease';
      return;
    }
    options.push(trimmed);
    playAddSound();
    renderOptions();
    optionInput.value = '';
    optionInput.focus();
  }

  function removeOption(index) {
    options.splice(index, 1);
    playRemoveSound();
    renderOptions();
  }

  // --- Event listeners ---
  addBtn.addEventListener('click', () => addOption(optionInput.value));

  optionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption(optionInput.value);
    }
  });

  optionsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-chip');
    if (btn) removeOption(Number(btn.dataset.index));
  });

  clearBtn.addEventListener('click', () => {
    options = [];
    renderOptions();
    resultSection.classList.add('hidden');
  });

  // --- Preset buttons ---
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      options = btn.dataset.options.split(',');
      renderOptions();
      resultSection.classList.add('hidden');
      // Auto-scroll to options
      optionsList.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // --- Decision logic with slot-machine effect ---
  decideBtn.addEventListener('click', () => {
    if (isDeciding || options.length < 2) return;
    isDeciding = true;
    decideBtn.classList.add('spinning');

    resultSection.classList.remove('hidden');
    resultCard.classList.add('slot-rolling');
    resultEmoji.textContent = '';

    // Slot-machine rapid cycling
    let ticks = 0;
    const totalTicks = 20 + Math.floor(Math.random() * 10);
    const interval = setInterval(() => {
      const randomOpt = options[Math.floor(Math.random() * options.length)];
      resultValue.textContent = randomOpt;
      playTickSound();
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(interval);
        // Final pick
        const winner = options[Math.floor(Math.random() * options.length)];
        resultValue.textContent = winner;
        resultCard.classList.remove('slot-rolling');
        resultEmoji.textContent = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];

        // Re-trigger animations
        resultCard.style.animation = 'none';
        void resultCard.offsetHeight;
        resultCard.style.animation = '';

        playRevealSound();
        launchConfetti();
        addToHistory(winner);

        decideBtn.classList.remove('spinning');
        isDeciding = false;

        // Scroll result into view
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 70);
  });

  // --- History ---
  function addToHistory(result) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    history.unshift({ result, time: timeStr });
    if (history.length > 20) history.pop();
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <span class="history-result">${escapeHtml(item.result)}</span>
        <span class="history-time">${item.time}</span>
      `;
      historyList.appendChild(li);
    });
    clearHistBtn.classList.toggle('hidden', history.length === 0);
  }

  clearHistBtn.addEventListener('click', () => {
    history = [];
    renderHistory();
  });

  // --- Helpers ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Add shake keyframes dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);

})();
