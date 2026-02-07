import { describe, it, expect } from 'vitest';
import {runMCTS} from "../utils/runMCTS.js";
import {OrderChaosGame} from "../utils/OrderChaosGame.js";
import path from "path";

describe('index to action for index 11', () => {
    it("should be { row: 1, col: 0, symbol: '⭕' }", () => {
        const game = new OrderChaosGame()
        let actionIndex = 11
        let action = game.indexToAction(actionIndex)
        console.log("action:", action)
        expect(action).toEqual({ row: 1, col: 0, symbol: '⭕' })
    })
});

describe('for a nearly winning state', () => {
    it('test if the right move is picked', async () => {
        const board = [
            [null,null,null,null,'❌'],
            [null,'⭕','⭕','⭕','❌'],
            [null,null,null,null,null],
            ['❌',null,null,null,null],
            [null,null,null,null,null],
        ]; // action_id = 11 is winning

        const modelPath = path.resolve(process.cwd(), 'public', 'maxwells_demon.onnx');
        const game = new OrderChaosGame()
        game.board = board;
        const action_index = await runMCTS(game, 100, 1, modelPath)

        game.applyAction(action_index)
        console.log("board after action:",game.board)

        expect(game.indexToAction(action_index)).toEqual({ row: 1, col: 0, symbol: '⭕' })

    }, 2000);
})