import * as ort from "onnxruntime-web";
import {OrderChaosGame} from "./OrderChaosGame.js";


export function encodeState(game) {
    const size = game.boardSize;
    const board = game.board;
    const currentPlayer = game.getCurrentPlayer(); // 1 or -1

    const xPlane = new Float32Array(size * size);
    const oPlane = new Float32Array(size * size);
    const emptyPlane = new Float32Array(size * size);
    const turnPlane = new Float32Array(size * size);

    const turnValue = currentPlayer === 1 ? 1.0 : 0.0;

    let idx = 0;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = board[r][c];

            if (cell === "❌") {
                xPlane[idx] = 1.0;
            } else if (cell === "⭕") {
                oPlane[idx] = 1.0;
            } else {
                emptyPlane[idx] = 1.0;
            }

            turnPlane[idx] = turnValue;
            idx++;
        }
    }

    const stacked = new Float32Array(4 * size * size);
    stacked.set(xPlane, 0);
    stacked.set(oPlane, size * size);
    stacked.set(emptyPlane, 2 * size * size);
    stacked.set(turnPlane, 3 * size * size);

    return stacked;
}

let session = null;
let loadedModelPath = null;
let ortConfigured = false;

function configureOrtForBrowser() {
    if (ortConfigured) return;
    if (typeof window === "undefined") return;

    // Resolve ORT wasm binaries from a valid absolute prefix in browser.
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";
    ortConfigured = true;
}

export async function loadModel(modelPath)
{
    if (session && loadedModelPath === modelPath) return session;
    configureOrtForBrowser();
    session = await ort.InferenceSession.create(modelPath, { executionProviders: ["wasm"] });
    loadedModelPath = modelPath;
    return session;
}

export function resetInferenceSession() {
    session = null;
    loadedModelPath = null;
}

export async function runInference(game = new OrderChaosGame(), modelPath) {
    const inputData = encodeState(game);
    const session = await loadModel(modelPath);
    const tensor = new ort.Tensor( "float32", inputData, [1, 4, 5, 5] );
    return await session.run({ board: tensor });
}
