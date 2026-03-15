// frontend/utils/gameEvaluator.js

const BOARD_SIZE = 5
const WIN_LENGTH = 4

export function evaluateGame(board) {
    if (hasFourInARow(board)) {
        // Only ORDER can win by forming a line
        return { state: "ORDER_WINS" }
    }

    if (isBoardFull(board)) {
        return { state: "CHAOS_WINS" }
    }

    return { state: "ONGOING" }
}

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null))
}

function hasFourInARow(board) {
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

function checkDirection(board, row, col, dr, dc, symbol) {
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


