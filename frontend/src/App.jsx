import { useEffect, useState } from "react";
import { evaluateGame } from "./utils/gameEvaluator.js";
import { runMCTS } from "./utils/runMCTS.js";
import { OrderChaosGame } from "./utils/OrderChaosGame.js";

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
        <div style={{ padding: 20 }}>
            <h2>Order & Chaos</h2>
            <p>
                Turn: <strong>{currentPlayer}</strong>
            </p>
            <p>
                You are <strong>{HUMAN_PLAYER}</strong>. AI is <strong>{AI_PLAYER}</strong>.
                {isAiThinking ? " AI is thinking..." : ""}
            </p>

            <div style={{ marginBottom: 12 }}>
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
                    style={{
                        fontWeight: selectedSymbol === X_SYMBOL ? "bold" : "normal",
                        marginRight: 6,
                    }}
                >
                    {X_SYMBOL}
                </button>
                <button
                    onClick={() => setSelectedSymbol(O_SYMBOL)}
                    disabled={isAiThinking || currentPlayer !== HUMAN_PLAYER || gameState !== "ONGOING"}
                    style={{
                        fontWeight: selectedSymbol === O_SYMBOL ? "bold" : "normal",
                    }}
                >
                    {O_SYMBOL}
                </button>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${SIZE}, 60px)`,
                    gap: 6,
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
                            style={{
                                width: 60,
                                height: 60,
                                fontSize: 24,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
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
            <p>
                Game status: <strong>{gameState}</strong>
            </p>
        </div>
    );
}
