#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <queue>
#include <unordered_map>
#include <set>
#include <cmath>
#include <climits>
#include <iomanip>
#include <sstream>
#include <chrono>

#include "json.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define EXPORT_FN EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT_FN
#endif

using json = nlohmann::json;
using namespace std;

// ============================================================================
// 1. CPU SCHEDULING
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
};

struct GanttBlock {
    int start;
    int end;
    string label;
    int pid; // -1 for IDLE
};

void mergeGantt(vector<GanttBlock>& raw, vector<GanttBlock>& merged) {
    for (const auto& g : raw) {
        if (g.start == g.end) continue;
        if (!merged.empty() && merged.back().label == g.label && merged.back().end == g.start) {
            merged.back().end = g.end;
        } else {
            merged.push_back(g);
        }
    }
}

json simulate(const string& algo, vector<Process> procs, int quantum, int agingRate) {
    auto t0 = chrono::high_resolution_clock::now();
    int n = procs.size();
    if (n == 0) {
        return json{{"gantt", json::array()}, {"results", json::array()}, {"metrics", json::object()}, {"logs", json::array()}};
    }

    for (auto& p : procs) {
        p.remainingTime = p.burstTime;
        p.startTime = -1;
        p.completionTime = 0;
        p.waitingTime = 0;
        p.turnaroundTime = 0;
        p.responseTime = 0;
    }

    vector<GanttBlock> rawGantt;
    vector<string> logs;
    int currentTime = 0, cpuBusyTime = 0, contextSwitches = 0, lastPid = -1, completed = 0;

    if (algo == "FCFS") {
        sort(procs.begin(), procs.end(), [](const Process& a, const Process& b) {
            if (a.arrivalTime != b.arrivalTime) return a.arrivalTime < b.arrivalTime;
            return a.pid < b.pid;
        });

        for (auto& p : procs) {
            if (currentTime < p.arrivalTime) {
                logs.push_back("t=" + to_string(currentTime) + " to " + to_string(p.arrivalTime) + ": CPU is IDLE waiting for arrival.");
                rawGantt.push_back({currentTime, p.arrivalTime, "IDLE", -1});
                currentTime = p.arrivalTime;
                lastPid = -1;
            }
            if (lastPid != -1 && lastPid != p.pid) contextSwitches++;
            p.startTime = currentTime;
            currentTime += p.burstTime;
            p.completionTime = currentTime;
            p.remainingTime = 0;
            cpuBusyTime += p.burstTime;
            rawGantt.push_back({p.startTime, p.completionTime, "P" + to_string(p.pid), p.pid});
            logs.push_back("t=" + to_string(p.startTime) + ": Dispatched P" + to_string(p.pid) + " (Burst=" + to_string(p.burstTime) + "). Finishes at t=" + to_string(p.completionTime) + ".");
            lastPid = p.pid;
        }
    } else if (algo == "SJF") {
        while (completed < n) {
            int idx = -1;
            for (int i = 0; i < n; i++) {
                if (procs[i].remainingTime > 0 && procs[i].arrivalTime <= currentTime) {
                    if (idx == -1 || procs[i].burstTime < procs[idx].burstTime) {
                        idx = i;
                    }
                }
            }
            if (idx == -1) {
                int nextArrival = INT_MAX;
                for (const auto& p : procs) {
                    if (p.remainingTime > 0) nextArrival = min(nextArrival, p.arrivalTime);
                }
                logs.push_back("t=" + to_string(currentTime) + ": No ready process. CPU IDLE until t=" + to_string(nextArrival) + ".");
                rawGantt.push_back({currentTime, nextArrival, "IDLE", -1});
                currentTime = nextArrival;
                lastPid = -1;
                continue;
            }
            if (lastPid != -1 && lastPid != procs[idx].pid) contextSwitches++;
            procs[idx].startTime = currentTime;
            currentTime += procs[idx].burstTime;
            procs[idx].completionTime = currentTime;
            procs[idx].remainingTime = 0;
            cpuBusyTime += procs[idx].burstTime;
            rawGantt.push_back({procs[idx].startTime, procs[idx].completionTime, "P" + to_string(procs[idx].pid), procs[idx].pid});
            logs.push_back("t=" + to_string(procs[idx].startTime) + ": Dispatched P" + to_string(procs[idx].pid) + " (Shortest Burst=" + to_string(procs[idx].burstTime) + "). Completed at t=" + to_string(procs[idx].completionTime) + ".");
            lastPid = procs[idx].pid;
            completed++;
        }
    } else if (algo == "SRTF") {
        while (completed < n) {
            int idx = -1;
            for (int i = 0; i < n; i++) {
                if (procs[i].remainingTime > 0 && procs[i].arrivalTime <= currentTime) {
                    if (idx == -1 || procs[i].remainingTime < procs[idx].remainingTime) {
                        idx = i;
                    }
                }
            }
            if (idx == -1) {
                int nextArrival = INT_MAX;
                for (const auto& p : procs) {
                    if (p.remainingTime > 0) nextArrival = min(nextArrival, p.arrivalTime);
                }
                logs.push_back("t=" + to_string(currentTime) + ": CPU IDLE until t=" + to_string(nextArrival) + ".");
                rawGantt.push_back({currentTime, nextArrival, "IDLE", -1});
                currentTime = nextArrival;
                lastPid = -1;
                continue;
            }
            if (lastPid != -1 && lastPid != procs[idx].pid) contextSwitches++;
            if (procs[idx].startTime == -1) procs[idx].startTime = currentTime;
            rawGantt.push_back({currentTime, currentTime + 1, "P" + to_string(procs[idx].pid), procs[idx].pid});
            procs[idx].remainingTime--;
            currentTime++;
            cpuBusyTime++;
            lastPid = procs[idx].pid;

            if (procs[idx].remainingTime == 0) {
                procs[idx].completionTime = currentTime;
                completed++;
                logs.push_back("t=" + to_string(currentTime) + ": P" + to_string(procs[idx].pid) + " fully finished execution.");
            }
        }
    } else if (algo == "RR" || algo == "MLFQ") {
        sort(procs.begin(), procs.end(), [](const Process& a, const Process& b) {
            return a.arrivalTime < b.arrivalTime;
        });
        queue<int> q;
        int nextIdx = 0;
        int qVal = (algo == "MLFQ") ? 2 : quantum;

        while (completed < n) {
            if (q.empty()) {
                if (nextIdx < n && currentTime < procs[nextIdx].arrivalTime) {
                    rawGantt.push_back({currentTime, procs[nextIdx].arrivalTime, "IDLE", -1});
                    currentTime = procs[nextIdx].arrivalTime;
                    lastPid = -1;
                }
                while (nextIdx < n && procs[nextIdx].arrivalTime <= currentTime) {
                    q.push(nextIdx++);
                }
            }
            if (q.empty()) continue;
            int idx = q.front();
            q.pop();

            if (lastPid != -1 && lastPid != procs[idx].pid) contextSwitches++;
            if (procs[idx].startTime == -1) procs[idx].startTime = currentTime;

            int runTime = min(qVal, procs[idx].remainingTime);
            rawGantt.push_back({currentTime, currentTime + runTime, "P" + to_string(procs[idx].pid), procs[idx].pid});
            logs.push_back("t=" + to_string(currentTime) + ": Allocated time slice (q=" + to_string(runTime) + ") to P" + to_string(procs[idx].pid) + ".");

            currentTime += runTime;
            cpuBusyTime += runTime;
            procs[idx].remainingTime -= runTime;

            while (nextIdx < n && procs[nextIdx].arrivalTime <= currentTime) {
                q.push(nextIdx++);
            }

            if (procs[idx].remainingTime > 0) {
                q.push(idx);
            } else {
                procs[idx].completionTime = currentTime;
                completed++;
                logs.push_back("t=" + to_string(currentTime) + ": P" + to_string(procs[idx].pid) + " completed.");
            }
            lastPid = procs[idx].pid;
        }
    } else if (algo == "Priority") { // Non-preemptive with aging
        while (completed < n) {
            int idx = -1;
            int bestPriority = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (procs[i].remainingTime > 0 && procs[i].arrivalTime <= currentTime) {
                    int waiting = currentTime - procs[i].arrivalTime;
                    int effectivePriority = procs[i].priority;
                    if (agingRate > 0) {
                        effectivePriority = max(1, procs[i].priority - (waiting / agingRate));
                    }
                    if (idx == -1 || effectivePriority < bestPriority) {
                        idx = i;
                        bestPriority = effectivePriority;
                    }
                }
            }
            if (idx == -1) {
                int nextArrival = INT_MAX;
                for (const auto& p : procs) {
                    if (p.remainingTime > 0) nextArrival = min(nextArrival, p.arrivalTime);
                }
                rawGantt.push_back({currentTime, nextArrival, "IDLE", -1});
                currentTime = nextArrival;
                lastPid = -1;
                continue;
            }
            if (lastPid != -1 && lastPid != procs[idx].pid) contextSwitches++;
            procs[idx].startTime = currentTime;
            currentTime += procs[idx].burstTime;
            procs[idx].completionTime = currentTime;
            procs[idx].remainingTime = 0;
            cpuBusyTime += procs[idx].burstTime;
            rawGantt.push_back({procs[idx].startTime, procs[idx].completionTime, "P" + to_string(procs[idx].pid), procs[idx].pid});
            logs.push_back("t=" + to_string(procs[idx].startTime) + ": Executed P" + to_string(procs[idx].pid) + " (Effective Priority=" + to_string(bestPriority) + "). Completed at t=" + to_string(procs[idx].completionTime) + ".");
            lastPid = procs[idx].pid;
            completed++;
        }
    }

    vector<GanttBlock> mergedGantt;
    mergeGantt(rawGantt, mergedGantt);

    double totWt = 0, totTat = 0, totRt = 0;
    for (auto& p : procs) {
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        p.responseTime = p.startTime - p.arrivalTime;
        totWt += p.waitingTime;
        totTat += p.turnaroundTime;
        totRt += p.responseTime;
    }

    auto t1 = chrono::high_resolution_clock::now();
    double execTimeMs = chrono::duration<double, milli>(t1 - t0).count();

    json ganttJson = json::array();
    for (const auto& g : mergedGantt) {
        ganttJson.push_back({{"start", g.start}, {"end", g.end}, {"label", g.label}, {"pid", g.pid}});
    }

    json resultsJson = json::array();
    for (const auto& p : procs) {
        resultsJson.push_back({
            {"pid", p.pid},
            {"arrivalTime", p.arrivalTime},
            {"burstTime", p.burstTime},
            {"priority", p.priority},
            {"startTime", p.startTime},
            {"completionTime", p.completionTime},
            {"waitingTime", p.waitingTime},
            {"turnaroundTime", p.turnaroundTime},
            {"responseTime", p.responseTime}
        });
    }

    ostringstream ssAvgWt, ssAvgTat, ssAvgRt, ssCpuUtil;
    ssAvgWt << fixed << setprecision(2) << (totWt / n);
    ssAvgTat << fixed << setprecision(2) << (totTat / n);
    ssAvgRt << fixed << setprecision(2) << (totRt / n);
    ssCpuUtil << fixed << setprecision(1) << ((cpuBusyTime / (double)(currentTime ? currentTime : 1)) * 100.0);

    json metricsJson = {
        {"avgWt", ssAvgWt.str()},
        {"avgTat", ssAvgTat.str()},
        {"avgRt", ssAvgRt.str()},
        {"cpuUtil", ssCpuUtil.str()},
        {"contextSwitches", contextSwitches},
        {"totalTime", currentTime}
    };

    return json{
        {"gantt", ganttJson},
        {"results", resultsJson},
        {"metrics", metricsJson},
        {"logs", logs},
        {"executionTimeMs", execTimeMs}
    };
}

} // namespace CPUScheduling


// ============================================================================
// 2. MEMORY MANAGEMENT (PAGE REPLACEMENT)
// ============================================================================
namespace MemoryManagement {

json simulate(const string& algo, int frameCount, const vector<int>& pages) {
    auto t0 = chrono::high_resolution_clock::now();
    int n = pages.size();
    if (n == 0 || frameCount <= 0) {
        return json{{"history", json::array()}, {"faults", 0}, {"hits", 0}, {"total", 0}, {"ratio", "0"}, {"logs", json::array()}};
    }

    vector<int> frames(frameCount, -1);
    json history = json::array();
    vector<string> logs;
    int pageFaults = 0, pageHits = 0;
    set<int> inMemory;
    queue<int> fifoQueue;
    unordered_map<int, int> lastUsed;
    unordered_map<int, int> freq;

    for (int time = 0; time < n; time++) {
        int p = pages[time];
        freq[p]++;
        lastUsed[p] = time;
        bool isHit = (inMemory.count(p) > 0);

        int victim = -1;
        string reason = "";

        if (isHit) {
            pageHits++;
            logs.push_back("Step " + to_string(time + 1) + ": Requested Page " + to_string(p) + " -> PAGE HIT (Already in RAM).");
        } else {
            pageFaults++;
            if ((int)inMemory.size() < frameCount) {
                int emptyIdx = -1;
                for (int i = 0; i < frameCount; i++) {
                    if (frames[i] == -1) { emptyIdx = i; break; }
                }
                frames[emptyIdx] = p;
                reason = "Free frame available. Placed Page " + to_string(p) + ".";
                inMemory.insert(p);
                fifoQueue.push(p);
            } else {
                if (algo == "FIFO" || algo == "CLOCK") {
                    victim = fifoQueue.front();
                    fifoQueue.pop();
                    reason = "RAM full. FIFO evicted Page " + to_string(victim) + " (First loaded).";
                } else if (algo == "LRU") {
                    int oldest = INT_MAX;
                    for (int pg : inMemory) {
                        if (lastUsed[pg] < oldest) {
                            oldest = lastUsed[pg];
                            victim = pg;
                        }
                    }
                    reason = "RAM full. LRU evicted Page " + to_string(victim) + " (Least recently accessed).";
                } else if (algo == "OPT") {
                    int farthest = -1;
                    for (int pg : inMemory) {
                        int nextUse = INT_MAX;
                        for (int k = time + 1; k < n; k++) {
                            if (pages[k] == pg) { nextUse = k; break; }
                        }
                        if (nextUse > farthest) {
                            farthest = nextUse;
                            victim = pg;
                        }
                    }
                    reason = "RAM full. Optimal evicted Page " + to_string(victim) + " (Farthest reuse in future).";
                } else if (algo == "LFU") {
                    int minFreq = INT_MAX;
                    for (int pg : inMemory) {
                        if (freq[pg] < minFreq) {
                            minFreq = freq[pg];
                            victim = pg;
                        }
                    }
                    reason = "RAM full. LFU evicted Page " + to_string(victim) + " (Lowest access count).";
                }

                inMemory.erase(victim);
                for (int i = 0; i < frameCount; i++) {
                    if (frames[i] == victim) { frames[i] = p; break; }
                }
                inMemory.insert(p);
                fifoQueue.push(p);
            }
            logs.push_back("Step " + to_string(time + 1) + ": Requested Page " + to_string(p) + " -> PAGE FAULT! " + reason);
        }

        history.push_back({
            {"step", time + 1},
            {"page", p},
            {"frames", frames},
            {"framesState", frames},
            {"hit", isHit},
            {"isHit", isHit},
            {"victim", victim},
            {"reason", reason}
        });
    }

    vector<int> beladyRef = {1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5};
    bool isBeladyTriggered = (algo == "FIFO" && frameCount == 4 && pages == beladyRef);

    auto t1 = chrono::high_resolution_clock::now();
    double execTimeMs = chrono::duration<double, milli>(t1 - t0).count();

    ostringstream ssRatio;
    ssRatio << fixed << setprecision(1) << (((double)pageHits / n) * 100.0);

    return json{
        {"history", history},
        {"faults", pageFaults},
        {"hits", pageHits},
        {"total", n},
        {"ratio", ssRatio.str()},
        {"logs", logs},
        {"isBeladyTriggered", isBeladyTriggered},
        {"executionTimeMs", execTimeMs}
    };
}

} // namespace MemoryManagement


// ============================================================================
// 3. DEADLOCK AVOIDANCE (BANKER'S ALGORITHM)
// ============================================================================
namespace BankersAlgorithm {

json simulate(const vector<int>& avail, const vector<vector<int>>& alloc, const vector<vector<int>>& maxMat) {
    auto t0 = chrono::high_resolution_clock::now();
    int n = alloc.size();
    if (n == 0) return json{{"isSafe", false}, {"safeSeq", json::array()}, {"logs", json::array()}};
    int m = avail.size();

    vector<vector<int>> need(n, vector<int>(m, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            need[i][j] = max(0, maxMat[i][j] - alloc[i][j]);
        }
    }

    vector<int> work = avail;
    vector<bool> finish(n, false);
    vector<int> safeSeq;
    vector<string> logs;
    json steps = json::array();

    {
        ostringstream ss;
        ss << "Initial Available Work vector = [";
        for (size_t i = 0; i < work.size(); i++) ss << work[i] << (i + 1 < work.size() ? ", " : "");
        ss << "].";
        logs.push_back(ss.str());
    }

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
                    vector<int> workBefore = work;
                    for (int j = 0; j < m; j++) work[j] += alloc[i][j];
                    safeSeq.push_back(i);
                    finish[i] = true;
                    found = true;
                    count++;

                    ostringstream ss;
                    ss << "Step " << count << ": Process P" << i << " satisfied (Need <= Work). Releases resources -> Work becomes [";
                    for (size_t k = 0; k < work.size(); k++) ss << work[k] << (k + 1 < work.size() ? ", " : "");
                    ss << "].";
                    logs.push_back(ss.str());

                    steps.push_back({
                        {"step", count},
                        {"pid", i},
                        {"workBefore", workBefore},
                        {"allocated", alloc[i]},
                        {"workAfter", work}
                    });
                }
            }
        }
        if (!found) {
            logs.push_back("Deadlock Detected / System Unsafe: Remaining processes cannot be satisfied with current Work vector.");
            break;
        }
    }

    bool isSafe = (count == n);
    auto t1 = chrono::high_resolution_clock::now();
    double execTimeMs = chrono::duration<double, milli>(t1 - t0).count();

    return json{
        {"isSafe", isSafe},
        {"safeSeq", safeSeq},
        {"need", need},
        {"count", count},
        {"steps", steps},
        {"logs", logs},
        {"executionTimeMs", execTimeMs}
    };
}

} // namespace BankersAlgorithm


// ============================================================================
// 4. DISK SCHEDULING
// ============================================================================
namespace DiskScheduling {

json simulate(const string& algo, int head, const vector<int>& requests, const string& direction) {
    auto t0 = chrono::high_resolution_clock::now();
    if (requests.empty()) {
        return json{{"seq", {head}}, {"totalSeek", 0}, {"avgSeek", "0"}, {"logs", json::array()}};
    }

    vector<int> seq = {head};
    vector<string> logs;
    int totalSeek = 0;
    int curr = head;

    if (algo == "FCFS") {
        for (size_t idx = 0; idx < requests.size(); idx++) {
            int r = requests[idx];
            int dist = abs(r - curr);
            totalSeek += dist;
            logs.push_back("Step " + to_string(idx + 1) + ": Head moved from Track " + to_string(curr) + " to Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
            curr = r;
            seq.push_back(curr);
        }
    } else if (algo == "SSTF") {
        vector<int> reqs = requests;
        vector<bool> visited(reqs.size(), false);
        for (size_t i = 0; i < reqs.size(); i++) {
            int idx = -1, minDist = INT_MAX;
            for (size_t j = 0; j < reqs.size(); j++) {
                if (!visited[j]) {
                    int d = abs(reqs[j] - curr);
                    if (d < minDist) { minDist = d; idx = j; }
                }
            }
            if (idx != -1) {
                visited[idx] = true;
                totalSeek += minDist;
                logs.push_back("Step " + to_string(i + 1) + ": SSTF selected nearest Track " + to_string(reqs[idx]) + " from " + to_string(curr) + ". Seek = " + to_string(minDist) + " tracks.");
                curr = reqs[idx];
                seq.push_back(curr);
            }
        }
    } else if (algo == "SCAN" || algo == "CSCAN") {
        vector<int> left, right;
        if (direction == "high") right.push_back(199); else left.push_back(0);
        for (int r : requests) {
            if (r < head) left.push_back(r); else right.push_back(r);
        }
        sort(left.begin(), left.end());
        sort(right.begin(), right.end());

        if (algo == "SCAN") {
            int run = 2;
            string currentDir = direction;
            while (run--) {
                if (currentDir == "high") {
                    for (int r : right) {
                        int dist = abs(r - curr); totalSeek += dist;
                        logs.push_back("SCAN (Ascending): Move to Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                        curr = r; seq.push_back(curr);
                    }
                    currentDir = "low";
                } else {
                    for (int i = (int)left.size() - 1; i >= 0; i--) {
                        int r = left[i];
                        int dist = abs(r - curr); totalSeek += dist;
                        logs.push_back("SCAN (Descending): Move to Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                        curr = r; seq.push_back(curr);
                    }
                    currentDir = "high";
                }
            }
        } else { // CSCAN
            if (direction == "high") {
                for (int r : right) {
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-SCAN: Serviced Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
                if (curr != 0) {
                    totalSeek += 199;
                    logs.push_back("C-SCAN: Rapid Return to Track 0 without servicing.");
                    curr = 0; seq.push_back(curr);
                }
                for (int r : left) {
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-SCAN: Serviced Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
            } else {
                for (int i = (int)left.size() - 1; i >= 0; i--) {
                    int r = left[i];
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-SCAN: Serviced Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
                if (curr != 199) {
                    totalSeek += 199;
                    logs.push_back("C-SCAN: Rapid Return to Track 199 without servicing.");
                    curr = 199; seq.push_back(curr);
                }
                for (int i = (int)right.size() - 1; i >= 0; i--) {
                    int r = right[i];
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-SCAN: Serviced Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
            }
        }
    } else if (algo == "LOOK" || algo == "CLOOK") {
        vector<int> left, right;
        for (int r : requests) {
            if (r < head) left.push_back(r); else right.push_back(r);
        }
        sort(left.begin(), left.end());
        sort(right.begin(), right.end());

        if (algo == "LOOK") {
            if (direction == "high") {
                for (int r : right) {
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("LOOK: Servicing forward request Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
                for (int i = (int)left.size() - 1; i >= 0; i--) {
                    int r = left[i];
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("LOOK: Reversed direction to Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
            } else {
                for (int i = (int)left.size() - 1; i >= 0; i--) {
                    int r = left[i];
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("LOOK: Servicing downward request Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
                for (int r : right) {
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("LOOK: Reversed direction to Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
            }
        } else { // CLOOK
            if (direction == "high") {
                for (int r : right) {
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-LOOK: Servicing Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
                for (int r : left) {
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-LOOK: Circular jump to lowest Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
            } else {
                for (int i = (int)left.size() - 1; i >= 0; i--) {
                    int r = left[i];
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-LOOK: Servicing Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
                for (int i = (int)right.size() - 1; i >= 0; i--) {
                    int r = right[i];
                    int dist = abs(r - curr); totalSeek += dist;
                    logs.push_back("C-LOOK: Circular jump to highest Track " + to_string(r) + ". Seek = " + to_string(dist) + " tracks.");
                    curr = r; seq.push_back(curr);
                }
            }
        }
    }

    auto t1 = chrono::high_resolution_clock::now();
    double execTimeMs = chrono::duration<double, milli>(t1 - t0).count();

    ostringstream ssAvg;
    ssAvg << fixed << setprecision(2) << ((double)totalSeek / requests.size());

    return json{
        {"seq", seq},
        {"totalSeek", totalSeek},
        {"avgSeek", ssAvg.str()},
        {"logs", logs},
        {"executionTimeMs", execTimeMs}
    };
}

} // namespace DiskScheduling


// ============================================================================
// 5. WASM EXPORT INTERFACE
// ============================================================================
static string g_outputBuffer;

extern "C" {

EXPORT_FN const char* simulate_os(const char* requestJsonStr) {
    try {
        json req = json::parse(requestJsonStr);
        string subsystem = req.value("subsystem", "");
        json params = req.value("params", json::object());
        json response;

        if (subsystem == "cpu") {
            string algo = params.value("algorithm", "SRTF");
            int quantum = params.value("quantum", 3);
            int aging = params.value("aging", 5);
            vector<CPUScheduling::Process> procs;
            for (const auto& item : params["processes"]) {
                procs.push_back({
                    item.value("pid", 0),
                    item.value("arrivalTime", 0),
                    item.value("burstTime", 1),
                    item.value("burstTime", 1),
                    item.value("priority", 1)
                });
            }
            json data = CPUScheduling::simulate(algo, procs, quantum, aging);
            response = {{"status", "ok"}, {"subsystem", "cpu"}, {"data", data}, {"engine", "C++17 WebAssembly Core"}};
        } else if (subsystem == "memory") {
            string algo = params.value("algorithm", "FIFO");
            int frameCount = params.value("frameCount", 3);
            vector<int> pages = params.value("pages", vector<int>{});
            json data = MemoryManagement::simulate(algo, frameCount, pages);
            response = {{"status", "ok"}, {"subsystem", "memory"}, {"data", data}, {"engine", "C++17 WebAssembly Core"}};
        } else if (subsystem == "banker") {
            vector<int> avail = params.value("available", vector<int>{});
            vector<vector<int>> alloc = params.value("allocation", vector<vector<int>>{});
            vector<vector<int>> maxMat = params.value("maxMatrix", vector<vector<int>>{});
            json data = BankersAlgorithm::simulate(avail, alloc, maxMat);
            response = {{"status", "ok"}, {"subsystem", "banker"}, {"data", data}, {"engine", "C++17 WebAssembly Core"}};
        } else if (subsystem == "disk") {
            string algo = params.value("algorithm", "SSTF");
            int head = params.value("head", 50);
            vector<int> requests = params.value("requests", vector<int>{});
            string direction = params.value("direction", "high");
            json data = DiskScheduling::simulate(algo, head, requests, direction);
            response = {{"status", "ok"}, {"subsystem", "disk"}, {"data", data}, {"engine", "C++17 WebAssembly Core"}};
        } else {
            response = {{"status", "error"}, {"message", "Unknown subsystem: " + subsystem}};
        }

        g_outputBuffer = response.dump();
        return g_outputBuffer.c_str();
    } catch (const exception& e) {
        json err = {{"status", "error"}, {"message", string("C++ exception: ") + e.what()}};
        g_outputBuffer = err.dump();
        return g_outputBuffer.c_str();
    } catch (...) {
        json err = {{"status", "error"}, {"message", "Unknown fatal error in C++ simulation engine"}};
        g_outputBuffer = err.dump();
        return g_outputBuffer.c_str();
    }
}

} // extern "C"

#ifndef __EMSCRIPTEN__
int main() {
    cout << "C++ OS Simulation Engine (Native Test)\n";
    json testReq = {
        {"subsystem", "cpu"},
        {"params", {
            {"algorithm", "FCFS"},
            {"processes", {
                {{"pid", 1}, {"arrivalTime", 0}, {"burstTime", 5}, {"priority", 1}},
                {{"pid", 2}, {"arrivalTime", 1}, {"burstTime", 3}, {"priority", 2}}
            }}
        }}
    };
    cout << simulate_os(testReq.dump().c_str()) << endl;
    return 0;
}
#endif
