import { InferenceSession, Tensor } from "onnxruntime-web";
import {OrderChaosGame} from "./OrderChaosGame.js";


export function encodeState(game = new OrderChaosGame()) {
    const size = game.boardSize
    const board = game.board
    const currentPlayer = game.currentPlayer;

    const xPlane = new Float32Array(size * size);
    const oPlane = new Float32Array(size * size);
    const emptyPlane = new Float32Array(size * size);
    const turnPlane = new Float32Array(size * size);

    const turnValue = currentPlayer === "ORDER" ? 1.0 : 0.0;

    let idx = 0;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = board[r][c];

            if (cell === "❌") {
                xPlane[idx] = 1;
            } else if (cell === "⭕") {
                oPlane[idx] = 1;
            } else {
                emptyPlane[idx] = 1;
            }

            turnPlane[idx] = turnValue;
            idx++;
        }
    }

    // Stack channels: [4, 5, 5] → flattened
    const stacked = new Float32Array(4 * size * size);
    stacked.set(xPlane, 0);
    stacked.set(oPlane, 25);
    stacked.set(emptyPlane, 50);
    stacked.set(turnPlane, 75);

    return stacked;
}

let session = null;

export async function loadModel(modelPath)
{
    if (session) return session;
    session = await InferenceSession.create(modelPath, { executionProviders: ["wasm"] });
    return session;
}

export async function runInference(game = new OrderChaosGame(), modelPath) {
    const inputData = encodeState(game);
    const session = await loadModel(modelPath);
    const tensor = new Tensor( "float32", inputData, [1, 4, 5, 5] );
    return await session.run({ board: tensor });
}