import createOSEngine from './os_engine.js';

let wasmModulePromise = null;
let wasmModuleInstance = null;

export async function getOSEngine() {
  if (wasmModuleInstance) return wasmModuleInstance;
  if (!wasmModulePromise) {
    wasmModulePromise = createOSEngine().then((mod) => {
      wasmModuleInstance = mod;
      return mod;
    });
  }
  return wasmModulePromise;
}

export function isWasmReady() {
  return wasmModuleInstance !== null;
}

export async function invokeNativeSimulation(subsystem, params) {
  const engine = await getOSEngine();
  const requestPayload = JSON.stringify({ subsystem, params });
  const rawResponse = engine.ccall('simulate_os', 'string', ['string'], [requestPayload]);
  return JSON.parse(rawResponse);
}

export async function runCpuSimulation(algorithm, processes, quantum, aging) {
  const resp = await invokeNativeSimulation('cpu', {
    algorithm,
    processes,
    quantum: parseInt(quantum) || 3,
    aging: parseInt(aging) || 5,
  });
  return resp;
}

export async function runMemorySimulation(algorithm, frameCount, pages) {
  const resp = await invokeNativeSimulation('memory', {
    algorithm,
    frameCount: parseInt(frameCount) || 3,
    pages,
  });
  return resp;
}

export async function runBankerSimulation(available, allocation, maxMatrix) {
  const resp = await invokeNativeSimulation('banker', {
    available,
    allocation,
    maxMatrix,
  });
  return resp;
}

export async function runDiskSimulation(algorithm, head, requests, direction) {
  const resp = await invokeNativeSimulation('disk', {
    algorithm,
    head: parseInt(head) || 50,
    requests,
    direction: direction || 'high',
  });
  return resp;
}

