"use strict";

/* =========================================
   SUPABASE ONLINE LEADERBOARD
========================================= */

// Paste your Supabase Project URL and PUBLISHABLE key here.
// Do NOT paste a secret/service_role key into this file.
const SUPABASE_URL = "https://ezqvqnltqjpjhjuxhzqu.supabase.co";
const SUPABASE_KEY = "sb_publishable_DwSAU_EY9INzVEe0R2e1Dw_hdpI_UrE";

const supabaseClient =
    (window.supabase && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_KEY.includes("PASTE_"))
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

const PLAYER_ID_KEY = "neonChaosPlayerID";
let playerID = localStorage.getItem(PLAYER_ID_KEY);

if (!playerID) {
    playerID = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, playerID);
}

let onlineDatabaseReady = !!supabaseClient;


/* =========================================
   STORAGE
========================================= */

const STORAGE = {
    profile: "neonChaosProfile",
    scores: "neonChaosScores",
    badges: "neonChaosBadges",
    clicker: "neonChaosClicker",
    admin: "neonChaosAdmin",
    sound: "neonChaosSound"
};

function load(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}


/* =========================================
   DATA
========================================= */

let profile = load(STORAGE.profile, {
    username: "PLAYER_001",
    avatar: "😎"
});

let scores = load(STORAGE.scores, {});

let badges = load(STORAGE.badges, []);

let clicker = load(STORAGE.clicker, {
    clicks: 0,
    power: 1,
    perSecond: 0,
    critChance: 0,
    owned: {
        cursor: 0,
        mega: 0,
        reactor: 0,
        crit: 0
    }
});

let soundOn = load(STORAGE.sound, true);

let adminUnlocked = localStorage.getItem(STORAGE.admin) === "true";

let currentGame = null;

let gameIntervals = [];
let gameTimeouts = [];
let gameCleanups = [];

let currentScore = 0;
let currentTime = 0;

let gameState = {};

/* =========================================
   MOBILE / TOUCH CONTROLS
========================================= */

function isTouchDevice() {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function createTouchControls(buttons) {

    // Don't show touch controls on normal PCs
    if (!isTouchDevice()) return null;

    const controls = document.createElement("div");

    controls.className = "touch-controls";

    buttons.forEach(buttonData => {

        const button = document.createElement("button");

        button.className = "touch-control";
        button.textContent = buttonData.label;

        const press = event => {
            event.preventDefault();

            if (buttonData.action) {
                buttonData.action();
            }
        };

        button.addEventListener("pointerdown", press);

        controls.appendChild(button);
    });

    document.getElementById("gameArea").appendChild(controls);

    return controls;
}

const adminFlags = {
    god: false,
    slow: false,
    big: false,
    boss: false,
    infinite: false,
    turbo: false,
    gravity: false
};


/* =========================================
   GAME DATA
========================================= */

const gameNames = {
    core: "CORE BREAKER",
    reaction: "REACTION RUSH",
    dodge: "DODGE THE VOID",
    memory: "MEMORY GLITCH",
    bomb: "BOMB DEFUSER",
    meteor: "METEOR MAYHEM",
    boss: "BOSS FIGHT",
    glitch: "GLITCH ROOM",
    color: "COLOR SWITCH",
    target: "TARGET SNIPER",
    hacker: "NUMBER HACKER",
    gravity: "GRAVITY FLIP",
    combo: "COMBO CLICKER",
    runner: "PIXEL RUNNER",
    clicker: "GOOFY CLICKER"
};


/* =========================================
   SOUND
========================================= */

let audioContext = null;

function tone(freq = 500, duration = .08, type = "sine") {

    if (!soundOn) return;

    try {

        if (!audioContext) {
            audioContext = new AudioContext();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value = freq;

        gain.gain.setValueAtTime(.04, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            .001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

    } catch {}
}

function toggleSound() {

    soundOn = !soundOn;

    save(STORAGE.sound, soundOn);

    document.getElementById("soundButton").textContent =
        soundOn ? "🔊" : "🔇";

    tone(500, .1);
}


/* =========================================
   NAVIGATION
========================================= */

function showPage(page) {

    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    const target = document.getElementById(page + "Page");

    if (target) {
        target.classList.add("active");
    }

    if (page === "leaderboard") {
        renderLeaderboard();
    }

    if (page === "badges") {
        renderBadges();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    tone(300, .05);
}


/* =========================================
   PROFILE
========================================= */

function renderProfile() {

    document.getElementById("topUsername").textContent =
        profile.username;

    const topAvatar = document.getElementById("topAvatar");

    if (profile.avatar && profile.avatar.startsWith("data:image")) {

        topAvatar.innerHTML = "";

        const img = document.createElement("img");

        img.src = profile.avatar;

        img.onerror = () => {
            topAvatar.textContent = "😎";
        };

        topAvatar.appendChild(img);

    } else {

        topAvatar.textContent = profile.avatar || "😎";
    }

    const preview = document.getElementById("profileAvatarPreview");

    if (profile.avatar && profile.avatar.startsWith("data:image")) {

        preview.innerHTML =
            `<img src="${profile.avatar}" alt="Profile">`;

    } else {

        preview.textContent = profile.avatar || "😎";
    }

    document.getElementById("profileNameInput").value =
        profile.username;
}


function openProfile() {

    renderProfile();

    document.getElementById("profileModal")
        .classList.add("show");
}


function closeProfile() {

    document.getElementById("profileModal")
        .classList.remove("show");
}


function saveProfile() {

    const name =
        document.getElementById("profileNameInput")
        .value
        .trim();

    if (name.length > 0) {
        profile.username = name;
    }

    const file =
        document.getElementById("profileImageInput")
        .files[0];

    if (file) {

        const reader = new FileReader();

        reader.onload = function(event) {

            const img = new Image();

            img.onload = function() {

                const canvas =
                    document.createElement("canvas");

                canvas.width = 256;
                canvas.height = 256;

                const ctx = canvas.getContext("2d");

                const size =
                    Math.min(img.width, img.height);

                const sx =
                    (img.width - size) / 2;

                const sy =
                    (img.height - size) / 2;

                ctx.drawImage(
                    img,
                    sx,
                    sy,
                    size,
                    size,
                    0,
                    0,
                    256,
                    256
                );

                profile.avatar =
                    canvas.toDataURL("image/jpeg", .85);

                save(STORAGE.profile, profile);

                renderProfile();

                closeProfile();

                showJoke("PROFILE UPDATED. VERY PROFESSIONAL.");

            };

            img.onerror = function() {
                showJoke("That image confused the website.");
            };

            img.src = event.target.result;
        };

        reader.readAsDataURL(file);

    } else {

        save(STORAGE.profile, profile);

        renderProfile();

        closeProfile();
    }
}


/* =========================================
   GAME SYSTEM
========================================= */

function clearGame() {

    gameIntervals.forEach(clearInterval);
    gameTimeouts.forEach(clearTimeout);

    gameIntervals = [];
    gameTimeouts = [];

    gameCleanups.forEach(fn => {
        try {
            fn();
        } catch {}
    });

    gameCleanups = [];

    gameState = {};
}


function every(fn, time) {

    const id = setInterval(fn, time);

    gameIntervals.push(id);

    return id;
}


function later(fn, time) {

    const id = setTimeout(fn, time);

    gameTimeouts.push(id);

    return id;
}


function addCleanup(fn) {

    gameCleanups.push(fn);
}


function startGame(game) {

    clearGame();

    currentGame = game;

    currentScore = 0;
    currentTime = 0;

    showPage("game");

    document.getElementById("gameTitle").textContent =
        gameNames[game];

    document.getElementById("gameScore").textContent = "0";

    document.getElementById("gameTime").textContent = "—";

    document.getElementById("gameBest").textContent =
        getBest(game);

    const area = document.getElementById("gameArea");

    area.innerHTML = "";

    if (game === "clicker") createClicker();
    if (game === "core") createCore();
    if (game === "reaction") createReaction();
    if (game === "dodge") createDodge();
    if (game === "memory") createMemory();
    if (game === "bomb") createBomb();
    if (game === "meteor") createMeteor();
    if (game === "boss") createBoss();
    if (game === "glitch") createGlitch();
    if (game === "color") createColor();
    if (game === "target") createTarget();
    if (game === "hacker") createHacker();
    if (game === "gravity") createGravity();
    if (game === "combo") createCombo();
    if (game === "runner") createRunner();
}


function restartCurrentGame() {

    if (!currentGame) return;

    closeResult();

    startGame(currentGame);
}


function updateHUD() {

    document.getElementById("gameScore").textContent =
        Math.floor(currentScore);

    document.getElementById("gameTime").textContent =
        currentTime > 0 ? Math.ceil(currentTime) : "—";

    document.getElementById("gameBest").textContent =
        getBest(currentGame);
}


function finishGame(message = "GAME COMPLETE", metric = currentScore) {

    clearGame();

    if (currentGame && currentGame !== "clicker") {
        recordScore(currentGame, metric);
    }

    document.getElementById("resultTitle").textContent =
        message;

    document.getElementById("resultText").textContent =
        `Score: ${Math.floor(metric)} • ${profile.username}`;

    document.getElementById("resultPopup")
        .classList.add("show");

    checkBadges();

    updateStats();

    tone(180, .25, "sawtooth");
}


function closeResult() {

    document.getElementById("resultPopup")
        .classList.remove("show");
}


/* =========================================
   SCORES
========================================= */

function getBest(game) {

    return scores[game] ?? 0;
}


function recordScore(game, value) {

    if (game === "reaction") {

        if (!scores[game] || value < scores[game]) {
            scores[game] = value;
        }

    } else {

        if (value > (scores[game] || 0)) {
            scores[game] = value;
        }
    }

    save(STORAGE.scores, scores);

    // Also send the score to the shared online leaderboard.
    submitOnlineScore(game, value);
}


async function submitOnlineScore(game, value) {

    if (!onlineDatabaseReady) return;

    // Goofy Clicker is intentionally local for now.
    if (game === "clicker") return;

    const numericScore = Number(value);

    if (!Number.isFinite(numericScore) || numericScore < 0) return;

    const username = String(profile.username || "PLAYER_001")
        .trim()
        .slice(0, 20);

    if (!username) return;

    try {
        const { error } = await supabaseClient
            .from("leaderboard_scores")
            .insert({
                player_id: playerID,
                username: username,
                game: game,
                score: numericScore
            });

        if (error) {
            console.warn("Online leaderboard upload failed:", error.message);
        }
    } catch (error) {
        console.warn("Online leaderboard connection failed:", error);
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function renderLocalLeaderboard(list) {

    Object.keys(gameNames).forEach(game => {

        if (game === "clicker") return;

        const best = getBest(game);
        const row = document.createElement("div");

        row.className = "leader-row";

        const displayScore = best
            ? (game === "reaction" ? `${best} ms` : best)
            : "NO RECORD";

        row.innerHTML = `
            <div class="leader-rank">LOCAL</div>
            <div class="leader-game">
                ${escapeHTML(gameNames[game])}
                <small style="display:block;color:#666;font-size:9px">
                    ${escapeHTML(profile.username)}
                </small>
            </div>
            <div class="leader-score">
                ${escapeHTML(displayScore)}
            </div>
        `;

        list.appendChild(row);
    });
}


async function renderLeaderboard() {

    const list = document.getElementById("leaderboardList");

    if (!list) return;

    list.innerHTML = `
        <div class="leader-row">
            <div class="leader-rank">...</div>
            <div class="leader-game">LOADING ONLINE SCORES</div>
            <div class="leader-score">SYNC</div>
        </div>
    `;

    if (!onlineDatabaseReady) {

        list.innerHTML = `
            <div style="padding:12px;color:#85899e;font-size:12px">
                ONLINE DATABASE NOT CONNECTED — showing your local records.
            </div>
        `;

        renderLocalLeaderboard(list);
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("leaderboard_scores")
            .select("username, game, score, created_at")
            .order("score", { ascending: false })
            .limit(1000);

        if (error) throw error;

        list.innerHTML = "";

        const games =
            Object.keys(gameNames)
                .filter(game => game !== "clicker");

        games.forEach(game => {

            const rows = (data || [])
                .filter(row => row.game === game)
                .sort((a, b) => {

                    const av = Number(a.score);
                    const bv = Number(b.score);

                    return game === "reaction"
                        ? av - bv
                        : bv - av;
                })
                .slice(0, 5);

            if (rows.length === 0) {

                const empty =
                    document.createElement("div");

                empty.className = "leader-row";

                empty.innerHTML = `
                    <div class="leader-rank">—</div>

                    <div class="leader-game">
                        ${escapeHTML(gameNames[game])}
                    </div>

                    <div class="leader-score">
                        NO SCORES
                    </div>
                `;

                list.appendChild(empty);

                return;
            }

            rows.forEach((row, index) => {

                const leaderRow =
                    document.createElement("div");

                leaderRow.className = "leader-row";

                const shownScore =
                    game === "reaction"
                        ? `${Number(row.score)} ms`
                        : Math.floor(Number(row.score));

                leaderRow.innerHTML = `
                    <div class="leader-rank">
                        #${String(index + 1).padStart(2, "0")}
                    </div>

                    <div class="leader-game">
                        ${escapeHTML(gameNames[game])}

                        <small
                            style="
                                display:block;
                                color:#666;
                                font-size:9px
                            "
                        >
                            ${escapeHTML(row.username || "PLAYER")}
                        </small>
                    </div>

                    <div class="leader-score">
                        ${escapeHTML(shownScore)}
                    </div>
                `;

                list.appendChild(leaderRow);
            });
        });

    } catch (error) {

        console.warn(
            "Could not load online leaderboard:",
            error
        );

        list.innerHTML = `
            <div
                style="
                    padding:12px;
                    color:#ff6b6b;
                    font-size:12px
                "
            >
                ONLINE LEADERBOARD ERROR —
                showing local records.
            </div>
        `;

        renderLocalLeaderboard(list);
    }
}


/* =========================================
   BADGES
========================================= */

const badgeData = [
    ["first", "🎮", "FIRST GAME", "Play your first game."],
    ["clicker", "👆", "GOOFY POWER", "Reach 100 clicks."],
    ["million", "💀", "WHY", "Reach 1,000 clicker clicks."],
    ["speed", "⚡", "SPEED DEMON", "Get a reaction under 300ms."],
    ["boss", "👾", "BOSS SLAYER", "Defeat the boss."],
    ["memory", "🧠", "BIG BRAIN", "Reach memory level 5."],
    ["defuser", "💣", "DEFUSER", "Defuse 5 bombs."],
    ["sniper", "🎯", "SHARPSHOOTER", "Hit 20 targets."],
    ["runner", "🏃", "RUN FOR IT", "Survive Pixel Runner."],
    ["combo", "🔥", "COMBO MONSTER", "Get 50 clicks in Combo Clicker."],
    ["chaos", "⚡", "CHAOS ENGINE", "Activate Chaos Mode."],
    ["hacker", "💻", "RAVIOLI", "Find the secret code."],
    ["all", "👑", "ARCADE LEGEND", "Unlock everything."]
];


function unlockBadge(id) {

    if (badges.includes(id)) return;

    badges.push(id);

    save(STORAGE.badges, badges);

    const badge = badgeData.find(b => b[0] === id);

    showJoke(
        "BADGE UNLOCKED: " +
        (badge ? badge[2] : id)
    );

    tone(800, .15);
}


function checkBadges() {

    if (currentGame) {
        unlockBadge("first");
    }

    if (clicker.clicks >= 100) {
        unlockBadge("clicker");
    }

    if (clicker.clicks >= 1000) {
        unlockBadge("million");
    }

    if (scores.reaction && scores.reaction < 300) {
        unlockBadge("speed");
    }

    if (scores.memory >= 5) {
        unlockBadge("memory");
    }

    if (scores.bomb >= 5) {
        unlockBadge("defuser");
    }

    if (scores.target >= 20) {
        unlockBadge("sniper");
    }

    if (scores.combo >= 50) {
        unlockBadge("combo");
    }

    if (scores.runner >= 20) {
        unlockBadge("runner");
    }

    updateStats();
}


function renderBadges() {

    const grid =
        document.getElementById("badgeGrid");

    if (!grid) return;

    grid.innerHTML = "";

    badgeData.forEach(badge => {

        const unlocked =
            badges.includes(badge[0]);

        const card =
            document.createElement("div");

        card.className =
            "badge-card " +
            (unlocked ? "unlocked" : "locked");

        card.innerHTML = `
            <div class="badge-icon">
                ${unlocked ? badge[1] : "🔒"}
            </div>

            <h3>
                ${unlocked ? badge[2] : "LOCKED"}
            </h3>

            <p>
                ${badge[3]}
            </p>
        `;

        grid.appendChild(card);
    });
}


/* =========================================
   GOOFY CLICKER
========================================= */

const clickerItems = {

    cursor: {
        name: "SUSPICIOUS CURSOR",
        desc: "+1 click power",
        base: 25,
        effect: "power"
    },

    mega: {
        name: "MEGA HAND",
        desc: "+5 click power",
        base: 150,
        effect: "mega"
    },

    reactor: {
        name: "GOOFY REACTOR",
        desc: "+1 click/sec",
        base: 300,
        effect: "auto"
    },

    crit: {
        name: "CRIT GLASSES",
        desc: "+5% critical chance",
        base: 500,
        effect: "crit"
    }

};


function getItemCost(id) {

    const item = clickerItems[id];

    return Math.floor(
        item.base *
        Math.pow(1.15, clicker.owned[id])
    );
}


function createClicker() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `

        <div class="clicker-wrap">

            <div class="clicker-main">

                <div
                    class="goofy-clicker-face"
                    id="goofyClickTarget"
                    title="WHY ARE YOU CLICKING THIS?"
                >

                    <div class="gc-eye left"></div>
                    <div class="gc-eye right"></div>

                    <div class="gc-mouth"></div>

                    <div class="gc-hat">???</div>

                </div>

            </div>

            <div class="clicker-shop">

                <h2>GOOFY SHOP</h2>

                <div class="clicker-count">
                    <span id="clickerCount">0</span>
                    CLICKS
                </div>

                <div id="clickerPowerText"></div>

                <div id="shopItems"></div>

            </div>

        </div>
    `;

    document
        .getElementById("goofyClickTarget")
        .addEventListener("click", clickGoofy);

    renderClicker();

    every(() => {

        if (clicker.perSecond <= 0) return;

        clicker.clicks += clicker.perSecond;

        save(STORAGE.clicker, clicker);

        renderClicker();

    }, 1000);
}


function clickGoofy() {

    let amount = clicker.power;

    if (Math.random() < clicker.critChance) {

        amount *= 3;

        showJoke("CRITICAL GOOF.");
    }

    clicker.clicks += amount;

    save(STORAGE.clicker, clicker);

    currentScore = clicker.clicks;

    renderClicker();

    tone(
        300 + Math.random() * 300,
        .05
    );

    createParticles(
        window.innerWidth / 2,
        window.innerHeight / 2,
        5
    );

    checkBadges();
}


function renderClicker() {

    const count =
        document.getElementById("clickerCount");

    if (!count) return;

    count.textContent =
        Math.floor(clicker.clicks);

    document.getElementById("clickerPowerText")
        .innerHTML = `
            <p
                style="
                    color:#85899e;
                    font-size:12px;
                    margin-bottom:15px
                "
            >
                Power:
                <b style="color:#00f7ff">
                    ${clicker.power}
                </b>

                • Auto:
                <b style="color:#39ff9a">
                    ${clicker.perSecond}/sec
                </b>

                • Crit:
                <b style="color:#ff28d7">
                    ${clicker.critChance * 100}%
                </b>
            </p>
        `;

    const shop =
        document.getElementById("shopItems");

    shop.innerHTML = "";

    Object.keys(clickerItems).forEach(id => {

        const item = clickerItems[id];

        const cost = getItemCost(id);

        const owned = clicker.owned[id];

        const button =
            document.createElement("button");

        button.className =
            "shop-item";

        button.disabled =
            clicker.clicks < cost;

        button.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <small>${item.desc}</small>
            </div>

            <div>
                <strong>${cost}</strong>

                <span class="shop-owned">
                    OWNED: ${owned}
                </span>
            </div>
        `;

        button.onclick = () =>
            buyClickerUpgrade(id);

        shop.appendChild(button);
    });
}


function buyClickerUpgrade(id) {

    const item = clickerItems[id];

    const cost = getItemCost(id);

    if (clicker.clicks < cost) {

        showJoke("BROKE DETECTED 💀");

        return;
    }

    clicker.clicks -= cost;

    clicker.owned[id]++;

    if (item.effect === "power") {
        clicker.power += 1;
    }

    if (item.effect === "mega") {
        clicker.power += 5;
    }

    if (item.effect === "auto") {
        clicker.perSecond += 1;
    }

    if (item.effect === "crit") {
        clicker.critChance += .05;
    }

    save(STORAGE.clicker, clicker);

    renderClicker();

    tone(700, .12);

    showJoke(
        item.name +
        " PURCHASED. OWNED: " +
        clicker.owned[id]
    );
}


/* =========================================
   CORE BREAKER
========================================= */

function createCore() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div class="center-game">
            <button
                class="start-game-btn"
                id="coreStart"
            >
                START CORE
            </button>
        </div>
    `;

    document
        .getElementById("coreStart")
        .onclick = () => {

            area.innerHTML = "";

            const core =
                document.createElement("button");

            core.className =
                "core-target";

            if (adminFlags.big) {

                core.style.width = "220px";
                core.style.height = "220px";
            }

            area.appendChild(core);

            let time = 20;

            currentScore = 0;

            every(() => {

                if (!adminFlags.infinite) {

                    time--;

                    currentTime = time;

                    updateHUD();

                    if (time <= 0) {

                        finishGame(
                            "CORE DESTROYED",
                            currentScore
                        );
                    }
                }

            }, 1000);

            core.onclick = () => {

                currentScore++;

                moveCore(core);

                updateHUD();

                tone(
                    400 + currentScore * 5,
                    .04
                );
            };

            moveCore(core);
        };
}


function moveCore(core) {

    core.style.left =
        `${20 + Math.random() * 60}%`;

    core.style.top =
        `${20 + Math.random() * 60}%`;
}

/* =========================================
   REACTION RUSH
========================================= */

function createReaction() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div class="center-game">
            <button
                class="reaction-target"
                id="reactionTarget"
            >
                WAIT...
            </button>
        </div>
    `;

    const target =
        document.getElementById("reactionTarget");

    let startTime = 0;
    let ready = false;

    const delay =
        1500 + Math.random() * 3500;

    later(() => {

        ready = true;

        startTime = performance.now();

        target.textContent = "CLICK!";
        target.classList.add("ready");

        tone(900, .08);

    }, delay);

    target.onclick = () => {

        if (!ready) {

            finishGame(
                "TOO EARLY 💀",
                9999
            );

            return;
        }

        const reaction =
            Math.round(performance.now() - startTime);

        currentScore = reaction;

        finishGame(
            `${reaction} MS`,
            reaction
        );
    };
}


/* =========================================
   DODGE THE VOID
========================================= */

function createDodge() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div class="dodge-area" id="dodgeArea">

            <div
                class="dodge-player"
                id="dodgePlayer"
            >
                🟦
            </div>

        </div>
    `;

    const player =
        document.getElementById("dodgePlayer");

    const dodgeArea =
        document.getElementById("dodgeArea");

    let x = 50;
    let y = 50;

    let alive = true;

    const keys = {};

    createTouchControls([
    {
        label: "◀",
        action: () => moveTouch("left")
    },
    {
        label: "▲",
        action: () => moveTouch("up")
    },
    {
        label: "▼",
        action: () => moveTouch("down")
    },
    {
        label: "▶",
        action: () => moveTouch("right")
    }
]);

    const moveTouch = direction => {

    if (direction === "left") x -= 8;
    if (direction === "right") x += 8;
    if (direction === "up") y -= 8;
    if (direction === "down") y += 8;

    x = Math.max(4, Math.min(96, x));
    y = Math.max(4, Math.min(96, y));
};

    const keydown = event => {
        keys[event.key.toLowerCase()] = true;
    };

    const keyup = event => {
        keys[event.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    addCleanup(() => {
        window.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
    });

    let seconds = 0;

    every(() => {

        if (!alive) return;

        const speed =
            adminFlags.gravity ? 3 : 2;

        if (keys.w || keys.arrowup) y -= speed;
        if (keys.s || keys.arrowdown) y += speed;
        if (keys.a || keys.arrowleft) x -= speed;
        if (keys.d || keys.arrowright) x += speed;

        x = Math.max(4, Math.min(96, x));
        y = Math.max(4, Math.min(96, y));

        player.style.left = `${x}%`;
        player.style.top = `${y}%`;

        currentScore += .1;

        seconds += .1;

        currentTime = seconds;

        updateHUD();

    }, 100);

    every(() => {

        if (!alive) return;

        const meteor =
            document.createElement("div");

        meteor.className =
            "dodge-meteor";

        meteor.textContent = "☄️";

        meteor.style.left =
            `${Math.random() * 90 + 5}%`;

        meteor.style.top = "-40px";

        dodgeArea.appendChild(meteor);

        const fall =
            setInterval(() => {

                const top =
                    parseFloat(meteor.style.top);

                meteor.style.top =
                    `${top + 7}px`;

                const px =
                    player.offsetLeft;

                const py =
                    player.offsetTop;

                const mx =
                    meteor.offsetLeft;

                const my =
                    meteor.offsetTop;

                const distance =
                    Math.hypot(px - mx, py - my);

                if (distance < 45) {

                    clearInterval(fall);

                    meteor.remove();

                    alive = false;

                    finishGame(
                        "YOU GOT BONKED",
                        Math.floor(currentScore)
                    );

                }

                if (top > dodgeArea.clientHeight) {

                    clearInterval(fall);

                    meteor.remove();
                }

            }, 40);

        addCleanup(() => clearInterval(fall));

    }, 700);
}


/* =========================================
   MEMORY GLITCH
========================================= */

function createMemory() {

    const area =
        document.getElementById("gameArea");

    let level = 1;

    function makeRound() {

        clearGame();

        currentScore = level;

        area.innerHTML = `
            <div class="memory-wrap">

                <h2>
                    MEMORIZE THE ORDER
                </h2>

                <div
                    class="memory-grid"
                    id="memoryGrid"
                ></div>

            </div>
        `;

        const grid =
            document.getElementById("memoryGrid");

        const size =
            Math.min(3 + level, 6);

        const total =
            size * size;

        const sequence = [];

        for (let i = 0; i < level + 2; i++) {

            sequence.push(
                Math.floor(Math.random() * total)
            );
        }

        let showing = true;

        sequence.forEach((index, i) => {

            later(() => {

                const tile =
                    grid.children[index];

                if (tile) {
                    tile.classList.add("memory-active");

                    later(() => {
                        tile.classList.remove(
                            "memory-active"
                        );
                    }, 350);
                }

            }, i * 500);

        });

        for (let i = 0; i < total; i++) {

            const tile =
                document.createElement("button");

            tile.className =
                "memory-tile";

            tile.dataset.index = i;

            tile.onclick = () => {

                if (showing) return;

                const expected =
                    sequence[gameState.memoryIndex];

                if (Number(tile.dataset.index) === expected) {

                    tile.classList.add(
                        "memory-correct"
                    );

                    gameState.memoryIndex++;

                    tone(700, .05);

                    if (
                        gameState.memoryIndex >=
                        sequence.length
                    ) {

                        level++;

                        if (level > 10) {

                            finishGame(
                                "MEMORY MASTER",
                                level
                            );

                        } else {

                            later(
                                makeRound,
                                500
                            );
                        }
                    }

                } else {

                    tile.classList.add(
                        "memory-wrong"
                    );

                    finishGame(
                        "MEMORY GLITCHED",
                        level
                    );
                }
            };

            grid.appendChild(tile);
        }

        gameState.memoryIndex = 0;

        later(() => {
            showing = false;
        }, (level + 2) * 500 + 300);
    }

    makeRound();
}


/* =========================================
   BOMB DEFUSER
========================================= */

function createBomb() {

    const area =
        document.getElementById("gameArea");

    let bombs = 0;
    let defused = 0;

    area.innerHTML = `
        <div class="bomb-game">

            <h2>
                DEFUSE THE BOMBS
            </h2>

            <p>
                Click the correct wire before time runs out.
            </p>

            <div
                id="bombContainer"
                class="bomb-container"
            ></div>

        </div>
    `;

    function spawnBomb() {

        bombs++;

        const container =
            document.getElementById("bombContainer");

        container.innerHTML = "";

        const colors = [
            "red",
            "blue",
            "green",
            "yellow"
        ];

        const correct =
            colors[
                Math.floor(
                    Math.random() * colors.length
                )
            ];

        colors.forEach(color => {

            const wire =
                document.createElement("button");

            wire.className =
                `bomb-wire ${color}`;

            wire.textContent =
                color.toUpperCase();

            wire.onclick = () => {

                if (color === correct) {

                    defused++;

                    currentScore =
                        defused;

                    updateHUD();

                    tone(800, .08);

                    if (defused >= 10) {

                        finishGame(
                            "BOMBS DEFUSED",
                            defused
                        );

                    } else {

                        spawnBomb();
                    }

                } else {

                    finishGame(
                        "WRONG WIRE 💀",
                        defused
                    );
                }
            };

            container.appendChild(wire);
        });
    }

    spawnBomb();
}


/* =========================================
   METEOR MAYHEM
========================================= */

function createMeteor() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div
            class="meteor-area"
            id="meteorArea"
        >
            <div class="meteor-player">
                🚀
            </div>
        </div>
    `;

    const meteorArea =
        document.getElementById("meteorArea");

    let destroyed = 0;

    function spawnMeteor() {

        const meteor =
            document.createElement("button");

        meteor.className =
            "meteor-target";

        meteor.textContent = "☄️";

        meteor.style.left =
            `${Math.random() * 85 + 5}%`;

        meteor.style.top =
            `${Math.random() * 75 + 5}%`;

        meteor.onclick = () => {

            destroyed++;

            currentScore =
                destroyed;

            meteor.remove();

            updateHUD();

            tone(
                350 + destroyed * 10,
                .06
            );

            if (destroyed >= 15) {

                finishGame(
                    "METEOR STORM CLEARED",
                    destroyed
                );
            }
        };

        meteorArea.appendChild(meteor);

        later(() => {

            if (meteor.isConnected) {
                meteor.remove();
            }

        }, 1800);
    }

    every(spawnMeteor, 500);

    for (let i = 0; i < 5; i++) {
        spawnMeteor();
    }
}


/* =========================================
   BOSS FIGHT
========================================= */

function createBoss() {

    const area =
        document.getElementById("gameArea");

    let hp =
        adminFlags.boss ? 1 : 100;

    area.innerHTML = `

        <div class="boss-game">

            <div class="boss-health">
                <div
                    id="bossHealth"
                    class="boss-health-fill"
                ></div>
            </div>

            <button
                id="bossTarget"
                class="boss-target"
            >
                👾
            </button>

            <p id="bossText">
                BOSS HP: ${hp}
            </p>

        </div>
    `;

    const target =
        document.getElementById("bossTarget");

    const health =
        document.getElementById("bossHealth");

    const text =
        document.getElementById("bossText");

    target.onclick = () => {

        if (adminFlags.god) {
            hp = Math.max(0, hp - 10);
        } else {
            hp--;
        }

        currentScore++;

        health.style.width =
            `${Math.max(0, hp)}%`;

        text.textContent =
            `BOSS HP: ${hp}`;

        target.style.transform =
            `rotate(${Math.random() * 20 - 10}deg)`;

        tone(
            150 + Math.random() * 200,
            .05
        );

        if (hp <= 0) {

            finishGame(
                "BOSS DEFEATED",
                currentScore
            );
        }
    };
}


/* =========================================
   GLITCH ROOM
========================================= */

function createGlitch() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div class="glitch-room">

            <h1 id="glitchText">
                FIND THE REAL BUTTON
            </h1>

            <div
                class="glitch-buttons"
                id="glitchButtons"
            ></div>

        </div>
    `;

    let round = 0;

    function makeRound() {

        const buttons =
            document.getElementById("glitchButtons");

        buttons.innerHTML = "";

        round++;

        const correct =
            Math.floor(Math.random() * 12);

        for (let i = 0; i < 12; i++) {

            const button =
                document.createElement("button");

            button.className =
                "glitch-button";

            button.textContent =
                i === correct
                    ? "CLICK ME"
                    : Math.random() > .5
                        ? "CLICK ME"
                        : "NOPE";

            button.style.transform =
                `rotate(${Math.random() * 20 - 10}deg)`;

            button.onclick = () => {

                if (i === correct) {

                    currentScore++;

                    updateHUD();

                    if (round >= 10) {

                        finishGame(
                            "GLITCH SURVIVED",
                            currentScore
                        );

                    } else {

                        makeRound();
                    }

                } else {

                    finishGame(
                        "THE GLITCH GOT YOU",
                        currentScore
                    );
                }
            };

            buttons.appendChild(button);
        }
    }

    makeRound();
}


/* =========================================
   COLOR SWITCH
========================================= */

function createColor() {

    const area =
        document.getElementById("gameArea");

    const colors = [
        "RED",
        "BLUE",
        "GREEN",
        "YELLOW"
    ];

    let round = 0;

    area.innerHTML = `
        <div class="color-game">

            <h2 id="colorPrompt">
                MATCH THE COLOR
            </h2>

            <div
                id="colorButtons"
                class="color-buttons"
            ></div>

        </div>
    `;

    const prompt =
        document.getElementById("colorPrompt");

    const buttons =
        document.getElementById("colorButtons");

    function nextColor() {

        buttons.innerHTML = "";

        const correct =
            colors[
                Math.floor(
                    Math.random() * colors.length
                )
            ];

        prompt.textContent =
            `CLICK ${correct}`;

        colors.forEach(color => {

            const button =
                document.createElement("button");

            button.className =
                `color-choice color-${color.toLowerCase()}`;

            button.textContent =
                color;

            button.onclick = () => {

                if (color === correct) {

                    round++;

                    currentScore =
                        round;

                    updateHUD();

                    if (round >= 15) {

                        finishGame(
                            "COLOR MASTER",
                            round
                        );

                    } else {

                        nextColor();
                    }

                } else {

                    finishGame(
                        "WRONG COLOR",
                        round
                    );
                }
            };

            buttons.appendChild(button);
        });
    }

    nextColor();
}

/* =========================================
   TARGET SNIPER
========================================= */

function createTarget() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div class="target-game">

            <h2>
                HIT THE TARGETS
            </h2>

            <div
                id="targetArea"
                class="target-area"
            ></div>

        </div>
    `;

    const targetArea =
        document.getElementById("targetArea");

    let hits = 0;

    function spawnTarget() {

        const target =
            document.createElement("button");

        target.className =
            "sniper-target";

        target.textContent = "🎯";

        target.style.left =
            `${Math.random() * 85 + 5}%`;

        target.style.top =
            `${Math.random() * 75 + 5}%`;

        target.onclick = () => {

            hits++;

            currentScore =
                hits;

            target.remove();

            updateHUD();

            tone(
                500 + hits * 10,
                .05
            );

            if (hits >= 20) {

                finishGame(
                    "SHARPSHOOTER",
                    hits
                );

            } else {

                spawnTarget();
            }
        };

        targetArea.appendChild(target);

        later(() => {

            if (target.isConnected) {

                target.remove();

                if (hits < 20) {
                    spawnTarget();
                }
            }

        }, 1500);
    }

    for (let i = 0; i < 3; i++) {
        spawnTarget();
    }
}


/* =========================================
   NUMBER HACKER
========================================= */

function createHacker() {

    const area =
        document.getElementById("gameArea");

    let level = 1;

    area.innerHTML = `
        <div class="hacker-game">

            <h2>
                NUMBER HACKER
            </h2>

            <p id="hackerQuestion">
                HACK THE NUMBER
            </p>

            <input
                id="hackerInput"
                type="number"
                autocomplete="off"
            >

            <button
                id="hackerSubmit"
            >
                SUBMIT
            </button>

        </div>
    `;

    const question =
        document.getElementById("hackerQuestion");

    const input =
        document.getElementById("hackerInput");

    const submit =
        document.getElementById("hackerSubmit");

    let answer = 0;

    function newQuestion() {

        const a =
            Math.floor(Math.random() * 20) + 1;

        const b =
            Math.floor(Math.random() * 20) + 1;

        const operations = [
            "+",
            "-",
            "*"
        ];

        const op =
            operations[
                Math.floor(
                    Math.random() * operations.length
                )
            ];

        if (op === "+") {
            answer = a + b;
        }

        if (op === "-") {
            answer = a - b;
        }

        if (op === "*") {
            answer = a * b;
        }

        question.textContent =
            `${a} ${op} ${b} = ?`;

        input.value = "";

        input.focus();
    }

    submit.onclick = () => {

        const value =
            Number(input.value);

        if (value === answer) {

            level++;

            currentScore =
                level - 1;

            updateHUD();

            tone(800, .06);

            if (level > 10) {

                finishGame(
                    "SYSTEM HACKED",
                    currentScore
                );

            } else {

                newQuestion();
            }

        } else {

            finishGame(
                "ACCESS DENIED",
                currentScore
            );
        }
    };

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                submit.click();
            }
        }
    );

    newQuestion();
}


/* =========================================
   GRAVITY FLIP
========================================= */

function createGravity() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div
            class="gravity-game"
            id="gravityGame"
        >

            <div
                class="gravity-player"
                id="gravityPlayer"
            >
                🟣
            </div>

            <div
                class="gravity-floor"
            ></div>

        </div>
    `;

    const game =
        document.getElementById("gravityGame");

    const player =
        document.getElementById("gravityPlayer");

    let x = 10;
    let y = 50;

    let velocity = 0;

    let flipped = false;

    const obstacles = [];

    function flip() {

        flipped = !flipped;

        game.classList.toggle(
            "gravity-flipped",
            flipped
        );

        velocity = 0;

        tone(650, .08);
    }

    const clickHandler = () => flip();

    game.addEventListener(
        "click",
        clickHandler
    );

    addCleanup(() => {

        game.removeEventListener(
            "click",
            clickHandler
        );

    });

    every(() => {

        velocity += flipped ? -.35 : .35;

        y += velocity;

        if (!flipped && y > 88) {
            y = 88;
            velocity = 0;
        }

        if (flipped && y < 12) {
            y = 12;
            velocity = 0;
        }

        player.style.left =
            `${x}%`;

        player.style.top =
            `${y}%`;

        x += .25;

        currentScore += .05;

        updateHUD();

        if (x > 100) {

            finishGame(
                "GRAVITY MASTER",
                Math.floor(currentScore)
            );
        }

    }, 50);
}


/* =========================================
   COMBO CLICKER
========================================= */

function createCombo() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div class="combo-game">

            <h2>
                COMBO CLICKER
            </h2>

            <div
                id="comboNumber"
                class="combo-number"
            >
                0
            </div>

            <button
                id="comboButton"
                class="combo-button"
            >
                CLICK!
            </button>

            <p>
                Keep clicking before the combo expires.
            </p>

        </div>
    `;

    const button =
        document.getElementById("comboButton");

    const number =
        document.getElementById("comboNumber");

    let combo = 0;

    let timer = null;

    function resetCombo() {

        clearTimeout(timer);

        timer = setTimeout(() => {

            if (combo > 0) {

                finishGame(
                    "COMBO LOST",
                    combo
                );
            }

        }, 1200);
    }

    button.onclick = () => {

        combo++;

        currentScore =
            combo;

        number.textContent =
            combo;

        number.style.transform =
            `scale(${1 + Math.min(combo, 20) / 20})`;

        tone(
            300 + combo * 12,
            .04
        );

        resetCombo();

        updateHUD();

        if (combo >= 50) {

            clearTimeout(timer);

            finishGame(
                "COMBO MONSTER",
                combo
            );
        }
    };

    addCleanup(() => {
        clearTimeout(timer);
    });
}


/* =========================================
   PIXEL RUNNER
========================================= */

function createRunner() {

    const area =
        document.getElementById("gameArea");

    area.innerHTML = `
        <div
            class="runner-game"
            id="runnerGame"
        >

            <div
                class="runner-player"
                id="runnerPlayer"
            >
                🏃
            </div>

            <div
                class="runner-ground"
            ></div>

            <div
                id="runnerObstacles"
            ></div>

        </div>
    `;

    const player =
        document.getElementById("runnerPlayer");

    const obstacleArea =
        document.getElementById("runnerObstacles");

    let jumping = false;

    let y = 0;

    let distance = 0;

    const keydown = event => {

        if (
            event.code === "Space" ||
            event.key === "ArrowUp"
        ) {

            jump();
        }
    };

    window.addEventListener(
        "keydown",
        keydown
    );

    addCleanup(() => {

        window.removeEventListener(
            "keydown",
            keydown
        );

    });

    if (isTouchDevice()) {

    createTouchControls([
        {
            label: "⬆ JUMP",
            action: jump
        }
    ]);

} else {

    player.onclick = jump;

}

    function jump() {

        if (jumping) return;

        jumping = true;

        let velocity = 10;

        const jumpLoop =
            setInterval(() => {

                y += velocity;

                velocity -= 1;

                if (y <= 0) {

                    y = 0;

                    jumping = false;

                    clearInterval(jumpLoop);
                }

                player.style.bottom =
                    `${y}px`;

            }, 40);

        addCleanup(() =>
            clearInterval(jumpLoop)
        );
    }

    every(() => {

        distance += .1;

        currentScore =
            Math.floor(distance * 10);

        updateHUD();

    }, 100);

    every(() => {

        const obstacle =
            document.createElement("div");

        obstacle.className =
            "runner-obstacle";

        obstacle.textContent = "🟥";

        obstacle.style.right = "-50px";

        obstacleArea.appendChild(obstacle);

        let right = -50;

        const move =
            setInterval(() => {

                right += 7;

                obstacle.style.right =
                    `${right}px`;

                const playerRect =
                    player.getBoundingClientRect();

                const obstacleRect =
                    obstacle.getBoundingClientRect();

                if (
                    playerRect.left <
                        obstacleRect.right &&
                    playerRect.right >
                        obstacleRect.left &&
                    playerRect.bottom >
                        obstacleRect.top + 10
                ) {

                    clearInterval(move);

                    finishGame(
                        "RUN ENDED",
                        currentScore
                    );
                }

                if (right > 1100) {

                    clearInterval(move);

                    obstacle.remove();
                }

            }, 40);

        addCleanup(() =>
            clearInterval(move)
        );

    }, 1300);
}


/* =========================================
   PAGE / GAME HELPERS
========================================= */

function goHome() {
    clearGame();
    closeResult();
    showPage("home");
}


function goArcade() {
    clearGame();
    closeResult();
    showPage("arcade");
}


function goBadges() {
    clearGame();
    closeResult();
    showPage("badges");
}


function goLeaderboard() {
    clearGame();
    closeResult();
    showPage("leaderboard");
}


/* =========================================
   STATS
========================================= */

function updateStats() {

    const gameCount =
        document.getElementById("gameCount");

    if (gameCount) {
        gameCount.textContent = "15";
    }

    const badgeCount =
        document.getElementById("badgeCount");

    if (badgeCount) {
        badgeCount.textContent =
            badges.length;
    }

    const scoreCount =
        document.getElementById("scoreCount");

    if (scoreCount) {

        scoreCount.textContent =
            Object.keys(scores).length;
    }

    renderProfile();
}


/* =========================================
   RANDOM JOKES
========================================= */

const randomMessages = [

    "🐔 THE CHICKEN KNOWS.",
    "⚠️ WHY ARE YOU STILL HERE?",
    "SYSTEM: bro what are you doing",
    "💀 THAT BUTTON WAS NOT SUPPOSED TO WORK",
    "NASA HAS BEEN NOTIFIED.",
    "🧀 CHEESE PROTOCOL ACTIVATED",
    "404: COMMON SENSE NOT FOUND",
    "THE WEBSITE IS WATCHING 👁️",
    "⚡ MAXIMUM GOOFY DETECTED",
    "WHO GAVE YOU ADMIN 😭",
    "🔥 YOUR COMPUTER IS 12% MORE POWERFUL NOW",
    "WARNING: SILLY LEVELS EXCEED LIMIT",
    "🐔 CHICKEN INCOMING",
    "YOU HAVE BEEN SELECTED FOR ABSOLUTELY NOTHING",
    "MADE BY ANATOLII™",
    "THE VOID HAS SENT YOU A FRIEND REQUEST",
    "CLICKING RANDOMLY IS A VALID STRATEGY",
    "BRO IS GAMING",
    "SYSTEM OVERCLOCKED 💀"
];


function showJoke(message) {

    const text =
        message ||
        randomMessages[
            Math.floor(
                Math.random() *
                randomMessages.length
            )
        ];

    const popup =
        document.createElement("div");

    popup.className =
        "chaos-message";

    popup.textContent =
        text;

    document.body.appendChild(popup);

    requestAnimationFrame(() => {
        popup.classList.add("show");
    });

    later(() => {

        popup.classList.remove("show");

        later(() => {
            popup.remove();
        }, 400);

    }, 2500);
}


/* =========================================
   PARTICLES
========================================= */

function createParticles(
    x,
    y,
    amount = 10
) {

    for (let i = 0; i < amount; i++) {

        const particle =
            document.createElement("div");

        particle.className =
            "chaos-particle";

        particle.textContent =
            ["✨", "⭐", "💥", "⚡", "🔥"][
                Math.floor(
                    Math.random() * 5
                )
            ];

        particle.style.left =
            `${x}px`;

        particle.style.top =
            `${y}px`;

        particle.style.setProperty(
            "--dx",
            `${Math.random() * 200 - 100}px`
        );

        particle.style.setProperty(
            "--dy",
            `${Math.random() * 200 - 100}px`
        );

        document.body.appendChild(
            particle
        );

        later(() => {
            particle.remove();
        }, 900);
    }
}


/* =========================================
   CHICKEN
========================================= */

function spawnChicken() {

    const chicken =
        document.createElement("div");

    chicken.className =
        "walking-chicken";

    chicken.textContent =
        "🐔";

    chicken.style.top =
        `${20 + Math.random() * 65}%`;

    chicken.style.left =
        "-100px";

    document.body.appendChild(chicken);

    requestAnimationFrame(() => {

        chicken.style.transform =
            "translateX(calc(100vw + 200px))";
    });

    later(() => {

        chicken.remove();

    }, 10000);
}


/* =========================================
   FLOATING TEXT
========================================= */

function spawnFloatingText(
    text,
    x = window.innerWidth / 2,
    y = window.innerHeight / 2
) {

    const element =
        document.createElement("div");

    element.className =
        "floating-chaos-text";

    element.textContent =
        text;

    element.style.left =
        `${x}px`;

    element.style.top =
        `${y}px`;

    document.body.appendChild(element);

    later(() => {
        element.remove();
    }, 1800);
}


/* =========================================
   SCREEN EFFECTS
========================================= */

function screenShake() {

    document.body.classList.add(
        "screen-shake"
    );

    later(() => {

        document.body.classList.remove(
            "screen-shake"
        );

    }, 500);
}


function screenFlash() {

    const flash =
        document.createElement("div");

    flash.className =
        "screen-flash";

    document.body.appendChild(flash);

    later(() => {
        flash.remove();
    }, 250);
}


function rainbowExplosion() {

    const amount = 30;

    for (let i = 0; i < amount; i++) {

        const emoji =
            document.createElement("div");

        emoji.className =
            "rainbow-explosion";

        emoji.textContent =
            ["🌈", "💥", "✨", "⭐", "⚡"][
                Math.floor(
                    Math.random() * 5
                )
            ];

        emoji.style.left =
            `${Math.random() * 100}vw`;

        emoji.style.top =
            `${Math.random() * 100}vh`;

        document.body.appendChild(emoji);

        later(() => {
            emoji.remove();
        }, 1500);
    }
}


function flipScreen() {

    document.body.classList.add(
        "screen-flipped"
    );

    later(() => {

        document.body.classList.remove(
            "screen-flipped"
        );

    }, 1200);
}

/* =========================================
   EXTRA CHAOS EFFECTS
========================================= */

function spawnEmoji(
    emoji = "💥",
    x = Math.random() * window.innerWidth,
    y = Math.random() * window.innerHeight
) {

    const element =
        document.createElement("div");

    element.className =
        "chaos-emoji";

    element.textContent =
        emoji;

    element.style.left =
        `${x}px`;

    element.style.top =
        `${y}px`;

    document.body.appendChild(element);

    later(() => {
        element.remove();
    }, 1600);
}


function teleportButton() {

    const buttons =
        document.querySelectorAll(
            "button"
        );

    if (!buttons.length) return;

    const button =
        buttons[
            Math.floor(
                Math.random() *
                buttons.length
            )
        ];

    button.style.position =
        "relative";

    button.style.left =
        `${Math.random() * 100 - 50}px`;

    button.style.top =
        `${Math.random() * 100 - 50}px`;

    later(() => {

        button.style.left = "";
        button.style.top = "";

    }, 1200);
}


/* =========================================
   CHAOS MODE
========================================= */

let chaosMode = false;

function toggleChaos() {

    chaosMode =
        !chaosMode;

    document.body.classList.toggle(
        "chaos-active",
        chaosMode
    );

    if (chaosMode) {

        showJoke(
            "⚠️ MEGA CHAOS ACTIVATED"
        );

        spawnChicken();

        rainbowExplosion();

        screenShake();

        tone(120, .3);

    } else {

        showJoke(
            "CHAOS DISABLED... FOR NOW."
        );
    }
}


function activateChaos() {

    chaosMode = true;

    document.body.classList.add(
        "chaos-active"
    );

    for (let i = 0; i < 10; i++) {

        later(() => {

            spawnEmoji();

            screenShake();

        }, i * 300);
    }

    spawnChicken();

    rainbowExplosion();

    showJoke(
        "💀 MEGA CHAOS MODE"
    );
}


/* =========================================
   ADMIN SYSTEM
========================================= */

function unlockAdmin() {

    const input =
        prompt(
            "ENTER ADMIN CODE:"
        );

    if (
        input &&
        input.trim().toLowerCase() ===
        "ravioli"
    ) {

        adminUnlocked = true;

        localStorage.setItem(
            STORAGE.admin,
            "true"
        );

        showJoke(
            "🔓 ADMIN ACCESS GRANTED"
        );

        tone(1000, .2);

        return true;
    }

    showJoke(
        "❌ ACCESS DENIED"
    );

    return false;
}


function addAdminScore() {

    currentScore += 100;

    updateHUD();

    spawnFloatingText(
        "+100 SCORE"
    );

    tone(900, .08);
}


function resetAdminFlags() {

    Object.keys(
        adminFlags
    ).forEach(key => {

        adminFlags[key] =
            false;

    });

    showJoke(
        "ADMIN FLAGS RESET"
    );
}


function unlockAllBadges() {

    badgeData.forEach(
        badge => {

            if (
                !badges.includes(
                    badge.id
                )
            ) {

                badges.push(
                    badge.id
                );
            }

        }
    );

    save(
        STORAGE.badges,
        badges
    );

    renderBadges();

    showJoke(
        "🏆 ALL BADGES UNLOCKED"
    );
}


/* =========================================
   ADMIN COMMANDS
========================================= */

function runAdminCommand(
    command
) {

    if (!adminUnlocked) {

        showJoke(
            "🚫 ADMIN ACCESS REQUIRED"
        );

        return;
    }

    const cmd =
        String(command)
            .trim()
            .toLowerCase();

    if (cmd === "god") {

        adminFlags.god =
            !adminFlags.god;

        showJoke(
            `GOD MODE: ${
                adminFlags.god
                    ? "ON"
                    : "OFF"
            }`
        );

        return;
    }

    if (cmd === "slow") {

        adminFlags.slow =
            !adminFlags.slow;

        showJoke(
            "SLOW MOTION TOGGLED"
        );

        return;
    }

    if (cmd === "big") {

        adminFlags.big =
            !adminFlags.big;

        document.body.classList.toggle(
            "giant-mode",
            adminFlags.big
        );

        showJoke(
            "GIANT MODE"
        );

        return;
    }

    if (cmd === "boss") {

        adminFlags.boss =
            !adminFlags.boss;

        showJoke(
            "BOSS HP MODIFIER TOGGLED"
        );

        return;
    }

    if (cmd === "infinite") {

        adminFlags.infinite =
            !adminFlags.infinite;

        showJoke(
            "INFINITE TIME TOGGLED"
        );

        return;
    }

    if (cmd === "turbo") {

        adminFlags.turbo =
            !adminFlags.turbo;

        showJoke(
            "TURBO MODE"
        );

        return;
    }

    if (cmd === "gravity") {

        adminFlags.gravity =
            !adminFlags.gravity;

        showJoke(
            "LOW GRAVITY"
        );

        return;
    }

    if (cmd === "rainbow") {

        rainbowExplosion();

        return;
    }

    if (cmd === "rain") {

        for (let i = 0; i < 25; i++) {

            later(() => {

                spawnEmoji(
                    ["💥","⭐","🌈","🐔","🔥"][
                        Math.floor(
                            Math.random() * 5
                        )
                    ]
                );

            }, i * 100);
        }

        return;
    }

    if (cmd === "flash") {

        screenFlash();

        return;
    }

    if (cmd === "shake") {

        screenShake();

        return;
    }

    if (cmd === "glitch") {

        document.body.classList.add(
            "glitch-screen"
        );

        later(() => {

            document.body.classList.remove(
                "glitch-screen"
            );

        }, 1500);

        return;
    }

    if (cmd === "party") {

        activateChaos();

        return;
    }

    if (cmd === "meteor") {

        for (let i = 0; i < 15; i++) {

            later(() => {

                spawnEmoji(
                    "☄️"
                );

            }, i * 120);
        }

        return;
    }

    if (cmd === "invert") {

        flipScreen();

        return;
    }

    if (cmd === "badges") {

        unlockAllBadges();

        return;
    }

    if (cmd === "win") {

        finishGame(
            "ADMIN INSTANT WIN",
            currentScore + 100
        );

        return;
    }

    if (cmd === "score") {

        addAdminScore();

        return;
    }

    if (cmd === "reset") {

        restartCurrentGame();

        return;
    }

    if (cmd === "clearfx") {

        document.body.className =
            document.body.className
                .replace(
                    "chaos-active",
                    ""
                )
                .replace(
                    "screen-shake",
                    ""
                )
                .replace(
                    "screen-flipped",
                    ""
                )
                .replace(
                    "giant-mode",
                    ""
                );

        showJoke(
            "✨ EFFECTS CLEARED"
        );

        return;
    }

    if (cmd === "matrix") {

        document.body.classList.add(
            "matrix-mode"
        );

        later(() => {

            document.body.classList.remove(
                "matrix-mode"
            );

        }, 5000);

        return;
    }

    if (cmd === "superjump") {

        spawnFloatingText(
            "🚀 SUPER JUMP"
        );

        screenShake();

        return;
    }

    if (cmd === "allpowers") {

        Object.keys(
            adminFlags
        ).forEach(key => {

            adminFlags[key] =
                true;

        });

        activateChaos();

        showJoke(
            "⚡ ALL POWERS ACTIVATED"
        );

        return;
    }

    if (cmd === "supernova") {

        rainbowExplosion();

        screenFlash();

        screenShake();

        for (let i = 0; i < 30; i++) {

            later(() => {

                spawnEmoji(
                    "💥"
                );

            }, i * 60);
        }

        showJoke(
            "☢️ SUPERNOVA"
        );

        return;
    }

    showJoke(
        `UNKNOWN COMMAND: ${cmd}`
    );
}


/* =========================================
   ADMIN PANEL
========================================= */

function openAdminPanel() {

    if (!adminUnlocked) {

        unlockAdmin();

        if (!adminUnlocked) return;
    }

    const commands = [
        "god",
        "slow",
        "big",
        "boss",
        "infinite",
        "turbo",
        "gravity",
        "rainbow",
        "rain",
        "flash",
        "shake",
        "glitch",
        "party",
        "meteor",
        "invert",
        "badges",
        "win",
        "score",
        "reset",
        "clearfx",
        "matrix",
        "superjump",
        "allpowers",
        "supernova"
    ];

    const command =
        prompt(
            "ADMIN COMMAND:\n\n" +
            commands.join(", ")
        );

    if (command) {
        runAdminCommand(command);
    }
}


/* =========================================
   MADE BY ANATOLII MESSAGE
========================================= */

function showMadeByAnatolii() {

    showJoke(
        "🔥 made by anatolii"
    );
}


/* Every 5 minutes */

setInterval(
    showMadeByAnatolii,
    5 * 60 * 1000
);


/* =========================================
   RANDOM CHAOS EVENTS
========================================= */

setInterval(() => {

    if (
        !document.hidden &&
        Math.random() < 0.35
    ) {

        const events = [
            () => spawnChicken(),
            () => spawnEmoji("🐔"),
            () => spawnEmoji("💥"),
            () => screenFlash(),
            () => showJoke(),
            () => spawnFloatingText(
                "+1 GOOFY"
            )
        ];

        const event =
            events[
                Math.floor(
                    Math.random() *
                    events.length
                )
            ];

        event();
    }

}, 20000);


/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "a"
        ) {

            event.preventDefault();

            openAdminPanel();
        }

        if (
            event.key === "Escape"
        ) {

            closeProfile();

            closeResult();
        }

        if (
            event.key.toLowerCase() === "c" &&
            event.ctrlKey
        ) {

            activateChaos();
        }
    }
);


/* =========================================
   BUTTON SOUND
========================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );

        if (
            button &&
            soundOn
        ) {

            tone(
                220 +
                Math.random() * 180,
                .035
            );
        }

    }
);


/* =========================================
   INITIALIZATION
========================================= */

function initNeonChaos() {

    renderProfile();

    renderBadges();

    updateStats();

    const soundButton =
        document.getElementById(
            "soundToggle"
        );

    if (soundButton) {

        soundButton.textContent =
            soundOn
                ? "🔊 SOUND ON"
                : "🔇 SOUND OFF";
    }

    const adminButton =
        document.getElementById(
            "adminButton"
        );

    if (adminButton) {

        adminButton.style.display =
            adminUnlocked
                ? "block"
                : "";
    }

    /* Make game cards keyboard-friendly */

    document
        .querySelectorAll(
            "[data-game]"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const game =
                        card.dataset.game;

                    if (game) {
                        startGame(game);
                    }
                }
            );

        });

    /* Start on home */

    showPage("home");

    /* Tiny startup effect */

    later(() => {

        spawnChicken();

    }, 1200);

    later(() => {

        showJoke(
            "⚡ NEON//CHAOS ONLINE"
        );

    }, 1800);
}


/* =========================================
   GLOBAL FALLBACKS
========================================= */

window.showPage =
    showPage;

window.startGame =
    startGame;

window.openGame =
    startGame;

window.openProfile =
    openProfile;

window.closeProfile =
    closeProfile;

window.saveProfile =
    saveProfile;

window.toggleSound =
    toggleSound;

window.unlockAdmin =
    unlockAdmin;

window.openAdminPanel =
    openAdminPanel;

window.runAdminCommand =
    runAdminCommand;

window.toggleChaos =
    toggleChaos;

window.activateChaos =
    activateChaos;

window.goHome =
    goHome;

window.goArcade =
    goArcade;

window.goBadges =
    goBadges;

window.goLeaderboard =
    goLeaderboard;


/* =========================================
   START
========================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initNeonChaos
    );

} else {

    initNeonChaos();
}
