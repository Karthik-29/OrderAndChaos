import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock onnxruntime-web before importing the implementation so the module import in
// `inference.js` receives the mocked exports.
vi.mock('onnxruntime-web', () => {
  const mockCreate = vi.fn();
  class Tensor {
    constructor(type, data, dims) {
      this.type = type;
      this.data = data;
      this.dims = dims;
    }
  }
  return { InferenceSession: { create: mockCreate }, Tensor };
});

import { InferenceSession } from 'onnxruntime-web';
import { encodeState, runInference } from '../utils/inference.js';

describe('inference utilities', () => {
  beforeEach(() => {
    InferenceSession.create.mockReset();
  });

  it('encodeState constructs 4 plane tensor with correct counts', () => {
    const board = [
      ['❌','⭕',null,null,null],
      [null,null,null,null,null],
      [null,null,'❌',null,null],
      [null,null,null,null,'⭕'],
      [null,null,null,null,null]
    ];

    const arr = encodeState(board, 'ORDER');
    expect(arr).toHaveLength(100);

    const sum = (start, end) => {
      let s = 0;
      for (let i = start; i < end; i++) s += arr[i];
      return s;
    };

    expect(sum(0,25)).toBe(2);      // xPlane
    expect(sum(25,50)).toBe(2);     // oPlane
    expect(sum(50,75)).toBe(21);    // emptyPlane
    expect(sum(75,100)).toBe(25);   // turnPlane (ORDER -> 1)
  });

  it('runInference loads session and calls run with Tensor containing encoded data', async () => {
    const board = [
      ['❌','⭕',null,null,null],
      [null,null,null,null,null],
      [null,null,'❌',null,null],
      [null,null,null,null,'⭕'],
      [null,null,null,null,null]
    ];

    const mockRun = vi.fn().mockResolvedValue({ policy: { data: new Float32Array([0.1]) }, value: { data: new Float32Array([0.5]) } });
    InferenceSession.create.mockResolvedValue({ run: mockRun });

    const res = await runInference(board, 'ORDER');

    expect(InferenceSession.create).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledTimes(1);

    const calledArg = mockRun.mock.calls[0][0];
    expect(calledArg).toHaveProperty('board');
    expect(calledArg.board).toHaveProperty('data');

    const expected = encodeState(board, 'ORDER');
    expect(Array.from(calledArg.board.data)).toEqual(Array.from(expected));

    // The mocked session returns policy and value outputs per your ONNX export
    expect(res).toHaveProperty('policy');
    expect(res).toHaveProperty('value');
    expect(Array.from(res.policy.data)).toEqual(Array.from(new Float32Array([0.1])));
    expect(Array.from(res.value.data)).toEqual(Array.from(new Float32Array([0.5])));
  });
});