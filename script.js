/* ============================================
   ANIMATED TO-DO LIST — script.js
   ============================================ */

'use strict';

// ─── STATE ────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('todo_tasks') || '[]');
let filter = 'all';

const PRIORITIES = ['high', 'med', 'low'];
const PRIORITY_LABELS = { high: '🔴 High', med: '🟡 Med', low: '🟢 Low' };

const MOTIVATIONAL = [
    'Keep going! 💪', 'You got this! 🔥', 'Stay focused 🎯',
    'One step at a time 🚶', 'Ship it! 🚀', 'Make it happen ✨',
    'Crush those tasks! 💥', "You're on a roll 🎲"
];

// ─── DOM REFS ────────────────────────────────
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const clearBtn = document.getElementById('clear-btn');
const filterBtns = document.querySelectorAll('.filter-btn');

const statTotal = document.getElementById('stat-total');
const statDone = document.getElementById('stat-done');
const statLeft = document.getElementById('stat-left');
const progressFill = document.getElementById('progress-fill');
const progressPct = document.getElementById('progress-pct');
const footerMsg = document.getElementById('footer-msg');

// ─── SAVE & LOAD ─────────────────────────────
function save() {
    localStorage.setItem('todo_tasks', JSON.stringify(tasks));
}

// ─── STATS ───────────────────────────────────
function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const left = total - done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    animateNum(statTotal, total);
    animateNum(statDone, done);
    animateNum(statLeft, left);

    progressFill.style.width = pct + '%';
    progressFill.parentElement.setAttribute('aria-valuenow', pct);
    progressPct.textContent = pct + '%';

    // Footer message
    if (total === 0) {
        footerMsg.textContent = 'Add your first task above 👆';
    } else if (pct === 100) {
        footerMsg.textContent = '🎉 All done! Amazing work!';
    } else {
        footerMsg.textContent = MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
    }
}

function animateNum(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    el.textContent = target;
    el.classList.remove('pop');
    void el.offsetWidth; // reflow
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 350);
}

// ─── RENDER ──────────────────────────────────
function render() {
    const filtered = tasks.filter(t => {
        if (filter === 'active') return !t.done;
        if (filter === 'done') return t.done;
        return true;
    });

    taskList.innerHTML = '';

    if (filtered.length === 0) {
        const emptyMap = {
            all: ['📝', 'Nothing here yet', 'Type above and press ADD to get started.'],
            active: ['✅', 'All caught up!', 'No active tasks — you\'ve done it all!'],
            done: ['🎯', 'No completions yet', 'Finish a task to see it here.'],
        };
        const [emoji, title, sub] = emptyMap[filter];
        taskList.innerHTML = `
      <li class="empty-state">
        <span class="empty-emoji">${emoji}</span>
        <div class="empty-title">${title}</div>
        <p class="empty-sub">${sub}</p>
      </li>`;
        return;
    }

    filtered.forEach((task, i) => {
        const li = buildTaskEl(task, i);
        taskList.appendChild(li);
    });
}

// ─── BUILD TASK ELEMENT ───────────────────────
function buildTaskEl(task, index) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.dataset.id = task.id;
    li.style.animationDelay = (index * 0.05) + 's';

    const priorityTag = task.priority
        ? `<span class="task-priority priority-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>`
        : '';

    const timeStr = formatTime(task.createdAt);

    li.innerHTML = `
    <input type="checkbox" class="task-check" ${task.done ? 'checked' : ''} aria-label="Mark as done"/>
    <div class="task-body">
      <div class="task-text">${escapeHtml(task.text)}${priorityTag}</div>
      <div class="task-meta">${timeStr}</div>
    </div>
    <button class="btn-del" aria-label="Delete task">✕</button>
  `;

    // Toggle done
    li.querySelector('.task-check').addEventListener('change', (e) => {
        const t = tasks.find(x => x.id === task.id);
        if (!t) return;
        t.done = e.target.checked;
        t.doneAt = t.done ? Date.now() : null;
        save(); updateStats();
        li.classList.toggle('done', t.done);
        li.querySelector('.task-text').style.textDecoration = t.done ? 'line-through' : '';
        li.querySelector('.task-text').style.color = t.done ? '' : '';
        if (t.done) spawnConfetti(li);
    });

    // Delete
    li.querySelector('.btn-del').addEventListener('click', () => deleteTask(task.id, li));

    return li;
}

// ─── ADD TASK ────────────────────────────────
function addTask() {
    const text = taskInput.value.trim();
    if (!text) { shakeInput(); return; }

    // Auto-detect priority keywords
    let priority = null;
    if (/urgent|asap|critical|important/i.test(text)) priority = 'high';
    else if (/soon|medium|moderate/i.test(text)) priority = 'med';
    else if (/later|low|maybe/i.test(text)) priority = 'low';

    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text,
        done: false,
        priority,
        createdAt: Date.now(),
        doneAt: null,
    };

    tasks.unshift(newTask);
    taskInput.value = '';
    save();
    updateStats();
    render();
    taskInput.focus();
}

// ─── DELETE TASK ─────────────────────────────
function deleteTask(id, li) {
    li.classList.add('removing');
    li.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        save(); updateStats(); render();
    }, { once: true });
}

// ─── CLEAR COMPLETED ─────────────────────────
function clearDone() {
    const doneItems = taskList.querySelectorAll('.task-item.done');
    if (doneItems.length === 0) return;

    let pending = doneItems.length;
    doneItems.forEach((li, i) => {
        setTimeout(() => {
            li.classList.add('removing');
            li.addEventListener('animationend', () => {
                if (--pending === 0) {
                    tasks = tasks.filter(t => !t.done);
                    save(); updateStats(); render();
                }
            }, { once: true });
        }, i * 60);
    });
}

// ─── SHAKE INPUT ─────────────────────────────
function shakeInput() {
    const wrapper = taskInput.parentElement;
    wrapper.style.animation = 'none';
    wrapper.style.borderColor = 'var(--pink)';
    wrapper.style.boxShadow = '0 0 0 3px rgba(255,45,120,0.2)';

    // Micro-shake
    let count = 0;
    const interval = setInterval(() => {
        wrapper.style.transform = count % 2 === 0 ? 'translateX(-5px)' : 'translateX(5px)';
        if (++count >= 6) {
            clearInterval(interval);
            wrapper.style.transform = '';
            setTimeout(() => {
                wrapper.style.borderColor = '';
                wrapper.style.boxShadow = '';
            }, 400);
        }
    }, 60);

    taskInput.focus();
}

// ─── CONFETTI ────────────────────────────────
function spawnConfetti(anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const colors = ['#00f5d4', '#ff2d78', '#ffd700', '#7b61ff', '#4ade80'];

    for (let i = 0; i < 12; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.cssText = `
      left: ${rect.left + Math.random() * rect.width}px;
      top: ${rect.top + window.scrollY}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      transform: rotate(${Math.random() * 360}deg);
      animation-delay: ${Math.random() * 0.2}s;
      animation-duration: ${0.8 + Math.random() * 0.4}s;
    `;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove(), { once: true });
    }
}

// ─── PARTICLES CANVAS ────────────────────────
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let W, H, particles;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = Array.from({ length: 40 }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.5 + 0.3,
            dx: (Math.random() - 0.5) * 0.3,
            dy: (Math.random() - 0.5) * 0.3,
            alpha: Math.random() * 0.5 + 0.1,
            color: ['#00f5d4', '#7b61ff', '#ff2d78'][Math.floor(Math.random() * 3)],
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (p.x < 0 || p.x > W) p.dx *= -1;
            if (p.y < 0 || p.y > H) p.dy *= -1;
        });
        ctx.globalAlpha = 1;
        requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(); });
}

// ─── HELPERS ─────────────────────────────────
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── EVENTS ──────────────────────────────────
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
});

clearBtn.addEventListener('click', clearDone);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        filter = btn.dataset.filter;
        render();
    });
});

// Keyboard shortcut: Ctrl+Enter to add
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        taskInput.focus();
    }
});

// ─── INIT ─────────────────────────────────────
initParticles();
updateStats();
render();

console.log('%c📝 Animated To-Do List', 'font-size:16px;font-weight:bold;color:#00f5d4;');
console.log('%cTasks loaded:', 'color:#888', tasks.length);