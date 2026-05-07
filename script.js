/****************************************************
 * TANZIMAT MONOPOLY — FULL GAME LOGIC (NEW VERSION)
 * Includes 4 Victory Conditions:
 * 1. KP Victory (3000 KP)
 * 2. Property Victory (10 properties)
 * 3. Bankruptcy Elimination
 * 4. Last Player Standing
 ****************************************************/

// ===================== DATA =======================
const BOARD_SPACES = [
    { pos:0, type:'corner', name:'GO', desc:'Collect 200 KP', action:'go', value:200 },
    { pos:1, type:'property', name:'Rose Garden', category:'did-you-know', price:80, rent:20 },
    { pos:2, type:'community-chest', name:'Reform Decree' },
    { pos:3, type:'property', name:'Military Schools', category:'did-you-know', price:80, rent:20 },
    { pos:4, type:'tax', name:'Reform Tax', desc:'Pay 150 KP', value:150 },
    { pos:5, type:'railroad', name:'Telegraph Lines', price:200, rent:40 },
    { pos:6, type:'property', name:'Legal Code', category:'true-false', price:100, rent:25 },
    { pos:7, type:'chance', name:'Chance' },
    { pos:8, type:'property', name:'Public Education', category:'true-false', price:100, rent:25 },
    { pos:9, type:'property', name:'Tax Collection', category:'true-false', price:120, rent:30 },
    { pos:10, type:'corner', name:'JANISSARY CRISIS', desc:'Jail', action:'jail' },
    { pos:11, type:'property', name:'Secular Courts', category:'what-next', price:140, rent:35 },
    { pos:12, type:'utility', name:'Official Gazette', price:150 },
    { pos:13, type:'property', name:'Postal Reform', category:'what-next', price:140, rent:35 },
    { pos:14, type:'property', name:'Infrastructure', category:'what-next', price:160, rent:40 },
    { pos:15, type:'railroad', name:'Steamship Co.', price:200, rent:40 },
    { pos:16, type:'property', name:'Banking System', category:'two-truths', price:180, rent:45 },
    { pos:17, type:'community-chest', name:'Reform Chest' },
    { pos:18, type:'property', name:'Industry', category:'two-truths', price:180, rent:45 },
    { pos:19, type:'property', name:'Factory Laws', category:'two-truths', price:200, rent:50 },
    { pos:20, type:'corner', name:'FREE PARK', desc:'Rest & Collect 100 KP', action:'free', value:100 },
    { pos:21, type:'property', name:'Land Code', category:'did-you-know', price:220, rent:55 },
    { pos:22, type:'chance', name:'Chance' },
    { pos:23, type:'property', name:'Conscription', category:'did-you-know', price:220, rent:55 },
    { pos:24, type:'property', name:'Modern Army', category:'did-you-know', price:240, rent:60 },
    { pos:25, type:'railroad', name:'Railway Network', price:200, rent:40 },
    { pos:26, type:'property', name:'Foreign Policy', category:'true-false', price:260, rent:65 },
    { pos:27, type:'property', name:'Westernization', category:'true-false', price:260, rent:65 },
    { pos:28, type:'utility', name:'Imperial Post', price:150 },
    { pos:29, type:'property', name:'Bureaucracy', category:'true-false', price:280, rent:70 },
    { pos:30, type:'corner', name:'GO TO JAIL', desc:'Go to Janissary Crisis', action:'gotojail' },
    { pos:31, type:'property', name:'Constitution', category:'what-next', price:300, rent:75 },
    { pos:32, type:'property', name:'Parliament', category:'what-next', price:300, rent:75 },
    { pos:33, type:'community-chest', name:'Reform Chest' },
    { pos:34, type:'property', name:'Press Freedom', category:'what-next', price:320, rent:80 },
    { pos:35, type:'railroad', name:'Caravan Routes', price:200, rent:40 },
    { pos:36, type:'chance', name:'Chance' },
    { pos:37, type:'property', name:'Modern Industry', category:'two-truths', price:350, rent:90 },
    { pos:38, type:'tax', name:'Luxury Tax', desc:'Pay 100 KP', value:100 },
    { pos:39, type:'property', name:'Imperial Edict', category:'two-truths', price:400, rent:100 }
];

const QUESTION_SET = {
    'did-you-know': [
        { text:"The Gülhane Edict was announced in a rose garden to symbolize transparency.", points:35 }
    ],
    'true-false': [
        { text:"The Tanzimat reforms abolished all religious discrimination instantly in 1839.", answer:false, explanation:"False. Equality was proclaimed but faced resistance.", points:45 }
    ],
    'what-next': [
        { setup:"After the 1839 Edict promised equal rights...", options:["Janissaries supported reforms","New secular courts & schools emerged","Ottoman Empire collapsed"], correct:1, explanation:"Modern institutions were founded.", points:55 }
    ],
    'two-truths': [
        { statements:["Sultan Mahmud II crushed Janissaries","Reforms aimed for slow change","European-style uniforms adopted"], lieIndex:1, explanation:"Reformers wanted rapid modernization.", points:65 }
    ]
};

const CHANCE_CARDS = [
    { text:"Advance to GO", action:'moveTo', target:0, gain:200 },
    { text:"Foreign investment: Collect 150 KP", action:'collect', amount:150 },
    { text:"Go back 3 spaces", action:'moveSteps', steps:-3 },
    { text:"Reform committee awards you 100 KP", action:'collect', amount:100 }
];

const CHEST_CARDS = [
    { text:"Reform success! Advance to GO.", action:'moveTo', target:0, gain:200 },
    { text:"Bank error: Collect 100 KP", action:'collect', amount:100 },
    { text:"Pay school fees: 50 KP", action:'pay', amount:50 },
    { text:"Win contest: +150 KP", action:'collect', amount:150 }
];

// ===================== GAME STATE =======================
let players = [];
let currentPlayerIdx = 0;
let gameActive = false;
let awaitingAction = false;
let extraTurnFlag = false;
let propertiesOwned = [];
let chanceDeck = [], chestDeck = [];
let victoryRule = "kp"; // default

// ===================== UTILS =======================
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initDecks() {
    chanceDeck = shuffle([...CHANCE_CARDS]);
    chestDeck = shuffle([...CHEST_CARDS]);
}

// ===================== VICTORY SYSTEM =======================
function checkVictory() {
    // 1. KP Victory
    if (victoryRule === "kp") {
        for (let p of players) {
            if (p.kp >= 3000) {
                showWinner(p.name);
                return true;
            }
        }
    }

    // 2. Property Victory
    if (victoryRule === "properties") {
        for (let p of players) {
            if ((p.properties || 0) >= 10) {
                showWinner(p.name);
                return true;
            }
        }
    }

    // 3. Bankruptcy Elimination
    if (victoryRule === "bankruptcy") {
        let alive = players.filter(p => p.kp >= 0);
        if (alive.length === 1) {
            showWinner(alive[0].name);
            return true;
        }
    }

    // 4. Last Player Standing
    if (victoryRule === "last") {
        let active = players.filter(p => !p.eliminated);
        if (active.length === 1) {
            showWinner(active[0].name);
            return true;
        }
    }

    return false;
}

function showWinner(name) {
    gameActive = false;
    document.getElementById('winnerMsg').innerText = `${name} is the Grand Vizier!`;
    document.getElementById('winnerBanner').style.display = 'block';
}

// ===================== BOARD RENDERING =======================
const BOARD_SIZE = 600, CORNER = 80;
const SIDE_LEN = BOARD_SIZE - 2 * CORNER;
const CELL_W = SIDE_LEN / 9;
const CELL_H = SIDE_LEN / 9;
const PROP_VW = 65;
const PROP_VH = CELL_H;
const HORIZ_H = 58;

function renderBoard() {
    const boardDiv = document.getElementById('monopolyBoard');
    boardDiv.innerHTML = `
        <div class="board-center">
            <div class="center-title">TANZİMAT</div>
            <div class="center-subtitle">1839-1876</div>
        </div>
    `;

    const addCell = (space, left, top, width, height, side = null) => {
        const cell = document.createElement('div');
        cell.className = `board-cell ${space.type}-cell`;
        if (space.type === 'property') cell.classList.add(`property-${space.category?.replace('-','')}`);
        if (space.type === 'corner') cell.classList.add('corner-cell');
        cell.id = `cell-${space.pos}`;
        cell.style.left = `${left}px`;
        cell.style.top = `${top}px`;
        cell.style.width = `${width}px`;
        cell.style.height = `${height}px`;

        if (side === 'left') cell.classList.add('left-side-cell');
        if (side === 'right') cell.classList.add('right-side-cell');

        cell.innerHTML = `
            <div class="cell-number">${space.pos}</div>
            <div class="cell-title">${space.name}</div>
            <div class="cell-description">${space.desc || (space.price ? space.price + ' KP' : '')}</div>
        `;
        boardDiv.appendChild(cell);
    };

    // Bottom row
    for (let i = 0; i < 9; i++) {
        const pos = 9 - i;
        const space = BOARD_SPACES.find(s => s.pos === pos);
        const left = BOARD_SIZE - CORNER - (i + 1) * CELL_W;
        const top = BOARD_SIZE - CORNER;
        addCell(space, left, top, CELL_W, HORIZ_H);
    }

    // Left column
    for (let i = 0; i < 9; i++) {
        const pos = 11 + i;
        const space = BOARD_SPACES.find(s => s.pos === pos);
        const left = 0;
        const top = BOARD_SIZE - CORNER - (i + 1) * CELL_H;
        addCell(space, left, top, PROP_VW, CELL_H, 'left');
    }

    // Top row
    for (let i = 0; i < 9; i++) {
        const pos = 21 + i;
        const space = BOARD_SPACES.find(s => s.pos === pos);
        const left = CORNER + i * CELL_W;
        const top = 0;
        addCell(space, left, top, CELL_W, HORIZ_H);
    }

    // Right column
    for (let i = 0; i < 9; i++) {
        const pos = 31 + i;
        const space = BOARD_SPACES.find(s => s.pos === pos);
        const left = BOARD_SIZE - PROP_VW;
        const top = CORNER + i * CELL_H;
        addCell(space, left, top, PROP_VW, CELL_H, 'right');
    }

    // Corners
    const corners = [0, 10, 20, 30];
    corners.forEach(pos => {
        const space = BOARD_SPACES.find(s => s.pos === pos);
        let left, top;
        if (pos === 0) { left = BOARD_SIZE - CORNER; top = BOARD_SIZE - CORNER; }
        else if (pos === 10) { left = 0; top = BOARD_SIZE - CORNER; }
        else if (pos === 20) { left = 0; top = 0; }
        else { left = BOARD_SIZE - CORNER; top = 0; }
        addCell(space, left, top, CORNER, CORNER);
    });

    updateAllTokens();
}

// ===================== TOKENS =======================
function updateAllTokens() {
    document.querySelectorAll('.player-token').forEach(t => t.remove());

    players.forEach((p, idx) => {
        const cell = document.getElementById(`cell-${p.position}`);
        if (cell) {
            const tok = document.createElement('div');
            tok.className = 'player-token';
            tok.style.background = p.color;
            const offsets = [
                { top: '3px', left: '3px' },
                { top: '3px', right: '3px' },
                { bottom: '3px', left: '3px' },
                { bottom: '3px', right: '3px' }
            ];
            Object.assign(tok.style, offsets[idx % 4]);
            cell.appendChild(tok);
        }
    });

    document.querySelectorAll('.board-cell').forEach(c => c.classList.remove('active'));
    const activeCell = document.getElementById(`cell-${players[currentPlayerIdx]?.position}`);
    if (activeCell) activeCell.classList.add('active');
}

// ===================== PROPERTY OWNERSHIP =======================
function getPropertyOwner(pos) {
    return propertiesOwned.find(p => p.pos === pos)?.owner ?? null;
}

function buyPropertyAction(pos) {
    let player = players[currentPlayerIdx];
    let space = BOARD_SPACES.find(s => s.pos === pos);

    if (player.kp >= space.price && getPropertyOwner(pos) === null) {
        player.kp -= space.price;
        propertiesOwned.push({ pos, owner: currentPlayerIdx, price: space.price, rent: space.rent });
        player.properties = (player.properties || 0) + 1;
        addLog(`${player.name} bought ${space.name} for ${space.price} KP!`);
        updateUI();

        if (checkVictory()) return;

        showPropertyQuestion(space);
    } else {
        addLog(`Cannot afford ${space.name}`);
        endTurnOrExtra();
    }
}

// ===================== QUESTIONS =======================
function showPropertyQuestion(space) {
    if (!space.category) { endTurnOrExtra(); return; }

    let q = QUESTION_SET[space.category]?.[0];
    if (!q) { endTurnOrExtra(); return; }

    document.getElementById('cardCategoryTitle').innerHTML =
        `📜 ${space.category.replace('-', ' ').toUpperCase()}`;

    let html = '';

    if (space.category === 'did-you-know') {
        html = `
            <p>${q.text}</p>
            <button class="answer-btn" onclick="answerGeneric(${q.points})">
                📖 Learn (Earn ${q.points} KP)
            </button>`;
    }

    else if (space.category === 'true-false') {
        html = `
            <p>${q.text}</p>
            <button class="answer-btn" onclick="answerTF(true, '${q.explanation}', ${q.points})">✔️ True</button>
            <button class="answer-btn" onclick="answerTF(false, '${q.explanation}', ${q.points})">❌ False</button>`;
    }

    else if (space.category === 'what-next') {
        html = `
            <p>${q.setup}</p>
            ${q.options.map((opt, i) =>
                `<button class="answer-btn" onclick="answerWN(${i},${q.correct},'${q.explanation}',${q.points})">${opt}</button>`
            ).join('')}`;
    }

    else if (space.category === 'two-truths') {
        html = `
            <p>Which is the lie?</p>
            ${q.statements.map((s, i) =>
                `<button class="answer-btn" onclick="answerTT(${i},${q.lieIndex},'${q.explanation}',${q.points})">${s}</button>`
            ).join('')}`;
    }

    document.getElementById('cardTextDisplay').innerHTML = html;
    document.getElementById('answerContainer').innerHTML = '';
    awaitingAction = true;
}

window.answerGeneric = (points) => {
    if (!awaitingAction) return;
    players[currentPlayerIdx].kp += points;
    addLog(`+${points} KP`);
    showResult(true, `+${points} KP`);
    awaitingAction = false;

    if (checkVictory()) return;

    endTurnOrExtra();
    updateUI();
};

window.answerTF = (ans, exp, pts) => {
    if (!awaitingAction) return;
    let correct = (ans === true);
    if (correct) players[currentPlayerIdx].kp += pts;
    showResult(correct, exp + (correct ? ` +${pts} KP` : ''));
    awaitingAction = false;

    if (checkVictory()) return;

    endTurnOrExtra();
    updateUI();
};

window.answerWN = (sel, cor, exp, pts) => {
    if (!awaitingAction) return;
    let ok = (sel === cor);
    if (ok) players[currentPlayerIdx].kp += pts;

    showResult(ok, exp + (ok ? ` +${pts} KP` : ''));
    awaitingAction = false;

    if (checkVictory()) return;

    endTurnOrExtra();
    updateUI();
};


window.answerTT = (sel, lie, exp, pts) => {
    if (!awaitingAction) return;
    let ok = (sel === lie);
    if (ok) players[currentPlayerIdx].kp += pts;
    showResult(ok, exp + (ok ? ` +${pts} KP` : ''));
    awaitingAction = false;

    if (checkVictory()) return;

    endTurnOrExtra();
    updateUI();
};

function showResult(correct, msg) {
    let div = document.getElementById('resultMessage');
    div.innerText = msg;
    div.className = `fact-result ${correct ? 'correct' : 'incorrect'}`;
    div.style.display = 'block';
    setTimeout(() => div.style.display = 'none', 1800);
}

// ===================== TURN FLOW =======================
function endTurnOrExtra() {
    if (extraTurnFlag && !awaitingAction) {
        extraTurnFlag = false;
        addLog(`${players[currentPlayerIdx].name} gets another turn!`);
        enableRoll();
        return;
    }

    if (!awaitingAction) {
        currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
        updateUI();
        updateAllTokens();
        enableRoll();
        addLog(`👉 ${players[currentPlayerIdx].name}'s turn`);
    }
}

async function movePlayer(steps) {
    let player = players[currentPlayerIdx];
    let old = player.position;
    let newPos = (old + steps) % 40;

    player.position = newPos;

    if (newPos < old && old + steps >= 40) {
        player.kp += 200;
        addLog(`Passed GO +200 KP`);
        if (checkVictory()) return;
    }

    updateAllTokens();
    updateUI();
    addLog(`${player.name} moves to ${BOARD_SPACES.find(s => s.pos === newPos)?.name}`);

    await handleLanding(newPos);
}

async function handleLanding(pos) {
    let space = BOARD_SPACES.find(s => s.pos === pos);
    let player = players[currentPlayerIdx];

    if (!space) { endTurnOrExtra(); return; }

    if (space.type === 'corner') {
        if (space.action === 'go') player.kp += space.value;
        else if (space.action === 'free') player.kp += space.value;
        else if (space.action === 'gotojail') {
            player.position = 10;
            player.inJail = true;
            player.jailTurns = 0;
            updateAllTokens();
            addLog(`Go to Janissary Crisis!`);
        }

        if (checkVictory()) return;
        endTurnOrExtra();
    }

    else if (space.type === 'property') {
        let owner = getPropertyOwner(pos);

        if (owner === null) {
            document.getElementById('cardCategoryTitle').innerHTML = `🏷️ Buy ${space.name}`;
            document.getElementById('cardTextDisplay').innerHTML = `
                <p>Price: ${space.price} KP</p>
                <button class="answer-btn" onclick="buyPropertyAction(${pos})">Buy</button>
                <button class="answer-btn" onclick="endTurnOrExtra()">Skip</button>
            `;
            awaitingAction = true;
        }

        else if (owner === currentPlayerIdx) {
            endTurnOrExtra();
        }

        else {
            let rent = space.rent;
            player.kp -= rent;
            players[owner].kp += rent;
            addLog(`${player.name} pays ${rent} KP to ${players[owner].name}`);
            updateUI();

            if (checkVictory()) return;

            endTurnOrExtra();
        }
    }

    else if (space.type === 'tax') {
        player.kp -= space.value;
        addLog(`Paid ${space.value} KP tax`);
        updateUI();

        if (checkVictory()) return;

        endTurnOrExtra();
    }

    else if (space.type === 'chance') drawCard('chance');
    else if (space.type === 'community-chest') drawCard('chest');
    else endTurnOrExtra();

    updateUI();
    updateAllTokens();
}

// ===================== CARDS =======================
function drawCard(type) {
    let deck = type === 'chance' ? chanceDeck : chestDeck;
    if (deck.length === 0) deck = shuffle(type === 'chance' ? [...CHANCE_CARDS] : [...CHEST_CARDS]);

    let card = deck.pop();

    document.getElementById('cardCategoryTitle').innerHTML =
        type === 'chance' ? '🎲 CHANCE' : '📜 COMMUNITY';

    document.getElementById('cardTextDisplay').innerHTML = `
        <p>${card.text}</p>
        <button class="answer-btn" onclick="resolveCard('${card.action}', ${card.amount || card.steps || card.target}, ${card.gain || 0})">OK</button>
    `;

    awaitingAction = true;
    window.pendingCard = card;
}

window.resolveCard = (action, val, gain) => {
    let player = players[currentPlayerIdx];

    if (action === 'collect') player.kp += val;
    else if (action === 'pay') player.kp -= val;
    else if (action === 'moveTo') {
        player.position = val;
        if (gain) player.kp += gain;
        updateAllTokens();
    }
    else if (action === 'moveSteps') {
        player.position = (player.position + val + 40) % 40;
        updateAllTokens();
    }

    addLog(`Card effect applied`);
    updateUI();
    awaitingAction = false;

    if (checkVictory()) return;

    endTurnOrExtra();
};

// ===================== DICE =======================
async function rollAction() {
    if (awaitingAction || !gameActive) return;

    let player = players[currentPlayerIdx];

    if (player.inJail) {
        let d1 = Math.floor(Math.random() * 6) + 1;
        let d2 = Math.floor(Math.random() * 6) + 1;

        document.getElementById('diceA').innerHTML = ['⚀','⚁','⚂','⚃','⚄','⚅'][d1 - 1];
        document.getElementById('diceB').innerHTML = ['⚀','⚁','⚂','⚃','⚄','⚅'][d2 - 1];

        if (d1 === d2) {
            player.inJail = false;
            addLog(`Escapes jail!`);
            movePlayer(d1 + d2);
        } else {
            player.jailTurns = (player.jailTurns || 0) + 1;
            if (player.jailTurns >= 3) {
                player.kp -= 50;
                player.inJail = false;
                addLog(`Pay 50 to leave jail.`);
            } else {
                addLog(`Still in jail.`);
            }
            endTurnOrExtra();
        }

        updateUI();
        return;
    }

    document.getElementById('rollTurnBtn').disabled = true;

    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;
    let total = d1 + d2;
    let doubles = d1 === d2;

    document.getElementById('diceA').classList.add('rolling');
    document.getElementById('diceB').classList.add('rolling');

    setTimeout(() => {
        document.getElementById('diceA').classList.remove('rolling');
        document.getElementById('diceB').classList.remove('rolling');

        document.getElementById('diceA').innerHTML = ['⚀','⚁','⚂','⚃','⚄','⚅'][d1 - 1];
        document.getElementById('diceB').innerHTML = ['⚀','⚁','⚂','⚃','⚄','⚅'][d2 - 1];

        document.getElementById('diceFeedback').innerText = `Rolled ${d1}+${d2}=${total}`;

        if (doubles) extraTurnFlag = true;

        movePlayer(total);
        document.getElementById('rollTurnBtn').disabled = false;
    }, 400);
}

function enableRoll() {
    document.getElementById('rollTurnBtn').style.display = 'inline-block';
    document.getElementById('endTurnBtn').style.display = 'none';
    awaitingAction = false;
}

function nextTurnMan() {
    if (!awaitingAction) endTurnOrExtra();
}

// ===================== UI =======================
function updateUI() {
    const panel = document.getElementById('playersPanel');
    panel.innerHTML = '';

    players.forEach((p, idx) => {
        const activeClass = idx === currentPlayerIdx ? 'active' : '';
        panel.innerHTML += `
            <div class="player-card ${activeClass}" style="border-left-color:${p.color}">
                <div class="player-header">
                    <div class="player-color-dot" style="background:${p.color}"></div>
                    <div class="player-name">${p.name} ${idx === currentPlayerIdx ? '👑' : ''}</div>
                </div>
                <div class="player-stats">
                    <span class="stat">💰 KP: ${p.kp}</span>
                    <span class="stat">📜 Props: ${p.properties || 0}</span>
                    <span class="stat">📍 Pos: ${p.position}</span>
                </div>
            </div>
        `;
    });

    document.getElementById('activePlayerName').innerText = players[currentPlayerIdx].name;
}

function addLog(msg) {
    let logDiv = document.getElementById('logArea');
    let entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = msg;
    logDiv.prepend(entry);

    if (logDiv.children.length > 8)
        logDiv.removeChild(logDiv.lastChild);
}

// ===================== GAME START =======================
function startGameLogic() {
    document.getElementById('winnerBanner').style.display = 'none';

    victoryRule = document.getElementById('victoryRuleSelect').value;

    const count = parseInt(document.getElementById('playerCountSelect').value);
    players = [];

    const colors = ['#E53935', '#2E7D32', '#1E88E5', '#FDD835'];
    const names = ['Mustafa Reşid Pasha', 'Sultan Abdülmecid', 'Ali Pasha', 'Fuat Pasha'];

    for (let i = 0; i < count; i++) {
        let nameInput = document.getElementById(`pname_${i}`);
        let colorInput = document.getElementById(`pcol_${i}`);

        players.push({
            name: nameInput?.value || names[i],
            color: colorInput?.value || colors[i % colors.length],
            kp: 1500,
            position: 0,
            properties: 0,
            inJail: false,
            jailTurns: 0,
            eliminated: false
        });
    }

    propertiesOwned = [];
    initDecks();
    currentPlayerIdx = 0;
    gameActive = true;
    awaitingAction = false;
    extraTurnFlag = false;

    renderBoard();
    updateUI();
    enableRoll();

    addLog("Tanzimat Monopoly started! Roll dice.");

    document.getElementById('setupModal').style.display = 'none';
    document.getElementById('gameMain').style.display = 'block';
}

// ===================== PLAYER FORM BUILDER =======================
function buildPlayerForms() {
    let count = parseInt(document.getElementById('playerCountSelect').value);
    let container = document.getElementById('dynamicPlayerInputs');
    container.innerHTML = '';

    const colors = ['#E53935', '#2E7D32', '#1E88E5', '#FDD835'];
    const names = ['Mustafa Reşid Pasha', 'Sultan Abdülmecid', 'Ali Pasha', 'Fuat Pasha'];

    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="player-input-group">
                <label>Reformer ${i + 1}</label>
                <input id="pname_${i}" value="${names[i]}" placeholder="Name">
                <select id="pcol_${i}">
                    ${colors.map((c, idx) =>
                        `<option value="${c}" ${idx === i ? 'selected' : ''}>Color ${idx + 1}</option>`
                    ).join('')}
                </select>
                <div class="color-preview" style="background:${colors[i]}"></div>
            </div>
        `;
    }
}

// ===================== EVENT LISTENERS =======================
document.getElementById('playerCountSelect').addEventListener('change', buildPlayerForms);
document.getElementById('startGameFinalBtn').addEventListener('click', startGameLogic);
document.getElementById('rollTurnBtn').addEventListener('click', rollAction);
document.getElementById('endTurnBtn').addEventListener('click', nextTurnMan);

buildPlayerForms();

// Expose needed functions globally
window.endTurnOrExtra = endTurnOrExtra;
window.buyPropertyAction = buyPropertyAction;
