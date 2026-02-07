import { describe, it, expect } from 'vitest';
import { InferenceSession, Tensor } from 'onnxruntime-web';
import {encodeState, runInference} from '../utils/inference.js';
import path from 'path';
import {OrderChaosGame} from "../utils/OrderChaosGame.js";

// Integration test: load the real ONNX model and run inference once.
// Something is off, always gives the same value
describe('inference integration (real ONNX model)', () => {
  it('loads model and returns policy and value with expected shapes', async () => {
    // Build a simple board
    const board = [
      ['❌','❌','❌',null,'⭕'],
      ['⭕','⭕','⭕','❌',null],
      [null,'❌','⭕','⭕',null],
        [null,null,'❌','❌',null],
      [null,'⭕',null,'❌',null]
    ];

    const game = new OrderChaosGame();
      game.board = board
      game.currentPlayer = "ORDER";

    // Absolute path to the ONNX model in frontend/public
    const modelPath = path.resolve(process.cwd(), 'public', 'maxwells_demon.onnx');

    const outputs = await runInference(game, modelPath)
    // Expect outputs to contain policy and value as per your export
    expect(outputs).toHaveProperty('policy');
    expect(outputs).toHaveProperty('value');

    const policyData = outputs.policy.data;
    const valueData = outputs.value.data;

    // Print outputs so you can see them in the test console
    console.log('len ONNX policy:', policyData.length);
    console.log('ONNX value:', valueData[0]);

    // Policy should have 25 logits (one per board cell), value should be a scalar
    expect(policyData.length).toBeGreaterThanOrEqual(25);
    expect(valueData.length).toBeGreaterThanOrEqual(1);
  }, 20000); // increase timeout for wasm model load
});
