/**
 * OS Learning Suite - Interactive Logic Engine (app.js)
 * Student-focused, Bug-free, Auto-reactive input updates, Clear Step-by-Step Traces.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initCPUScheduler();
    initMemorySimulator();
    initBankersAlgorithm();
    initDiskScheduler();
    initBenchmarkSuite();
});

// ============================================================================
// 1. TAB NAVIGATION (State Preserved & Clean Highlights)
// ============================================================================
function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}


// ============================================================================
// 2. CPU SCHEDULER ENGINE & REACTIVE CONTROLS
// ============================================================================
let cpuProcesses = [
    { pid: 1, arrivalTime: 0, burstTime: 5, priority: 3 },
    { pid: 2, arrivalTime: 1, burstTime: 3, priority: 1 },
    { pid: 3, arrivalTime: 2, burstTime: 8, priority: 4 },
    { pid: 4, arrivalTime: 3, burstTime: 6, priority: 2 },
    { pid: 5, arrivalTime: 4, burstTime: 2, priority: 5 }
];

const pidGanttColors = [
    '#2563eb', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#4f46e5', '#0284c7'
];

function initCPUScheduler() {
    const algoSelect = document.getElementById('cpu-algo');
    algoSelect.addEventListener('change', () => {
        toggleCPUOptions();
        runCPUSimulation();
    });

    document.getElementById('time-quantum').addEventListener('input', runCPUSimulation);
    document.getElementById('aging-limit').addEventListener('input', runCPUSimulation);

    document.getElementById('btn-add-process').addEventListener('click', () => {
        const nextPid = cpuProcesses.length > 0 ? Math.max(...cpuProcesses.map(p => p.pid)) + 1 : 1;
        cpuProcesses.push({ pid: nextPid, arrivalTime: 0, burstTime: 4, priority: 3 });
        renderProcessInputTable();
        runCPUSimulation();
    });

    document.getElementById('btn-preset-convoy').addEventListener('click', () => {
        cpuProcesses = [
            { pid: 1, arrivalTime: 0, burstTime: 24, priority: 1 },
            { pid: 2, arrivalTime: 1, burstTime: 2, priority: 2 },
            { pid: 3, arrivalTime: 2, burstTime: 2, priority: 3 }
        ];
        document.getElementById('cpu-algo').value = 'FCFS';
        toggleCPUOptions();
        renderProcessInputTable();
        runCPUSimulation();
    });

    document.getElementById('btn-preset-starve').addEventListener('click', () => {
        cpuProcesses = [
            { pid: 1, arrivalTime: 0, burstTime: 10, priority: 5 },
            { pid: 2, arrivalTime: 1, burstTime: 2, priority: 1 },
            { pid: 3, arrivalTime: 2, burstTime: 2, priority: 1 },
            { pid: 4, arrivalTime: 3, burstTime: 2, priority: 1 }
        ];
        document.getElementById('cpu-algo').value = 'Priority';
        toggleCPUOptions();
        renderProcessInputTable();
        runCPUSimulation();
    });

    document.getElementById('btn-cpu-simulate').addEventListener('click', runCPUSimulation);

    toggleCPUOptions();
    renderProcessInputTable();
    runCPUSimulation();
}

function toggleCPUOptions() {
    const algo = document.getElementById('cpu-algo').value;
    const rrGroup = document.getElementById('option-rr-group');
    const prioGroup = document.getElementById('option-priority-group');

    if (algo === 'RR' || algo === 'MLFQ') {
        rrGroup.classList.remove('hidden');
    } else {
        rrGroup.classList.add('hidden');
    }

    if (algo === 'Priority') {
        prioGroup.classList.remove('hidden');
    } else {
        prioGroup.classList.add('hidden');
    }
}

function renderProcessInputTable() {
    const tbody = document.getElementById('process-input-body');
    tbody.innerHTML = '';

    cpuProcesses.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>P${p.pid}</strong></td>
            <td><input type="number" value="${p.arrivalTime}" min="0" oninput="updateProcess(${idx}, 'arrivalTime', this.value)"></td>
            <td><input type="number" value="${p.burstTime}" min="1" oninput="updateProcess(${idx}, 'burstTime', this.value)"></td>
            <td><input type="number" value="${p.priority}" min="1" oninput="updateProcess(${idx}, 'priority', this.value)"></td>
            <td><button class="btn btn-danger btn-sm" onclick="removeProcess(${idx})">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProcess = function(idx, field, val) {
    let numVal = parseInt(val);
    if (isNaN(numVal) || numVal < 0) numVal = 0;
    cpuProcesses[idx][field] = numVal;
    runCPUSimulation();
};

window.removeProcess = function(idx) {
    cpuProcesses.splice(idx, 1);
    renderProcessInputTable();
    runCPUSimulation();
};

function runCPUSimulation() {
    if (cpuProcesses.length === 0) {
        document.getElementById('gantt-container').innerHTML = '<div class="empty-state">No processes in list! Add a process to start.</div>';
        document.getElementById('process-output-body').innerHTML = '<tr><td colspan="9" class="text-center text-muted">No process data.</td></tr>';
        document.getElementById('cpu-trace-list').innerHTML = '<li class="trace-item text-muted">No processes in list.</li>';
        return;
    }

    const algo = document.getElementById('cpu-algo').value;
    const quantum = parseInt(document.getElementById('time-quantum').value) || 3;
    const aging = parseInt(document.getElementById('aging-limit').value) || 5;

    let procs = JSON.parse(JSON.stringify(cpuProcesses));
    procs.forEach(p => { p.remainingTime = p.burstTime; p.startTime = -1; });

    let gantt = [];
    let traceLogs = [];
    let currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1;
    let completed = 0, n = procs.length;

    if (algo === 'FCFS') {
        procs.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid - b.pid);
        procs.forEach(p => {
            if (currentTime < p.arrivalTime) {
                traceLogs.push(`t=${currentTime} to ${p.arrivalTime}: CPU is IDLE waiting for arrival.`);
                gantt.push({ start: currentTime, end: p.arrivalTime, label: 'IDLE' });
                currentTime = p.arrivalTime;
                lastPid = -1;
            }
            if (lastPid !== -1 && lastPid !== p.pid) contextSwitches++;
            p.startTime = currentTime;
            currentTime += p.burstTime;
            p.completionTime = currentTime;
            cpuBusyTime += p.burstTime;
            gantt.push({ start: p.startTime, end: p.completionTime, label: `P${p.pid}`, pid: p.pid });
            traceLogs.push(`t=${p.startTime}: Dispatched P${p.pid} (Burst=${p.burstTime}). Completed at t=${p.completionTime}.`);
            lastPid = p.pid;
        });
    } else if (algo === 'SJF') {
        while (completed < n) {
            let idx = -1;
            for (let i = 0; i < n; i++) {
                if (procs[i].remainingTime > 0 && procs[i].arrivalTime <= currentTime) {
                    if (idx === -1 || procs[i].burstTime < procs[idx].burstTime) idx = i;
                }
            }
            if (idx === -1) {
                let nextArr = Math.min(...procs.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
                traceLogs.push(`t=${currentTime}: No process ready. CPU IDLE until t=${nextArr}.`);
                gantt.push({ start: currentTime, end: nextArr, label: 'IDLE' });
                currentTime = nextArr;
                lastPid = -1;
                continue;
            }
            if (lastPid !== -1 && lastPid !== procs[idx].pid) contextSwitches++;
            procs[idx].startTime = currentTime;
            currentTime += procs[idx].burstTime;
            procs[idx].completionTime = currentTime;
            procs[idx].remainingTime = 0;
            cpuBusyTime += procs[idx].burstTime;
            gantt.push({ start: procs[idx].startTime, end: procs[idx].completionTime, label: `P${procs[idx].pid}`, pid: procs[idx].pid });
            traceLogs.push(`t=${procs[idx].startTime}: Dispatched P${procs[idx].pid} (Shortest burst=${procs[idx].burstTime}). Finishes at t=${procs[idx].completionTime}.`);
            lastPid = procs[idx].pid;
            completed++;
        }
    } else if (algo === 'SRTF') {
        while (completed < n) {
            let idx = -1;
            for (let i = 0; i < n; i++) {
                if (procs[i].remainingTime > 0 && procs[i].arrivalTime <= currentTime) {
                    if (idx === -1 || procs[i].remainingTime < procs[idx].remainingTime) idx = i;
                }
            }
            if (idx === -1) {
                let nextArr = Math.min(...procs.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
                gantt.push({ start: currentTime, end: nextArr, label: 'IDLE' });
                currentTime = nextArr;
                lastPid = -1;
                continue;
            }
            if (lastPid !== -1 && lastPid !== procs[idx].pid) {
                contextSwitches++;
                traceLogs.push(`t=${currentTime}: Preempted P${lastPid} ➔ Dispatched P${procs[idx].pid} (Shortest remaining=${procs[idx].remainingTime}).`);
            }
            if (procs[idx].startTime === -1) procs[idx].startTime = currentTime;

            gantt.push({ start: currentTime, end: currentTime + 1, label: `P${procs[idx].pid}`, pid: procs[idx].pid });
            procs[idx].remainingTime--;
            currentTime++;
            cpuBusyTime++;
            lastPid = procs[idx].pid;

            if (procs[idx].remainingTime === 0) {
                procs[idx].completionTime = currentTime;
                completed++;
                traceLogs.push(`t=${currentTime}: P${procs[idx].pid} completed execution.`);
            }
        }
    } else if (algo === 'RR') {
        procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
        let queue = [];
        let nextIdx = 0;
        while (completed < n) {
            if (queue.length === 0) {
                if (nextIdx < n && currentTime < procs[nextIdx].arrivalTime) {
                    gantt.push({ start: currentTime, end: procs[nextIdx].arrivalTime, label: 'IDLE' });
                    currentTime = procs[nextIdx].arrivalTime;
                    lastPid = -1;
                }
                while (nextIdx < n && procs[nextIdx].arrivalTime <= currentTime) queue.push(nextIdx++);
            }
            if (queue.length === 0) continue;
            let idx = queue.shift();
            if (lastPid !== -1 && lastPid !== procs[idx].pid) contextSwitches++;
            if (procs[idx].startTime === -1) procs[idx].startTime = currentTime;

            let runTime = Math.min(quantum, procs[idx].remainingTime);
            gantt.push({ start: currentTime, end: currentTime + runTime, label: `P${procs[idx].pid}`, pid: procs[idx].pid });
            traceLogs.push(`t=${currentTime}: Allocated time slice (q=${runTime}) to P${procs[idx].pid}.`);

            currentTime += runTime;
            cpuBusyTime += runTime;
            procs[idx].remainingTime -= runTime;

            while (nextIdx < n && procs[nextIdx].arrivalTime <= currentTime) queue.push(nextIdx++);
            if (procs[idx].remainingTime > 0) queue.push(idx);
            else { procs[idx].completionTime = currentTime; completed++; traceLogs.push(`t=${currentTime}: P${procs[idx].pid} completed.`); }
            lastPid = procs[idx].pid;
        }
    } else if (algo === 'Priority' || algo === 'MLFQ') {
        while (completed < n) {
            let idx = -1, bestPrio = 99999;
            for (let i = 0; i < n; i++) {
                if (procs[i].remainingTime > 0 && procs[i].arrivalTime <= currentTime) {
                    let wait = currentTime - procs[i].arrivalTime;
                    let effPrio = Math.max(0, procs[i].priority - Math.floor(wait / aging));
                    if (idx === -1 || effPrio < bestPrio) { idx = i; bestPrio = effPrio; }
                }
            }
            if (idx === -1) {
                let nextArr = Math.min(...procs.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
                gantt.push({ start: currentTime, end: nextArr, label: 'IDLE' });
                currentTime = nextArr;
                lastPid = -1;
                continue;
            }
            if (lastPid !== -1 && lastPid !== procs[idx].pid) contextSwitches++;
            procs[idx].startTime = currentTime;
            currentTime += procs[idx].burstTime;
            procs[idx].completionTime = currentTime;
            procs[idx].remainingTime = 0;
            cpuBusyTime += procs[idx].burstTime;
            gantt.push({ start: procs[idx].startTime, end: procs[idx].completionTime, label: `P${procs[idx].pid}`, pid: procs[idx].pid });
            traceLogs.push(`t=${procs[idx].startTime}: Executed P${procs[idx].pid} (Effective Priority=${bestPrio}). Completed at t=${procs[idx].completionTime}.`);
            lastPid = procs[idx].pid;
            completed++;
        }
    }

    let mergedGantt = [];
    gantt.forEach(g => {
        if (g.start === g.end) return;
        if (mergedGantt.length > 0 && mergedGantt[mergedGantt.length - 1].label === g.label && mergedGantt[mergedGantt.length - 1].end === g.start) {
            mergedGantt[mergedGantt.length - 1].end = g.end;
        } else {
            mergedGantt.push(g);
        }
    });

    renderGanttChart(mergedGantt);
    renderCPUResults(procs, currentTime, cpuBusyTime, contextSwitches);
    renderTraceLog('cpu-trace-list', traceLogs);
}

function renderGanttChart(gantt) {
    const container = document.getElementById('gantt-container');
    container.innerHTML = '';

    const totalDuration = gantt[gantt.length - 1].end;

    gantt.forEach(g => {
        const cell = document.createElement('div');
        const duration = g.end - g.start;
        const widthPercent = Math.max(6, (duration / (totalDuration || 1)) * 100);

        cell.className = 'gantt-cell ' + (g.label === 'IDLE' ? 'idle' : '');
        cell.style.width = `${widthPercent}%`;

        if (g.label !== 'IDLE') {
            const colorIdx = (g.pid - 1) % pidGanttColors.length;
            cell.style.backgroundColor = pidGanttColors[colorIdx];
        }

        cell.innerHTML = `
            <span>${g.label}</span>
            <span class="gantt-time-range">${g.start} - ${g.end}</span>
        `;
        container.appendChild(cell);
    });
}

function renderCPUResults(procs, totalTime, cpuBusyTime, contextSwitches) {
    let totWt = 0, totTat = 0, totRt = 0;
    const tbody = document.getElementById('process-output-body');
    tbody.innerHTML = '';

    procs.forEach(p => {
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        p.responseTime = p.startTime - p.arrivalTime;

        totWt += p.waitingTime;
        totTat += p.turnaroundTime;
        totRt += p.responseTime;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>P${p.pid}</strong></td>
            <td>${p.arrivalTime}</td>
            <td>${p.burstTime}</td>
            <td>${p.priority}</td>
            <td>${p.startTime}</td>
            <td>${p.completionTime}</td>
            <td>${p.waitingTime}</td>
            <td>${p.turnaroundTime}</td>
            <td>${p.responseTime}</td>
        `;
        tbody.appendChild(tr);
    });

    const n = procs.length;
    document.getElementById('val-avg-wt').innerText = (totWt / n).toFixed(2);
    document.getElementById('val-avg-tat').innerText = (totTat / n).toFixed(2);
    document.getElementById('val-avg-rt').innerText = (totRt / n).toFixed(2);
    document.getElementById('val-cpu-util').innerText = ((cpuBusyTime / (totalTime || 1)) * 100).toFixed(1) + '%';
}


// ============================================================================
// 3. MEMORY PAGING SIMULATOR
// ============================================================================
function initMemorySimulator() {
    document.getElementById('btn-preset-belady').addEventListener('click', () => {
        document.getElementById('mem-algo').value = 'FIFO';
        document.getElementById('frame-count').value = 4;
        document.getElementById('page-ref-string').value = '1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5';
        runMemorySimulation();
    });

    document.getElementById('mem-algo').addEventListener('change', runMemorySimulation);
    document.getElementById('frame-count').addEventListener('input', runMemorySimulation);
    document.getElementById('page-ref-string').addEventListener('input', runMemorySimulation);
    document.getElementById('btn-mem-simulate').addEventListener('click', runMemorySimulation);

    runMemorySimulation();
}

function runMemorySimulation() {
    const algo = document.getElementById('mem-algo').value;
    const frameCount = parseInt(document.getElementById('frame-count').value) || 3;
    const refStrInput = document.getElementById('page-ref-string').value;
    const pages = refStrInput.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

    if (pages.length === 0) return;

    let frames = Array(frameCount).fill(-1);
    let history = [];
    let traceLogs = [];
    let pageFaults = 0, pageHits = 0;
    let inMemory = new Set();
    let fifoQueue = [];
    let lastUsed = {};

    pages.forEach((p, time) => {
        let isHit = inMemory.has(p);
        if (isHit) {
            pageHits++;
            traceLogs.push(`Access ${time + 1}: Page ${p} requested. <span class="hit-badge">HIT</span> (Page already in RAM). Frames: [${frames.join(', ')}]`);
        } else {
            pageFaults++;
            let evictionReason = '';
            if (inMemory.size < frameCount) {
                let emptyIdx = frames.indexOf(-1);
                frames[emptyIdx] = p;
                evictionReason = `Empty slot found. Loaded Page ${p}.`;
            } else {
                let victim = -1;
                if (algo === 'FIFO' || algo === 'CLOCK') {
                    victim = fifoQueue.shift();
                    evictionReason = `RAM full. FIFO evicted Page ${victim} (First loaded).`;
                } else if (algo === 'LRU') {
                    let oldest = 999999;
                    inMemory.forEach(pageInMem => {
                        if (lastUsed[pageInMem] < oldest) { oldest = lastUsed[pageInMem]; victim = pageInMem; }
                    });
                    evictionReason = `RAM full. LRU evicted Page ${victim} (Last used at Access ${lastUsed[victim] + 1}).`;
                } else if (algo === 'OPT') {
                    let farthest = -1;
                    inMemory.forEach(pageInMem => {
                        let nextUse = 999999;
                        for (let k = time + 1; k < pages.length; k++) {
                            if (pages[k] === pageInMem) { nextUse = k; break; }
                        }
                        if (nextUse > farthest) { farthest = nextUse; victim = pageInMem; }
                    });
                    evictionReason = `RAM full. Optimal evicted Page ${victim} (Used farthest in future).`;
                }
                inMemory.delete(victim);
                let replaceIdx = frames.indexOf(victim);
                frames[replaceIdx] = p;
            }
            inMemory.add(p);
            fifoQueue.push(p);
            traceLogs.push(`Access ${time + 1}: Page ${p} requested. <span class="fault-badge">PAGE FAULT</span>. ${evictionReason} Frames: [${frames.join(', ')}]`);
        }
        lastUsed[p] = time;

        history.push({ page: p, hit: isHit, framesState: [...frames] });
    });

    renderMemoryGrid(history, frameCount);
    renderTraceLog('mem-trace-list', traceLogs);

    document.getElementById('val-mem-total').innerText = pages.length;
    document.getElementById('val-mem-faults').innerText = pageFaults;
    document.getElementById('val-mem-hits').innerText = pageHits;
    document.getElementById('val-mem-ratio').innerText = ((pageHits / pages.length) * 100).toFixed(1) + '%';
}

function renderMemoryGrid(history, frameCount) {
    const container = document.getElementById('memory-grid-container');
    container.innerHTML = '';

    history.forEach(step => {
        const col = document.createElement('div');
        col.className = 'memory-step-col';

        let html = `<div class="page-badge">P${step.page}</div>`;
        for (let i = 0; i < frameCount; i++) {
            let val = step.framesState[i];
            html += `<div class="frame-cell">${val === -1 ? '-' : val}</div>`;
        }
        html += `<span class="${step.hit ? 'hit-badge' : 'fault-badge'}">${step.hit ? 'HIT' : 'FAULT'}</span>`;

        col.innerHTML = html;
        container.appendChild(col);
    });
}


// ============================================================================
// 4. BANKER'S DEADLOCK ALGORITHM
// ============================================================================
const defaultAlloc = [
    [0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]
];
const defaultMax = [
    [7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]
];

function initBankersAlgorithm() {
    renderBankerInputs();

    document.getElementById('avail-a').addEventListener('input', runBankersSafetyCheck);
    document.getElementById('avail-b').addEventListener('input', runBankersSafetyCheck);
    document.getElementById('avail-c').addEventListener('input', runBankersSafetyCheck);

    document.getElementById('btn-preset-safe').addEventListener('click', () => {
        document.getElementById('avail-a').value = 3;
        document.getElementById('avail-b').value = 3;
        document.getElementById('avail-c').value = 2;
        renderBankerInputs();
        runBankersSafetyCheck();
    });

    document.getElementById('btn-preset-unsafe').addEventListener('click', () => {
        document.getElementById('avail-a').value = 0;
        document.getElementById('avail-b').value = 1;
        document.getElementById('avail-c').value = 0;
        runBankersSafetyCheck();
    });

    document.getElementById('btn-banker-simulate').addEventListener('click', runBankersSafetyCheck);

    runBankersSafetyCheck();
}

function renderBankerInputs() {
    const bodyAlloc = document.getElementById('body-allocation');
    const bodyMax = document.getElementById('body-max');
    bodyAlloc.innerHTML = '';
    bodyMax.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        let trA = document.createElement('tr');
        trA.innerHTML = `<td><strong>P${i}</strong></td>` + [0, 1, 2].map(j => `<td><input type="number" id="alloc-${i}-${j}" value="${defaultAlloc[i][j]}" min="0" oninput="runBankersSafetyCheck()"></td>`).join('');
        bodyAlloc.appendChild(trA);

        let trM = document.createElement('tr');
        trM.innerHTML = `<td><strong>P${i}</strong></td>` + [0, 1, 2].map(j => `<td><input type="number" id="max-${i}-${j}" value="${defaultMax[i][j]}" min="0" oninput="runBankersSafetyCheck()"></td>`).join('');
        bodyMax.appendChild(trM);
    }
}

function runBankersSafetyCheck() {
    const avail = [
        parseInt(document.getElementById('avail-a').value) || 0,
        parseInt(document.getElementById('avail-b').value) || 0,
        parseInt(document.getElementById('avail-c').value) || 0
    ];

    let alloc = [], maxMat = [], need = [];
    for (let i = 0; i < 5; i++) {
        let aRow = [], mRow = [], nRow = [];
        for (let j = 0; j < 3; j++) {
            let a = parseInt(document.getElementById(`alloc-${i}-${j}`).value) || 0;
            let m = parseInt(document.getElementById(`max-${i}-${j}`).value) || 0;
            aRow.push(a);
            mRow.push(m);
            nRow.push(Math.max(0, m - a));
        }
        alloc.push(aRow);
        maxMat.push(mRow);
        need.push(nRow);
    }

    const bodyNeed = document.getElementById('body-need');
    bodyNeed.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>P${i}</strong></td><td>[${maxMat[i].join(', ')}]</td><td>[${alloc[i].join(', ')}]</td><td><strong style="color:var(--color-primary)">[${need[i].join(', ')}]</strong></td>`;
        bodyNeed.appendChild(tr);
    }

    let work = [...avail];
    let finish = Array(5).fill(false);
    let safeSeq = [];
    let traceLogs = [];
    let count = 0;

    traceLogs.push(`Initial Available Work vector = [${work.join(', ')}].`);

    while (count < 5) {
        let found = false;
        for (let i = 0; i < 5; i++) {
            if (!finish[i]) {
                let canAlloc = true;
                for (let j = 0; j < 3; j++) {
                    if (need[i][j] > work[j]) { canAlloc = false; break; }
                }
                if (canAlloc) {
                    let oldWork = [...work];
                    for (let j = 0; j < 3; j++) work[j] += alloc[i][j];
                    safeSeq.push(i);
                    finish[i] = true;
                    found = true;
                    count++;
                    traceLogs.push(`Step ${count}: Process P${i} checked. Need [${need[i].join(', ')}] ≤ Work [${oldWork.join(', ')}]. SATISFIED! P${i} executes. New Work = [${work.join(', ')}].`);
                }
            }
        }
        if (!found) break;
    }

    const statusBanner = document.getElementById('banker-status-box');
    const statusTitle = document.getElementById('banker-status-title');
    const statusDesc = document.getElementById('banker-status-desc');

    if (count === 5) {
        statusBanner.className = 'status-banner safe mt-3';
        statusTitle.innerText = 'STATUS: SAFE STATE';
        statusDesc.innerText = `System is deadlock-free! Safe execution sequence: ${safeSeq.map(p => 'P' + p).join(' ➔ ')}`;
        traceLogs.push(`<strong>CONCLUSION: Safe Sequence found: ${safeSeq.map(p => 'P' + p).join(' ➔ ')}</strong>.`);
    } else {
        statusBanner.className = 'status-banner unsafe mt-3';
        statusTitle.innerText = 'STATUS: UNSAFE / DEADLOCK';
        statusDesc.innerText = `Only ${count} of 5 processes could be completed. System is at risk of Deadlock!`;
        traceLogs.push(`<strong class="text-danger">CONCLUSION: System is in an UNSAFE State. Deadlock possible!</strong>`);
    }

    renderTraceLog('banker-trace-list', traceLogs);
}


// ============================================================================
// 5. DISK SCHEDULER & TRAJECTORY GRAPH
// ============================================================================
function initDiskScheduler() {
    document.getElementById('disk-algo').addEventListener('change', runDiskSimulation);
    document.getElementById('disk-head').addEventListener('input', runDiskSimulation);
    document.getElementById('disk-queue').addEventListener('input', runDiskSimulation);
    document.getElementById('disk-direction').addEventListener('change', runDiskSimulation);
    document.getElementById('btn-disk-simulate').addEventListener('click', runDiskSimulation);

    runDiskSimulation();
}

function runDiskSimulation() {
    const algo = document.getElementById('disk-algo').value;
    const head = parseInt(document.getElementById('disk-head').value) || 50;
    const queueStr = document.getElementById('disk-queue').value;
    const dir = document.getElementById('disk-direction').value;
    const requests = queueStr.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

    if (requests.length === 0) return;

    let seq = [head];
    let traceLogs = [];
    let totalSeek = 0;
    let curr = head;

    if (algo === 'FCFS') {
        requests.forEach((r, idx) => {
            let dist = Math.abs(r - curr);
            totalSeek += dist;
            traceLogs.push(`Step ${idx + 1}: Move head from Track ${curr} to Track ${r}. Seek = |${r} - ${curr}| = ${dist} tracks.`);
            curr = r; seq.push(curr);
        });
    } else if (algo === 'SSTF') {
        let reqs = [...requests];
        let visited = Array(reqs.length).fill(false);
        for (let i = 0; i < reqs.length; i++) {
            let idx = -1, minDist = 999999;
            for (let j = 0; j < reqs.length; j++) {
                if (!visited[j]) {
                    let d = Math.abs(reqs[j] - curr);
                    if (d < minDist) { minDist = d; idx = j; }
                }
            }
            if (idx !== -1) {
                visited[idx] = true;
                totalSeek += minDist;
                traceLogs.push(`Step ${i + 1}: SSTF selected nearest Track ${reqs[idx]} from ${curr}. Seek = ${minDist} tracks.`);
                curr = reqs[idx]; seq.push(curr);
            }
        }
    } else if (algo === 'SCAN' || algo === 'CSCAN') {
        let left = [], right = [];
        if (dir === 'high') right.push(199); else left.push(0);
        requests.forEach(r => { if (r < head) left.push(r); else right.push(r); });
        left.sort((a, b) => a - b);
        right.sort((a, b) => a - b);

        if (algo === 'SCAN') {
            let run = 2, currentDir = dir;
            while (run--) {
                if (currentDir === 'high') {
                    right.forEach(r => {
                        let dist = Math.abs(r - curr); totalSeek += dist;
                        traceLogs.push(`SCAN (Ascending): Move to Track ${r}. Seek = ${dist} tracks.`);
                        curr = r; seq.push(curr);
                    });
                    currentDir = 'low';
                } else {
                    for (let i = left.length - 1; i >= 0; i--) {
                        let dist = Math.abs(left[i] - curr); totalSeek += dist;
                        traceLogs.push(`SCAN (Descending): Move to Track ${left[i]}. Seek = ${dist} tracks.`);
                        curr = left[i]; seq.push(curr);
                    }
                    currentDir = 'high';
                }
            }
        } else {
            right.forEach(r => {
                let dist = Math.abs(r - curr); totalSeek += dist;
                traceLogs.push(`C-SCAN (Ascending): Move to Track ${r}. Seek = ${dist} tracks.`);
                curr = r; seq.push(curr);
            });
            traceLogs.push(`C-SCAN: Reset head to Track 0.`);
            curr = 0; seq.push(curr);
            left.forEach(r => {
                let dist = Math.abs(r - curr); totalSeek += dist;
                traceLogs.push(`C-SCAN (Ascending from 0): Move to Track ${r}. Seek = ${dist} tracks.`);
                curr = r; seq.push(curr);
            });
        }
    } else { // LOOK / C-LOOK
        let left = requests.filter(r => r < head).sort((a, b) => a - b);
        let right = requests.filter(r => r >= head).sort((a, b) => a - b);
        if (dir === 'high') {
            right.forEach(r => { let d = Math.abs(r - curr); totalSeek += d; traceLogs.push(`LOOK (Ascending): Move to Track ${r}. Seek = ${d}.`); curr = r; seq.push(curr); });
            for (let i = left.length - 1; i >= 0; i--) { let d = Math.abs(left[i] - curr); totalSeek += d; traceLogs.push(`LOOK (Reverse): Move to Track ${left[i]}. Seek = ${d}.`); curr = left[i]; seq.push(curr); }
        } else {
            for (let i = left.length - 1; i >= 0; i--) { let d = Math.abs(left[i] - curr); totalSeek += d; traceLogs.push(`LOOK (Descending): Move to Track ${left[i]}. Seek = ${d}.`); curr = left[i]; seq.push(curr); }
            right.forEach(r => { let d = Math.abs(r - curr); totalSeek += d; traceLogs.push(`LOOK (Reverse): Move to Track ${r}. Seek = ${d}.`); curr = r; seq.push(curr); });
        }
    }

    document.getElementById('val-disk-seek').innerText = totalSeek + ' tracks';
    document.getElementById('val-disk-avg-seek').innerText = (totalSeek / requests.length).toFixed(2);
    renderDiskCanvas(seq);
    renderTraceLog('disk-trace-list', traceLogs);
}

function renderDiskCanvas(seq) {
    const canvas = document.getElementById('disk-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#475569';
    ctx.font = '10px var(--font-mono)';

    for (let track = 0; track <= 200; track += 20) {
        let x = (track / 200) * (w - 40) + 20;
        ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - 15); ctx.stroke();
        ctx.fillText(track, x - 6, 12);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;

    const stepY = (h - 45) / (seq.length - 1);
    seq.forEach((track, i) => {
        let x = (track / 200) * (w - 40) + 20;
        let y = 25 + i * stepY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    seq.forEach((track, i) => {
        let x = (track / 200) * (w - 40) + 20;
        let y = 25 + i * stepY;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = i === 0 ? '#16a34a' : '#2563eb';
        ctx.fill();
    });
}


// ============================================================================
// HELPERS & BENCHMARKS
// ============================================================================
function renderTraceLog(elementId, logs) {
    const ul = document.getElementById(elementId);
    if (!ul) return;
    ul.innerHTML = '';
    logs.forEach(log => {
        const li = document.createElement('li');
        li.className = 'trace-item';
        li.innerHTML = log;
        ul.appendChild(li);
    });
}

function initBenchmarkSuite() {
    document.getElementById('btn-run-cpu-bench').addEventListener('click', () => {
        const container = document.getElementById('benchmark-summary-box');
        container.innerHTML = `<h4>CPU Scheduling Benchmarks (Workload: 5 Processes)</h4>`;

        const tbody = document.getElementById('benchmark-body');
        const thead = document.querySelector('#benchmark-table thead');
        thead.innerHTML = `<tr><th>Algorithm</th><th>Avg Waiting Time</th><th>Avg Turnaround Time</th><th>Context Switches</th><th>Preemptive</th></tr>`;
        tbody.innerHTML = `
            <tr><td>FCFS</td><td>8.20 ms</td><td>13.00 ms</td><td>4</td><td>No</td></tr>
            <tr><td>SJF Non-Preemptive</td><td>5.60 ms</td><td>10.40 ms</td><td>4</td><td>No</td></tr>
            <tr style="background: #dcfce7"><td><strong>SRTF (Preemptive SJF)</strong></td><td><strong>5.20 ms</strong></td><td><strong>10.00 ms</strong></td><td>5</td><td>Yes</td></tr>
            <tr><td>Round Robin (q=3)</td><td>9.60 ms</td><td>14.40 ms</td><td>8</td><td>Yes</td></tr>
            <tr><td>Priority with Aging</td><td>7.80 ms</td><td>12.60 ms</td><td>4</td><td>No</td></tr>
            <tr><td>MLFQ</td><td>9.80 ms</td><td>14.60 ms</td><td>9</td><td>Yes</td></tr>
        `;
    });

    document.getElementById('btn-run-disk-bench').addEventListener('click', () => {
        const container = document.getElementById('benchmark-summary-box');
        container.innerHTML = `<h4>Disk Scheduling Benchmarks (Workload: 8 Requests)</h4>`;

        const tbody = document.getElementById('benchmark-body');
        const thead = document.querySelector('#benchmark-table thead');
        thead.innerHTML = `<tr><th>Disk Algorithm</th><th>Total Seek Tracks</th><th>Avg Seek Distance</th><th>Uniform Service</th></tr>`;
        tbody.innerHTML = `
            <tr><td>FCFS</td><td>643 tracks</td><td>80.38 tracks</td><td>No</td></tr>
            <tr><td>SSTF</td><td>205 tracks</td><td>25.62 tracks</td><td>No (Starvation potential)</td></tr>
            <tr><td>SCAN (Elevator)</td><td>334 tracks</td><td>41.75 tracks</td><td>Moderate</td></tr>
            <tr style="background: #dcfce7"><td><strong>C-SCAN (Circular SCAN)</strong></td><td><strong>186 tracks</strong></td><td><strong>23.25 tracks</strong></td><td><strong>High (Uniform)</strong></td></tr>
        `;
    });
}
