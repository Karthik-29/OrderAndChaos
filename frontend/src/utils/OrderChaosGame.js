import { evaluateGame } from "./gameEvaluator"

export class OrderChaosGame {
    constructor() {
        this.boardSize = 5;
        this.board = Array.from({length: this.boardSize}, () =>
            Array.from({length: this.boardSize}, () => null)
        );
        this.currentPlayer = "ORDER";
    }

    clone() {
        const newGame = new OrderChaosGame();
        newGame.board = this.board.map(row => row.slice());
        newGame.currentPlayer = this.currentPlayer;
        return newGame;
    }

    legalActions() {
        const actions = []
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] === null) {
                    actions.push(this.actionToIndex(r,c, '❌'))
                    actions.push(this.actionToIndex(r,c, '⭕'))
                }
            }
        }
        return actions
    }

    actionToIndex(row, col, symbol){
        const sym = symbol === "❌"? 1 : 0;
        return 10*row + 2*col + sym
    }

    indexToAction(action_index) {
        const row = Math.floor(action_index / (2*this.boardSize));
        const col = Math.floor((action_index % (2*this.boardSize)) / 2);
        const symbol = action_index % 2 === 0 ? "❌" : "⭕";
        return {row, col, symbol};
    }

    applyAction(action_index) {
        const {row, col, symbol} = this.indexToAction(action_index);
        if (this.board[row][col] !== null) {
            throw new Error("Invalid action: cell is not empty");
        }
        this.board[row][col] = symbol;
        this.currentPlayer = this.currentPlayer === "ORDER" ? "CHAOS" : "ORDER";
    }

    terminal() {
        const result = evaluateGame(this.board);
        return { isTerminal: result.state !== "ONGOING", state: result.state };
    }

}