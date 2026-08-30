#include <iostream>
#include <vector>
#include <algorithm>
#include <iomanip>
#include <string>
#include <queue>
#include <climits>
#include <unordered_map>
#include <set>
#include <cmath>

using namespace std;

// ============================================================================
// 1. CPU SCHEDULING MODULE
// ============================================================================
namespace CPUScheduling {

struct Process {
    int pid;
    int arrivalTime;
    int burstTime;
    int remainingTime;
    int priority;

    int startTime = -1;
    int completionTime = 0;
    int waitingTime = 0;
    int turnaroundTime = 0;
    int responseTime = 0;
    bool starved = false;
};

struct GanttEntry {
    int start;
    int end;
    string label;
};

struct Metrics {
    double avgWaitingTime = 0;
    double avgTurnaroundTime = 0;
    double avgResponseTime = 0;
    double throughput = 0;
    double cpuUtilization = 0;
    int contextSwitches = 0;
};

void addGantt(vector<GanttEntry>& gantt, int start, int end, const string& label) {
    if (start == end) return;
    if (!gantt.empty() && gantt.back().label == label && gantt.back().end == start) {
        gantt.back().end = end;
    } else {
        gantt.push_back({start, end, label});
    }
}

void prepareProcesses(vector<Process>& processes) {
    for (auto &p : processes) {
        p.remainingTime = p.burstTime;
        p.startTime = -1;
        p.completionTime = 0;
        p.waitingTime = 0;
        p.turnaroundTime = 0;
        p.responseTime = 0;
        p.starved = false;
    }
}

Metrics calculateMetrics(vector<Process>& processes, int totalTime, int cpuBusyTime, int contextSwitches) {
    Metrics m;
    int n = processes.size();
    if (n == 0) return m;

    for (auto &p : processes) {
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        p.responseTime = p.startTime - p.arrivalTime;

        m.avgWaitingTime += p.waitingTime;
        m.avgTurnaroundTime += p.turnaroundTime;
        m.avgResponseTime += p.responseTime;
    }

    m.avgWaitingTime /= n;
    m.avgTurnaroundTime /= n;
    m.avgResponseTime /= n;

    if (totalTime == 0) totalTime = 1;

    m.throughput = (double)n / totalTime;
    m.cpuUtilization = ((double)cpuBusyTime / totalTime) * 100.0;
    m.contextSwitches = contextSwitches;

    return m;
}

void detectStarvation(vector<Process>& processes, int starvationLimit = 10) {
    for (auto &p : processes) {
        if (p.waitingTime > starvationLimit) {
            p.starved = true;
        }
    }
}

void printResult(const string& name, vector<Process>& processes, const vector<GanttEntry>& gantt,
                 int finalTime, int cpuBusyTime, int contextSwitches) {
    cout << "\n==================================================\n";
    cout << " " << name << "\n";
    cout << "==================================================\n";

    Metrics m = calculateMetrics(processes, finalTime, cpuBusyTime, contextSwitches);
    detectStarvation(processes, 10);

    cout << "Gantt Chart:\n ";
    for (const auto &g : gantt) {
        cout << "[" << g.start << " " << g.label << " " << g.end << "] ";
    }
    cout << "\n\nProcess Table:\n";
    cout << "PID\tAT\tBT\tPR\tST\tCT\tWT\tTAT\tRT\tStarved\n";

    vector<Process> sortedP = processes;
    sort(sortedP.begin(), sortedP.end(), [](const Process &a, const Process &b) { return a.pid < b.pid; });

    for (const auto &p : sortedP) {
        cout << p.pid << "\t" << p.arrivalTime << "\t" << p.burstTime << "\t"
             << p.priority << "\t" << p.startTime << "\t" << p.completionTime << "\t"
             << p.waitingTime << "\t" << p.turnaroundTime << "\t" << p.responseTime << "\t"
             << (p.starved ? "YES" : "NO") << "\n";
    }

    cout << fixed << setprecision(2);
    cout << "\nMetrics:\n";
    cout << "  Avg Waiting Time   : " << m.avgWaitingTime << "\n";
    cout << "  Avg Turnaround Time: " << m.avgTurnaroundTime << "\n";
    cout << "  Avg Response Time  : " << m.avgResponseTime << "\n";
    cout << "  Throughput         : " << m.throughput << " proc/unit\n";
    cout << "  CPU Utilization    : " << m.cpuUtilization << "%\n";
    cout << "  Context Switches   : " << m.contextSwitches << "\n";
}

void simulateFCFS(vector<Process> processes) {
    prepareProcesses(processes);
    sort(processes.begin(), processes.end(), [](const Process &a, const Process &b) {
        return a.arrivalTime < b.arrivalTime || (a.arrivalTime == b.arrivalTime && a.pid < b.pid);
    });

    vector<GanttEntry> gantt;
    int currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1;

    for (auto &p : processes) {
        if (currentTime < p.arrivalTime) {
            addGantt(gantt, currentTime, p.arrivalTime, "IDLE");
            currentTime = p.arrivalTime;
            lastPid = -1;
        }

        if (lastPid != -1 && lastPid != p.pid) contextSwitches++;

        p.startTime = currentTime;
        currentTime += p.burstTime;
        p.completionTime = currentTime;
        p.remainingTime = 0;
        cpuBusyTime += p.burstTime;

        addGantt(gantt, p.startTime, p.completionTime, "P" + to_string(p.pid));
        lastPid = p.pid;
    }
    printResult("FCFS Scheduling", processes, gantt, currentTime, cpuBusyTime, contextSwitches);
}

void simulateSJF(vector<Process> processes) {
    prepareProcesses(processes);
    int n = processes.size(), completed = 0, currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1;
    vector<GanttEntry> gantt;

    while (completed < n) {
        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (processes[i].remainingTime > 0 && processes[i].arrivalTime <= currentTime) {
                if (idx == -1 || processes[i].burstTime < processes[idx].burstTime ||
                    (processes[i].burstTime == processes[idx].burstTime && processes[i].arrivalTime < processes[idx].arrivalTime)) {
                    idx = i;
                }
            }
        }

        if (idx == -1) {
            int nextArrival = INT_MAX;
            for (auto &p : processes) {
                if (p.remainingTime > 0) nextArrival = min(nextArrival, p.arrivalTime);
            }
            addGantt(gantt, currentTime, nextArrival, "IDLE");
            currentTime = nextArrival;
            lastPid = -1;
            continue;
        }

        if (lastPid != -1 && lastPid != processes[idx].pid) contextSwitches++;

        processes[idx].startTime = currentTime;
        currentTime += processes[idx].burstTime;
        processes[idx].completionTime = currentTime;
        processes[idx].remainingTime = 0;
        cpuBusyTime += processes[idx].burstTime;

        addGantt(gantt, processes[idx].startTime, processes[idx].completionTime, "P" + to_string(processes[idx].pid));
        lastPid = processes[idx].pid;
        completed++;
    }
    printResult("SJF Non-Preemptive", processes, gantt, currentTime, cpuBusyTime, contextSwitches);
}

void simulateSRTF(vector<Process> processes) {
    prepareProcesses(processes);
    int n = processes.size(), completed = 0, currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1;
    vector<GanttEntry> gantt;

    while (completed < n) {
        int idx = -1;
        for (int i = 0; i < n; i++) {
            if (processes[i].remainingTime > 0 && processes[i].arrivalTime <= currentTime) {
                if (idx == -1 || processes[i].remainingTime < processes[idx].remainingTime ||
                    (processes[i].remainingTime == processes[idx].remainingTime && processes[i].arrivalTime < processes[idx].arrivalTime)) {
                    idx = i;
                }
            }
        }

        if (idx == -1) {
            int nextArrival = INT_MAX;
            for (auto &p : processes) {
                if (p.remainingTime > 0) nextArrival = min(nextArrival, p.arrivalTime);
            }
            addGantt(gantt, currentTime, nextArrival, "IDLE");
            currentTime = nextArrival;
            lastPid = -1;
            continue;
        }

        if (lastPid != -1 && lastPid != processes[idx].pid) contextSwitches++;
        if (processes[idx].startTime == -1) processes[idx].startTime = currentTime;

        addGantt(gantt, currentTime, currentTime + 1, "P" + to_string(processes[idx].pid));
        processes[idx].remainingTime--;
        currentTime++;
        cpuBusyTime++;
        lastPid = processes[idx].pid;

        if (processes[idx].remainingTime == 0) {
            processes[idx].completionTime = currentTime;
            completed++;
        }
    }
    printResult("SRTF Preemptive SJF", processes, gantt, currentTime, cpuBusyTime, contextSwitches);
}

void simulateRoundRobin(vector<Process> processes, int quantum) {
    prepareProcesses(processes);
    sort(processes.begin(), processes.end(), [](const Process &a, const Process &b) {
        return a.arrivalTime < b.arrivalTime || (a.arrivalTime == b.arrivalTime && a.pid < b.pid);
    });

    int n = processes.size(), completed = 0, currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1, nextProcess = 0;
    queue<int> readyQueue;
    vector<GanttEntry> gantt;

    while (completed < n) {
        if (readyQueue.empty()) {
            if (nextProcess < n && currentTime < processes[nextProcess].arrivalTime) {
                addGantt(gantt, currentTime, processes[nextProcess].arrivalTime, "IDLE");
                currentTime = processes[nextProcess].arrivalTime;
                lastPid = -1;
            }
            while (nextProcess < n && processes[nextProcess].arrivalTime <= currentTime) {
                readyQueue.push(nextProcess++);
            }
        }

        if (readyQueue.empty()) continue;

        int idx = readyQueue.front();
        readyQueue.pop();

        if (lastPid != -1 && lastPid != processes[idx].pid) contextSwitches++;
        if (processes[idx].startTime == -1) processes[idx].startTime = currentTime;

        int runTime = min(quantum, processes[idx].remainingTime);
        addGantt(gantt, currentTime, currentTime + runTime, "P" + to_string(processes[idx].pid));

        currentTime += runTime;
        cpuBusyTime += runTime;
        processes[idx].remainingTime -= runTime;

        while (nextProcess < n && processes[nextProcess].arrivalTime <= currentTime) {
            readyQueue.push(nextProcess++);
        }

        if (processes[idx].remainingTime > 0) {
            readyQueue.push(idx);
        } else {
            processes[idx].completionTime = currentTime;
            completed++;
        }
        lastPid = processes[idx].pid;
    }
    printResult("Round Robin (q = " + to_string(quantum) + ")", processes, gantt, currentTime, cpuBusyTime, contextSwitches);
}

void simulatePriorityAging(vector<Process> processes, int agingInterval = 5) {
    prepareProcesses(processes);
    int n = processes.size(), completed = 0, currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1;
    vector<GanttEntry> gantt;

    while (completed < n) {
        int idx = -1;
        int bestPriority = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (processes[i].remainingTime > 0 && processes[i].arrivalTime <= currentTime) {
                int waitingSoFar = currentTime - processes[i].arrivalTime;
                int boost = waitingSoFar / agingInterval;
                int effectivePriority = max(0, processes[i].priority - boost);

                if (idx == -1 || effectivePriority < bestPriority ||
                    (effectivePriority == bestPriority && processes[i].arrivalTime < processes[idx].arrivalTime)) {
                    idx = i;
                    bestPriority = effectivePriority;
                }
            }
        }

        if (idx == -1) {
            int nextArrival = INT_MAX;
            for (auto &p : processes) {
                if (p.remainingTime > 0) nextArrival = min(nextArrival, p.arrivalTime);
            }
            addGantt(gantt, currentTime, nextArrival, "IDLE");
            currentTime = nextArrival;
            lastPid = -1;
            continue;
        }

        if (lastPid != -1 && lastPid != processes[idx].pid) contextSwitches++;

        processes[idx].startTime = currentTime;
        currentTime += processes[idx].burstTime;
        processes[idx].completionTime = currentTime;
        processes[idx].remainingTime = 0;
        cpuBusyTime += processes[idx].burstTime;

        addGantt(gantt, processes[idx].startTime, processes[idx].completionTime, "P" + to_string(processes[idx].pid));
        lastPid = processes[idx].pid;
        completed++;
    }
    printResult("Priority Scheduling with Aging", processes, gantt, currentTime, cpuBusyTime, contextSwitches);
}

void simulateMLFQ(vector<Process> processes) {
    prepareProcesses(processes);
    int n = processes.size(), completed = 0, currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1;
    vector<GanttEntry> gantt;

    // 3 Queues: Q0 (RR q=2), Q1 (RR q=4), Q2 (FCFS)
    queue<int> q0, q1, q2;
    vector<int> processQueue(n, 0); // track current queue level of each process

    sort(processes.begin(), processes.end(), [](const Process &a, const Process &b) {
        return a.arrivalTime < b.arrivalTime || (a.arrivalTime == b.arrivalTime && a.pid < b.pid);
    });

    int nextProcess = 0;

    auto checkNewArrivals = [&](int time) {
        while (nextProcess < n && processes[nextProcess].arrivalTime <= time) {
            q0.push(nextProcess++);
        }
    };

    while (completed < n) {
        checkNewArrivals(currentTime);

        if (q0.empty() && q1.empty() && q2.empty()) {
            if (nextProcess < n) {
                addGantt(gantt, currentTime, processes[nextProcess].arrivalTime, "IDLE");
                currentTime = processes[nextProcess].arrivalTime;
                lastPid = -1;
                checkNewArrivals(currentTime);
            } else break;
        }

        int idx = -1;
        int qLevel = -1;
        int quantum = 0;

        if (!q0.empty()) { idx = q0.front(); q0.pop(); qLevel = 0; quantum = 2; }
        else if (!q1.empty()) { idx = q1.front(); q1.pop(); qLevel = 1; quantum = 4; }
        else if (!q2.empty()) { idx = q2.front(); q2.pop(); qLevel = 2; quantum = processes[idx].remainingTime; }

        if (idx == -1) continue;

        if (lastPid != -1 && lastPid != processes[idx].pid) contextSwitches++;
        if (processes[idx].startTime == -1) processes[idx].startTime = currentTime;

        int runTime = (qLevel == 2) ? processes[idx].remainingTime : min(quantum, processes[idx].remainingTime);
        addGantt(gantt, currentTime, currentTime + runTime, "P" + to_string(processes[idx].pid) + "(Q" + to_string(qLevel) + ")");

        currentTime += runTime;
        cpuBusyTime += runTime;
        processes[idx].remainingTime -= runTime;

        checkNewArrivals(currentTime);

        if (processes[idx].remainingTime > 0) {
            // Demote if quantum expired in Q0 or Q1
            int nextQ = min(2, qLevel + 1);
            if (nextQ == 1) q1.push(idx);
            else q2.push(idx);
        } else {
            processes[idx].completionTime = currentTime;
            completed++;
        }
        lastPid = processes[idx].pid;
    }

    printResult("Multilevel Feedback Queue (MLFQ)", processes, gantt, currentTime, cpuBusyTime, contextSwitches);
}

} // namespace CPUScheduling


// ============================================================================
// 2. MEMORY MANAGEMENT MODULE (PAGE REPLACEMENT & BELADY'S ANOMALY)
// ============================================================================
namespace MemoryManagement {

struct PageReplacementResult {
    string algoName;
    int frameCount;
    int pageFaults;
    int pageHits;
    double hitRatio;
};

PageReplacementResult simulateFIFO(const vector<int>& pages, int frameCount) {
    vector<int> frames(frameCount, -1);
    set<int> inMemory;
    queue<int> fifoQueue;
    int faults = 0, hits = 0;

    for (int p : pages) {
        if (inMemory.count(p)) {
            hits++;
        } else {
            faults++;
            if ((int)inMemory.size() < frameCount) {
                for (int i = 0; i < frameCount; i++) {
                    if (frames[i] == -1) {
                        frames[i] = p;
                        break;
                    }
                }
            } else {
                int victim = fifoQueue.front();
                fifoQueue.pop();
                inMemory.erase(victim);
                for (int i = 0; i < frameCount; i++) {
                    if (frames[i] == victim) {
                        frames[i] = p;
                        break;
                    }
                }
            }
            inMemory.insert(p);
            fifoQueue.push(p);
        }
    }
    double total = pages.size();
    return {"FIFO", frameCount, faults, hits, (hits / total) * 100.0};
}

PageReplacementResult simulateLRU(const vector<int>& pages, int frameCount) {
    vector<int> frames(frameCount, -1);
    unordered_map<int, int> lastUsed;
    set<int> inMemory;
    int faults = 0, hits = 0;

    for (int time = 0; time < (int)pages.size(); time++) {
        int p = pages[time];
        if (inMemory.count(p)) {
            hits++;
        } else {
            faults++;
            if ((int)inMemory.size() < frameCount) {
                for (int i = 0; i < frameCount; i++) {
                    if (frames[i] == -1) {
                        frames[i] = p;
                        break;
                    }
                }
            } else {
                int lruPage = -1, oldest = INT_MAX;
                for (int pageInMem : inMemory) {
                    if (lastUsed[pageInMem] < oldest) {
                        oldest = lastUsed[pageInMem];
                        lruPage = pageInMem;
                    }
                }
                inMemory.erase(lruPage);
                for (int i = 0; i < frameCount; i++) {
                    if (frames[i] == lruPage) {
                        frames[i] = p;
                        break;
                    }
                }
            }
            inMemory.insert(p);
        }
        lastUsed[p] = time;
    }
    double total = pages.size();
    return {"LRU", frameCount, faults, hits, (hits / total) * 100.0};
}

PageReplacementResult simulateOptimal(const vector<int>& pages, int frameCount) {
    vector<int> frames(frameCount, -1);
    set<int> inMemory;
    int faults = 0, hits = 0;
    int n = pages.size();

    for (int i = 0; i < n; i++) {
        int p = pages[i];
        if (inMemory.count(p)) {
            hits++;
        } else {
            faults++;
            if ((int)inMemory.size() < frameCount) {
                for (int j = 0; j < frameCount; j++) {
                    if (frames[j] == -1) {
                        frames[j] = p;
                        break;
                    }
                }
            } else {
                int victim = -1, farthest = -1;
                for (int pageInMem : inMemory) {
                    int nextUse = INT_MAX;
                    for (int k = i + 1; k < n; k++) {
                        if (pages[k] == pageInMem) {
                            nextUse = k;
                            break;
                        }
                    }
                    if (nextUse > farthest) {
                        farthest = nextUse;
                        victim = pageInMem;
                    }
                }
                inMemory.erase(victim);
                for (int j = 0; j < frameCount; j++) {
                    if (frames[j] == victim) {
                        frames[j] = p;
                        break;
                    }
                }
            }
            inMemory.insert(p);
        }
    }
    double total = pages.size();
    return {"Optimal", frameCount, faults, hits, (hits / total) * 100.0};
}

void demonstrateBeladysAnomaly() {
    cout << "\n==================================================\n";
    cout << " MEMORY MANAGEMENT: BELADY'S ANOMALY DEMO\n";
    cout << "==================================================\n";
    // Standard sequence demonstrating Belady's Anomaly for FIFO (3 frames vs 4 frames)
    vector<int> referenceString = {1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5};

    cout << "Reference String: ";
    for (int p : referenceString) cout << p << " ";
    cout << "\n\nRunning FIFO Page Replacement:\n";

    auto res3 = simulateFIFO(referenceString, 3);
    auto res4 = simulateFIFO(referenceString, 4);

    cout << "  3 Frames: " << res3.pageFaults << " Page Faults\n";
    cout << "  4 Frames: " << res4.pageFaults << " Page Faults\n";

    if (res4.pageFaults > res3.pageFaults) {
        cout << "  [BELADY'S ANOMALY DETECTED!] Increasing frame size from 3 to 4 increased page faults from "
             << res3.pageFaults << " to " << res4.pageFaults << "!\n";
    }

    cout << "\nComparison with LRU and Optimal on 3 vs 4 frames:\n";
    auto lru3 = simulateLRU(referenceString, 3);
    auto lru4 = simulateLRU(referenceString, 4);
    auto opt3 = simulateOptimal(referenceString, 3);
    auto opt4 = simulateOptimal(referenceString, 4);

    cout << "  LRU (3 frames): " << lru3.pageFaults << " faults | LRU (4 frames): " << lru4.pageFaults << " faults\n";
    cout << "  OPT (3 frames): " << opt3.pageFaults << " faults | OPT (4 frames): " << opt4.pageFaults << " faults\n";
}

} // namespace MemoryManagement


// ============================================================================
// 3. DEADLOCK AVOIDANCE MODULE (BANKER'S ALGORITHM)
// ============================================================================
namespace BankersAlgorithm {

struct BankerState {
    int numProcesses;
    int numResources;
    vector<vector<int>> maxMatrix;
    vector<vector<int>> allocationMatrix;
    vector<vector<int>> needMatrix;
    vector<int> availableVector;
};

void runBankersSimulation() {
    cout << "\n==================================================\n";
    cout << " CONCURRENCY & DEADLOCK: BANKER'S ALGORITHM\n";
    cout << "==================================================\n";

    int n = 5; // Processes P0..P4
    int m = 3; // Resources A, B, C

    vector<vector<int>> alloc = {
        {0, 1, 0},
        {2, 0, 0},
        {3, 0, 2},
        {2, 1, 1},
        {0, 0, 2}
    };

    vector<vector<int>> maxMat = {
        {7, 5, 3},
        {3, 2, 2},
        {9, 0, 2},
        {2, 2, 2},
        {4, 3, 3}
    };

    vector<int> avail = {3, 3, 2};

    vector<vector<int>> need(n, vector<int>(m, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            need[i][j] = maxMat[i][j] - alloc[i][j];
        }
    }

    cout << "Need Matrix (Max - Allocation):\n";
    cout << "PID\tA B C\n";
    for (int i = 0; i < n; i++) {
        cout << "P" << i << "\t" << need[i][0] << " " << need[i][1] << " " << need[i][2] << "\n";
    }

    // Safety Check
    vector<int> work = avail;
    vector<bool> finish(n, false);
    vector<int> safeSequence;

    int count = 0;
    while (count < n) {
        bool found = false;
        for (int i = 0; i < n; i++) {
            if (!finish[i]) {
                bool canAllocate = true;
                for (int j = 0; j < m; j++) {
                    if (need[i][j] > work[j]) {
                        canAllocate = false;
                        break;
                    }
                }
                if (canAllocate) {
                    for (int j = 0; j < m; j++) work[j] += alloc[i][j];
                    safeSequence.push_back(i);
                    finish[i] = true;
                    found = true;
                    count++;
                }
            }
        }
        if (!found) break; // Deadlock or Unsafe state
    }

    if (count == n) {
        cout << "\n[SYSTEM IS IN A SAFE STATE]\nSafe Sequence: ";
        for (int i = 0; i < n; i++) {
            cout << "P" << safeSequence[i] << (i == n - 1 ? "" : " -> ");
        }
        cout << "\n";
    } else {
        cout << "\n[SYSTEM IS IN AN UNSAFE STATE / DEADLOCK DETECTED!]\n";
    }
}

} // namespace BankersAlgorithm


// ============================================================================
// 4. DISK SCHEDULING MODULE
// ============================================================================
namespace DiskScheduling {

struct DiskResult {
    string algoName;
    int totalSeekDistance;
    vector<int> seekSequence;
};

DiskResult simulateFCFS(int head, const vector<int>& requests) {
    int totalSeek = 0;
    int curr = head;
    vector<int> seq = {head};
    for (int req : requests) {
        totalSeek += abs(req - curr);
        curr = req;
        seq.push_back(curr);
    }
    return {"FCFS", totalSeek, seq};
}

DiskResult simulateSSTF(int head, vector<int> requests) {
    int totalSeek = 0;
    int curr = head;
    vector<int> seq = {head};
    vector<bool> visited(requests.size(), false);

    for (size_t i = 0; i < requests.size(); i++) {
        int idx = -1, minDist = INT_MAX;
        for (size_t j = 0; j < requests.size(); j++) {
            if (!visited[j]) {
                int dist = abs(requests[j] - curr);
                if (dist < minDist) {
                    minDist = dist;
                    idx = j;
                }
            }
        }
        if (idx != -1) {
            visited[idx] = true;
            totalSeek += minDist;
            curr = requests[idx];
            seq.push_back(curr);
        }
    }
    return {"SSTF", totalSeek, seq};
}

DiskResult simulateSCAN(int head, vector<int> requests, int diskSize = 200, string direction = "high") {
    int totalSeek = 0;
    int curr = head;
    vector<int> seq = {head};
    vector<int> left, right;

    if (direction == "low") left.push_back(0);
    else if (direction == "high") right.push_back(diskSize - 1);

    for (int r : requests) {
        if (r < head) left.push_back(r);
        else right.push_back(r);
    }

    sort(left.begin(), left.end());
    sort(right.begin(), right.end());

    int run = 2;
    while (run--) {
        if (direction == "high") {
            for (int r : right) {
                totalSeek += abs(r - curr);
                curr = r;
                seq.push_back(curr);
            }
            direction = "low";
        } else {
            for (int i = left.size() - 1; i >= 0; i--) {
                totalSeek += abs(left[i] - curr);
                curr = left[i];
                seq.push_back(curr);
            }
            direction = "high";
        }
    }
    return {"SCAN", totalSeek, seq};
}

DiskResult simulateCSCAN(int head, vector<int> requests, int diskSize = 200) {
    int totalSeek = 0;
    int curr = head;
    vector<int> seq = {head};
    vector<int> left, right;

    right.push_back(diskSize - 1);
    left.push_back(0);

    for (int r : requests) {
        if (r < head) left.push_back(r);
        else right.push_back(r);
    }

    sort(left.begin(), left.end());
    sort(right.begin(), right.end());

    for (int r : right) {
        totalSeek += abs(r - curr);
        curr = r;
        seq.push_back(curr);
    }
    curr = 0;
    seq.push_back(curr);

    for (int r : left) {
        totalSeek += abs(r - curr);
        curr = r;
        seq.push_back(curr);
    }

    return {"C-SCAN", totalSeek, seq};
}

void printDiskResult(const DiskResult& res) {
    cout << left << setw(10) << res.algoName << " | Total Seek: " << setw(5) << res.totalSeekDistance << " | Sequence: ";
    for (size_t i = 0; i < res.seekSequence.size(); i++) {
        cout << res.seekSequence[i] << (i == res.seekSequence.size() - 1 ? "" : " -> ");
    }
    cout << "\n";
}

void runDiskSimulation() {
    cout << "\n==================================================\n";
    cout << " DISK SCHEDULING ALGORITHMS\n";
    cout << "==================================================\n";
    int head = 50;
    vector<int> requests = {98, 183, 37, 122, 14, 124, 65, 67};

    cout << "Initial Head Position: " << head << "\n";
    cout << "Request Queue        : ";
    for (int r : requests) cout << r << " ";
    cout << "\n\n";

    printDiskResult(simulateFCFS(head, requests));
    printDiskResult(simulateSSTF(head, requests));
    printDiskResult(simulateSCAN(head, requests));
    printDiskResult(simulateCSCAN(head, requests));
}

} // namespace DiskScheduling


// ============================================================================
// MAIN ENTRY POINT
// ============================================================================
int main() {
    cout << "===============================================================\n";
    cout << "       OPERATING SYSTEM CORE SIMULATION & BENCHMARK SUITE       \n";
    cout << "===============================================================\n";

    // 1. CPU Scheduling Simulation
    vector<CPUScheduling::Process> processes = {
        {1, 0, 5, 5, 3},
        {2, 1, 3, 3, 1},
        {3, 2, 8, 8, 4},
        {4, 3, 6, 6, 2},
        {5, 4, 2, 2, 5}
    };

    CPUScheduling::simulateFCFS(processes);
    CPUScheduling::simulateSJF(processes);
    CPUScheduling::simulateSRTF(processes);
    CPUScheduling::simulateRoundRobin(processes, 3);
    CPUScheduling::simulatePriorityAging(processes, 5);
    CPUScheduling::simulateMLFQ(processes);

    // 2. Memory Management Simulation
    MemoryManagement::demonstrateBeladysAnomaly();

    // 3. Banker's Algorithm Simulation
    BankersAlgorithm::runBankersSimulation();

    // 4. Disk Scheduling Simulation
    DiskScheduling::runDiskSimulation();

    cout << "\n===============================================================\n";
    cout << " SIMULATION SUITE COMPLETE.\n";
    cout << " Launch index.html in any browser for the Web GUI Dashboard!\n";
    cout << "===============================================================\n";

    return 0;
}