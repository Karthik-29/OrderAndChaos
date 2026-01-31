type Player = "ORDER" | "CHAOS"

export type GameStatus =
    | { state: "ORDER_WINS" }
    | { state: "CHAOS_WINS" }
    | { state: "ONGOING" }

type Board = (string | null)[][]

const BOARD_SIZE = 5
const WIN_LENGTH = 4

export function evaluateGame(
    board: Board
): GameStatus {
    if (hasFourInARow(board)) {
        // Only ORDER can win by creating a line
        return { state: "ORDER_WINS" }
    }

    if (isBoardFull(board)) {
        return { state: "CHAOS_WINS" }
    }

    return { state: "ONGOING" }
}

function isBoardFull(board: (string | null)[][]): boolean {
    return board.every(row => row.every(cell => cell !== null))
}

function hasFourInARow(board: (string | null)[][]): boolean {
    const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal down-right
        [1, -1],  // diagonal down-left
    ]

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const symbol = board[r][c]
            if (symbol === null) continue

            for (const [dr, dc] of directions) {
                if (checkDirection(board, r, c, dr, dc, symbol)) {
                    return true
                }
            }
        }
    }

    return false
}

function checkDirection(
    board: (string | null)[][],
    row: number,
    col: number,
    dr: number,
    dc: number,
    symbol: string
): boolean {
    for (let k = 1; k < WIN_LENGTH; k++) {
        const nr = row + dr * k
        const nc = col + dc * k

        if (
            nr < 0 || nr >= BOARD_SIZE ||
            nc < 0 || nc >= BOARD_SIZE ||
            board[nr][nc] !== symbol
        ) {
            return false
        }
    }

    return true
}
