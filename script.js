let gameData = {};
let currentHeroHp = 0;
let currentBossHp = 0;
let isPlayerTurn = true;
let gameOver = false;
let deadline = "";

// ── Theme toggle ──
function initTheme() {
    const saved = localStorage.getItem('rpg-theme');
    if (saved === 'dark') applyTheme('dark');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀ LIGHT' : '🌙 DARK';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('rpg-theme', next);
}

// ── Config loading ──
async function loadConfig() {
    try {
        const response = await fetch('config.yaml');
        const yamlText = await response.text();
        const config = jsyaml.load(yamlText);
        buildPage(config);
        initGame(config);
    } catch (e) {
        console.error("Error loading config.yaml:", e);
        document.getElementById('dialogue-box').innerText = "System Error: Could not load YAML config.";
    }
}

function buildPage(config) {
    document.title = config.title;
    deadline = config.deadline;
    document.getElementById('year').innerText = new Date().getFullYear();

    document.getElementById('banner-title').innerText = config.title;
    if (config.subtitle) {
        document.getElementById('banner-subtitle').innerText = config.subtitle;
    }

    const navbar = document.getElementById('navbar');
    const contentContainer = document.getElementById('content-container');

    const deadlineDiv = document.createElement('div');
    deadlineDiv.className = 'deadline-highlight';
    deadlineDiv.innerText = `🚨 Call for Papers Deadline: ${config.deadline}`;
    contentContainer.appendChild(deadlineDiv);

    config.sections.forEach(sec => {
        const link = document.createElement('a');
        link.href = `#${sec.id}`;
        link.innerText = sec.title;
        navbar.appendChild(link);

        const sectionDiv = document.createElement('section');
        sectionDiv.id = sec.id;
        sectionDiv.innerHTML = `<h2>${sec.title}</h2><div>${sec.content}</div>`;
        contentContainer.appendChild(sectionDiv);
    });
}

function initGame(config) {
    gameData = config.game;
    currentHeroHp = gameData.hero_hp;
    currentBossHp = gameData.boss_hp;

    document.getElementById('ui-hero-name').innerText = gameData.hero_name;
    document.getElementById('ui-boss-name').innerText = gameData.boss_name;

    const actionMenu = document.getElementById('action-menu');
    gameData.attacks.forEach((attack, index) => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.innerText = `▶ ${attack.name}`;
        btn.onclick = () => playerAttack(index);
        actionMenu.appendChild(btn);
    });

    updateHealthBars();
}

let typewriterTimer = null;

function setDialogue(text, onDone, speed = 32) {
    if (typewriterTimer) clearTimeout(typewriterTimer);
    const el = document.getElementById('dialogue-text');
    el.innerText = '';
    let i = 0;
    function tick() {
        el.innerText = text.slice(0, ++i);
        if (i < text.length) {
            typewriterTimer = setTimeout(tick, speed);
        } else if (onDone) {
            typewriterTimer = setTimeout(onDone, 1400);
        }
    }
    tick();
}

function toggleButtons(disabled) {
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = disabled);
}

function updateHealthBars() {
    const heroPercent = Math.max(0, (currentHeroHp / gameData.hero_hp) * 100);
    const bossPercent = Math.max(0, (currentBossHp / gameData.boss_hp) * 100);

    const heroFill = document.getElementById('hero-hp-fill');
    const bossFill = document.getElementById('boss-hp-fill');

    heroFill.style.width = `${heroPercent}%`;
    bossFill.style.width = `${bossPercent}%`;

    const color = pct =>
        pct < 30 ? 'linear-gradient(to right,#c0392b,#e74c3c)' :
        pct < 60 ? 'linear-gradient(to right,#e67e22,#f39c12)' :
                   'linear-gradient(to right,#27ae60,#2ecc71)';

    heroFill.style.background = color(heroPercent);
    bossFill.style.background = color(bossPercent);
}

function triggerShake(elementId) {
    const el = document.getElementById(elementId);
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

function playerAttack(attackIndex) {
    if (!isPlayerTurn || gameOver) return;
    isPlayerTurn = false;
    toggleButtons(true);

    const attack = gameData.attacks[attackIndex];
    currentBossHp -= attack.damage;
    triggerShake('boss-sprite');
    updateHealthBars();
    setDialogue(`${gameData.hero_name} used ${attack.name}! ${attack.msg}`, () => {
        if (currentBossHp <= 0) winGame();
        else bossTurn();
    });
}

function bossTurn() {
    if (gameOver) return;

    const randomAttack = gameData.boss_attacks[Math.floor(Math.random() * gameData.boss_attacks.length)];
    currentHeroHp -= randomAttack.damage;
    triggerShake('hero-sprite');
    updateHealthBars();
    setDialogue(`${gameData.boss_name} used ${randomAttack.name}! ${randomAttack.msg}`, () => {
        if (currentHeroHp <= 0) {
            loseGame();
        } else {
            setDialogue(`What will ${gameData.hero_name} do?`, () => {
                isPlayerTurn = true;
                toggleButtons(false);
            });
        }
    });
}

function winGame() {
    gameOver = true;
    document.getElementById('boss-sprite').style.opacity = '0';
    setDialogue(`Reviewer 2 was defeated! PAPER ACCEPTED! Don't forget to submit by ${deadline}!`);
}

function loseGame() {
    gameOver = true;
    document.getElementById('hero-sprite').style.opacity = '0';
    setDialogue(`DESK REJECT! Refresh the page to write a new manuscript...`);
}

initTheme();
loadConfig();
