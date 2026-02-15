import { OrderChaosGame } from './OrderChaosGame';
import { runInference} from "./inference.js";

class MCTSNode {
    constructor(prior, parent = null, game = new OrderChaosGame(), action = null) {
        this.P = prior;
        this.parent = parent;
        this.visits = 0;
        this.wins = 0.0;
        this.children = [];
        this.game = game;
        this.action = action;
        this.untriedActions = this.game.legalActions();
    }

    get Q() {
        return this.visits === 0 ? 0 : this.wins / this.visits;
    }

    isFullyExpanded() {
        return this.untriedActions.length === 0;
    }

    expand() {
        const action = this.untriedActions.pop();
        const gameCopy = this.game.clone();
        gameCopy.applyAction(action);
        const childNode = new MCTSNode(0, this, gameCopy, action);
        this.children.push(childNode);
        return childNode;
    }

    bestChild(c_puct = 1.0) {
        for (const child of this.children) {
            if (child.visits === 0) {
                return child;
            }
        }

        let best = this.children[0];
        let bestScore = -Infinity;
        for (const child of this.children) {
            const score = child.Q + c_puct * child.P * Math.sqrt(this.visits) / (1 + child.visits);
            if (score > bestScore) {
                bestScore = score;
                best = child;
            }
        }
        return best;
    }

    async rollout(modelPath) {
        const game = this.game.clone();

        while (true) {
            const terminal = game.terminal();
            if (terminal.isTerminal) {
                return terminal.state === "ORDER_WINS" ? "ORDER" : "CHAOS";
            }

            const inferenceResult = await runInference(game, modelPath);
            let policy = Array.from(inferenceResult.policy.data);

            const legalActions = game.legalActions();
            const legalActionsMask = new Array(policy.length).fill(false);
            for (const actionIndex of legalActions) {
                legalActionsMask[actionIndex] = true;
            }

            for (let i = 0; i < policy.length; i++) {
                if (!legalActionsMask[i]) {
                    policy[i] = 0;
                }
            }

            const policySum = policy.reduce((a, b) => a + b, 0);
            if (policySum > 0) {
                policy = policy.map(x => x / policySum);
            }

            let actionIndex = 0;
            let maxVal = -Infinity;
            for (let i = 0; i < policy.length; i++) {
                if (policy[i] > maxVal) {
                    maxVal = policy[i];
                    actionIndex = i;
                }
            }

            game.applyAction(actionIndex);
        }
    }

    backup(winner) {
        this.visits += 1;
        this.wins += winner === this.game.currentPlayer ? 1 : -1;

        if (this.parent) {
            this.parent.backup(winner);
        }
    }
}

function normalizeArray(arr){
    let sum = arr.reduce((a, b) => a + b, 0);
    if (sum > 0) {
        arr = arr.map(x => x/sum)
    }
    return arr
}

export async function runMCTS(rootGame = new OrderChaosGame(), numSimulations=100, c_puct=1, modelPath = `${import.meta.env.BASE_URL}maxwells_demon.onnx`) {
    const root = new MCTSNode(1.0, null, rootGame);

    for (let i = 0; i < numSimulations; i++) {
        let node = root;

        while (!node.game.terminal().isTerminal && node.isFullyExpanded()) {
            node = node.bestChild(c_puct);
        }

        if (!node.game.terminal().isTerminal && !node.isFullyExpanded()) {
            node = node.expand();
        }

        const winner = await node.rollout(modelPath);
        node.backup(winner);
    }

    // Improved policy
    let pi =  new Array(50).fill(0.0);
    for (const child of root.children) {
        pi[child.action] = root.visits === 0 ? 0 : child.visits / root.visits;
    }

    pi = normalizeArray(pi)

    let argmax = -1
    let maxVal = -1
    for (let i = 0; i < pi.length; i++){
        if (pi[i] >= maxVal) {
            maxVal = pi[i]
            argmax = i
        }
    }
    return argmax;
}
