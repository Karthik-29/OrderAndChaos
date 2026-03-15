import { OrderChaosGame } from './OrderChaosGame';
import { runInference } from "./inference.js";

class MCTSNode {
    constructor(prior, parent = null, game = new OrderChaosGame(), action = null) {
        this.P = prior;
        this.parent = parent;
        this.visits = 0;
        this.valueSum = 0.0;
        this.children = new Map();
        this.game = game;
        this.action = action;
    }

    get Q() {
        return this.visits === 0 ? 0 : this.valueSum / this.visits;
    }

    isLeaf() {
        return this.children.size === 0;
    }

    bestChild(c_puct = 1.0) {
        const currentPlayer = this.game.getCurrentPlayer();

        // Tactical short-circuit: if a child is an immediate win for side-to-move, pick it.
        for (const child of this.children.values()) {
            const { terminal, winner } = child.game.isTerminal();
            if (terminal && winner === currentPlayer) {
                return child;
            }
        }

        let bestScore = -Infinity;
        let bestChild = null;

        for (const child of this.children.values()) {
            const u = c_puct * child.P *
                Math.sqrt(this.visits) / (1 + child.visits);

            const score = -child.Q + u;

            if (score > bestScore) {
                bestScore = score;
                bestChild = child;
            }
        }

        return bestChild;
    }

    async expand(modelPath) {
        const inference = await runInference(this.game, modelPath);
        let policy = Array.from(inference.policy.data);
        const value = inference.value.data[0]; // scalar

        const legal = this.game.legalActions();

        // Mask illegal moves
        for (let i = 0; i < policy.length; i++) {
            if (!legal.includes(i)) policy[i] = 0;
        }

        policy = normalizeArray(policy);

        for (const action of legal) {
            const gameCopy = this.game.clone();
            gameCopy.applyAction(action);

            const child = new MCTSNode(
                policy[action],
                this,
                gameCopy,
                action
            );

            this.children.set(action, child);
        }

        return value;
    }

    backpropagate(value) {
        this.visits += 1;
        this.valueSum += value;

        if (this.parent) {
            this.parent.backpropagate(-value);
        }
    }
}

function normalizeArray(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);

    if (sum <= 0) {
        const uniform = 1 / arr.length;
        return arr.map(() => uniform);
    }

    return arr.map(x => x / sum);
}

export async function runMCTS(
    rootGame = new OrderChaosGame(),
    numSimulations = 500,
    c_puct = 1.0,
    modelPath = `${import.meta.env.BASE_URL}maxwells_demon.onnx?v=${import.meta.env.VITE_MODEL_VERSION ?? "dev"}`
) {
    const root = new MCTSNode(1.0, null, rootGame);

    for (let i = 0; i < numSimulations; i++) {
        let node = root;
        // ---- Selection ----
        while (!node.isLeaf()) {
            const terminal = node.game.isTerminal();
            if (terminal.terminal) break;

            node = node.bestChild(c_puct);
        }

        // ---- Evaluation / Expansion ----
        const { terminal, winner } = node.game.isTerminal();

        let value;

        if (terminal) {
            const currentPlayer = node.game.getCurrentPlayer();
            value = (winner === currentPlayer) ? 1 : -1;
        } else {
            value = await node.expand(modelPath);
        }

        // ---- Backprop ----
        node.backpropagate(value);
    }

// ---- Build policy from visit counts ----
    const pi = new Array(50).fill(0.0);

    for (const [action, child] of root.children.entries()) {
        pi[action] = child.visits;
    }

    const normalized = normalizeArray(pi);

// Pick argmax
    let bestAction = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] > bestValue) {
            bestValue = normalized[i];
            bestAction = i;
        }
    }

    return bestAction;
}

