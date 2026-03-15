import { evaluateGame } from "./gameEvaluator"

export class OrderChaosGame {
    constructor() {
        this.boardSize = 5;
        this.board = Array.from({ length: this.boardSize }, () =>
            Array.from({ length: this.boardSize }, () => null)
        );

        // 1 = ORDER, -1 = CHAOS
        this.player = 1;
    }

    clone() {
        const newGame = new OrderChaosGame();
        newGame.board = this.board.map(row => row.slice());
        newGame.player = this.player;
        return newGame;
    }

    getCurrentPlayer() {
        return this.player;   // 1 or -1
    }

    legalActions() {
        const actions = [];
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] === null) {
                    actions.push(this.actionToIndex(r, c, "❌"));
                    actions.push(this.actionToIndex(r, c, "⭕"));
                }
            }
        }
        return actions;
    }

    actionToIndex(row, col, symbol) {
        // symbol: "❌" = +1, "⭕" = 0
        const sym = symbol === "❌" ? 0 : 1;
        return row * 10 + col * 2 + sym;
    }

    indexToAction(action_index) {
        const row = Math.floor(action_index / 10);
        const col = Math.floor((action_index % 10) / 2);

        // even → +1 → ❌
        const symbol = action_index % 2 === 0 ? "❌" : "⭕";

        return { row, col, symbol };
    }

    applyAction(action_index) {
        const { row, col, symbol } = this.indexToAction(action_index);

        if (this.board[row][col] !== null) {
            throw new Error("Invalid action: cell is not empty");
        }

        this.board[row][col] = symbol;

        // Toggle player
        this.player *= -1;
    }

    isTerminal() {
        const result = evaluateGame(this.board);

        if (result.state === "ORDER_WINS") {
            return { terminal: true, winner: 1 };
        }

        if (result.state === "CHAOS_WINS") {
            return { terminal: true, winner: -1 };
        }

        return { terminal: false, winner: 0 };
    }
}