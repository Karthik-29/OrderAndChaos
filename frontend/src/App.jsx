import { useEffect, useState } from "react";
import { evaluateGame } from "./utils/gameEvaluator.js";
import { runMCTS } from "./utils/runMCTS.js";
import { OrderChaosGame } from "./utils/OrderChaosGame.js";
import "./App.css";

const SIZE = 5;
const HUMAN_PLAYER = "CHAOS";
const AI_PLAYER = HUMAN_PLAYER === "ORDER" ? "CHAOS" : "ORDER";
const X_SYMBOL = "\u274C";
const O_SYMBOL = "\u2B55";

function emptyBoard() {
    return Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => null)
    );
}

function cloneBoard(board) {
    return board.map((row) => row.slice());
}

export default function App() {
    const [board, setBoard] = useState(emptyBoard);
    // history stores moves as diffs:
    // { row: number, col: number, prevValue: string|null, previousPlayer: "ORDER"|"CHAOS" }
    const [history, setHistory] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState("ORDER");
    const [selectedSymbol, setSelectedSymbol] = useState(X_SYMBOL);
    const [gameState, setGameState] = useState("ONGOING");
    const [isAiThinking, setIsAiThinking] = useState(false);

    async function runAiTurn(currentBoard) {
        try {
            setIsAiThinking(true);

            const aiGame = new OrderChaosGame();
            aiGame.board = cloneBoard(currentBoard);
            aiGame.player = AI_PLAYER === "ORDER" ? 1 : -1;

            const aiActionIndex = await runMCTS(aiGame);
            const { row: aiRow, col: aiCol, symbol: aiSymbol } = aiGame.indexToAction(aiActionIndex);

            if (currentBoard[aiRow][aiCol] !== null) {
                throw new Error("AI selected an invalid move");
            }

            const afterAiMove = currentBoard.map((r, i) =>
                r.map((cell, j) => (i === aiRow && j === aiCol ? aiSymbol : cell))
            );

            setHistory((prev) => [
                ...prev,
                { row: aiRow, col: aiCol, prevValue: currentBoard[aiRow][aiCol], previousPlayer: AI_PLAYER },
            ]);
            setBoard(afterAiMove);
            setCurrentPlayer(HUMAN_PLAYER);

            const aiResult = evaluateGame(afterAiMove);
            setGameState(aiResult.state);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAiThinking(false);
        }
    }

    async function handleClick(row, col) {
        if (isAiThinking) return;
        if (gameState !== "ONGOING") return;
        if (currentPlayer !== HUMAN_PLAYER) return;
        if (board[row][col] !== null) return;

        const next = board.map((r, i) =>
            r.map((cell, j) => (i === row && j === col ? selectedSymbol : cell))
        );

        setHistory((prev) => [
            ...prev,
            { row, col, prevValue: board[row][col], previousPlayer: currentPlayer },
        ]);
        setBoard(next);

        const humanResult = evaluateGame(next);
        setGameState(humanResult.state);
        if (humanResult.state !== "ONGOING") {
            return;
        }

        setCurrentPlayer(AI_PLAYER);
    }

    useEffect(() => {
        if (currentPlayer !== AI_PLAYER) return;
        if (gameState !== "ONGOING") return;
        if (isAiThinking) return;
        void runAiTurn(board);
    }, [board, currentPlayer, gameState, isAiThinking]);

    function handleUndo() {
        if (isAiThinking) return;

        setHistory((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            const newHistory = prev.slice(0, -1);

            setBoard((b) => {
                const copy = b.map((r) => r.slice());
                copy[last.row][last.col] = last.prevValue;
                return copy;
            });
            setCurrentPlayer(last.previousPlayer);
            setGameState("ONGOING");

            return newHistory;
        });
    }

    return (
        <div className="app">
            <h2>Order & Chaos</h2>
            <p className="status-line">
                Turn: <strong>{currentPlayer}</strong>
            </p>
            <p className="status-line">
                You are <strong>{HUMAN_PLAYER}</strong>. AI is <strong>{AI_PLAYER}</strong>.
                {isAiThinking ? " AI is thinking..." : ""}
            </p>

            <div className="control-row">
                <button
                    onClick={handleUndo}
                    disabled={history.length === 0 || isAiThinking}
                    style={{ marginRight: 12 }}
                >
                    Undo
                </button>

                <span>Symbol: </span>
                <button
                    onClick={() => setSelectedSymbol(X_SYMBOL)}
                    disabled={isAiThinking || currentPlayer !== HUMAN_PLAYER || gameState !== "ONGOING"}
                    className={selectedSymbol === X_SYMBOL ? "symbol-btn selected" : "symbol-btn"}
                    style={{ marginRight: 6 }}
                >
                    {X_SYMBOL}
                </button>
                <button
                    onClick={() => setSelectedSymbol(O_SYMBOL)}
                    disabled={isAiThinking || currentPlayer !== HUMAN_PLAYER || gameState !== "ONGOING"}
                    className={selectedSymbol === O_SYMBOL ? "symbol-btn selected" : "symbol-btn"}
                >
                    {O_SYMBOL}
                </button>
            </div>

            <div className="game-layout">
                <div className="board-section">
                    <div
                        className="board-grid"
                        style={{
                            gridTemplateColumns: `repeat(${SIZE}, var(--cell-size))`,
                        }}
                    >
                        {board.map((row, i) =>
                            row.map((cell, j) => (
                                <button
                                    key={`${i}-${j}`}
                                    onClick={() => handleClick(i, j)}
                                    disabled={
                                        isAiThinking ||
                                        gameState !== "ONGOING" ||
                                        currentPlayer !== HUMAN_PLAYER ||
                                        cell !== null
                                    }
                                    className="board-cell"
                                    style={{
                                        cursor:
                                            isAiThinking ||
                                            gameState !== "ONGOING" ||
                                            currentPlayer !== HUMAN_PLAYER ||
                                            cell !== null
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
                                >
                                    {cell}
                                </button>
                            ))
                        )}
                    </div>
                    <p className="status-line">
                        Game status: <strong>{gameState.replace("_", " ")}</strong>
                    </p>
                </div>


                <aside className="rules-card" aria-label="Rules">
                    <h3>Rules</h3>
                    <ul>
                        <li>Order tries to get 4 in a row, column, or diagonal of either {X_SYMBOL} or {O_SYMBOL}.</li>
                        <li>Chaos tries to stop Order from achieving this goal.</li>
                        <li>Both players can use both symbols ({X_SYMBOL}, {O_SYMBOL}). Order always starts the game.</li>
                        <li>
                            Chaos wins when all 25 squares are filled without Order getting 4 in a row,
                            column, or diagonal of either symbol.
                        </li>
                    </ul>
                    <p className="rules-note">Note: for now, the computer always plays as Order.</p>
                </aside>
            </div>


        </div>
    );
}
