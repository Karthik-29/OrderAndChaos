import { useState } from "react";

const SIZE = 5;

function emptyBoard() {
    return Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => null)
    );
}

async function evaluateBoard(board) {
    const res = await fetch("http://localhost:8787/evaluate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ board }),
    });

    if (!res.ok) {
        throw new Error("Failed to evaluate board");
    }

    return res.json();
}


export default function App() {
    const [board, setBoard] = useState(emptyBoard);
    // history now stores only the last moves as diffs:
    // { row: number, col: number, prevValue: string|null, previousPlayer: "ORDER"|"CHAOS" }
    const [history, setHistory] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState("ORDER");
    const [selectedSymbol, setSelectedSymbol] = useState("❌");
    const [gameState, setGameState] = useState("ONGOING"); // "ONGOING", "ORDER_WINS", "CHAOS_WINS"

    async function handleClick(row, col) {
        if (board[row][col] !== null) return;

        // push only the minimal undo info for this move
        setHistory((prev) => [
            ...prev,
            {row, col, prevValue: board[row][col], previousPlayer: currentPlayer},
        ]);

        const next = board.map((r, i) =>
            r.map((cell, j) => (i === row && j === col ? selectedSymbol : cell))
        );

        setBoard(next);
        setCurrentPlayer((p) => (p === "ORDER" ? "CHAOS" : "ORDER"));

        try {
            const result = await evaluateBoard(next);

            if (result.state === "ORDER_WINS") {
                console.log("Order wins");
                // show modal / disable board / etc.
            } else if (result.state === "CHAOS_WINS") {
                console.log("Chaos wins");
            }
            setGameState(result.state);

        } catch (err) {
            console.error(err);
        }

    }

    function handleUndo() {
        setHistory((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            const newHistory = prev.slice(0, -1);

            // restore only the changed cell and the previous player
            setBoard((b) => {
                const copy = b.map((r) => r.slice());
                copy[last.row][last.col] = last.prevValue;
                return copy;
            });
            setCurrentPlayer(last.previousPlayer);

            return newHistory;
        });
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Order & Chaos</h2>
            <p>
                Turn: <strong>{currentPlayer}</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
                <button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    style={{ marginRight: 12 }}
                >
                    Undo
                </button>

                <span>Symbol: </span>
                <button
                    onClick={() => setSelectedSymbol("❌")}
                    style={{
                        fontWeight: selectedSymbol === "❌" ? "bold" : "normal",
                        marginRight: 6,
                    }}
                >
                    ❌
                </button>
                <button
                    onClick={() => setSelectedSymbol("⭕")}
                    style={{
                        fontWeight: selectedSymbol === "⭕" ? "bold" : "normal",
                    }}
                >
                    ⭕
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
                            style={{
                                width: 60,
                                height: 60,
                                fontSize: 24,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
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
