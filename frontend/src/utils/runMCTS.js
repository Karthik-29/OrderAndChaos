import { OrderChaosGame } from './OrderChaosGame';
import { runInference} from "./inference.js";

class MCTSNode {
    constructor(prior) {
        this.prior = prior;
        this.N = 0;
        this.W = 0;
        this.children = new Map();
    }

    get Q() {
        return this.N === 0 ? 0 : this.W / this.N;
    }
}

function puct(parent, child, c_puct=1.0) {
    return child.Q + c_puct * child.prior * Math.sqrt(parent.N) / (1 + child.N);
}

function normalizeArray(arr){
    let sum = arr.reduce((a, b) => a + b, 0);
    if (sum > 0) {
        arr = arr.map(x => x/sum)
    }
    return arr
}

export async function runMCTS(rootGame = new OrderChaosGame(), numSimulations=100, c_puct=1, modelPath = `${import.meta.env.BASE_URL}maxwells_demon.onnx`) {
    const root = new MCTSNode(1);

    for (let i = 0; i < numSimulations; i++) {
        let node = root;
        let game = rootGame.clone();
        let value;
        let path = [];

        // Selection
        while (node.children.size > 0) {
            let bestScore = -Infinity;
            let bestAction = null;

            for (const [action, child] of node.children) {
                const score = puct(node, child);
                if (score > bestScore) {
                    bestScore = score;
                    bestAction = action;
                }
            }
            node = node.children.get(bestAction);
            game.applyAction(bestAction);
            path.push(node);
        }

        let isTerminal = game.terminal();
        if (isTerminal.isTerminal) {
            value = isTerminal.state === "ORDER_WINS" ? 1 : -1;
        } else {
            // Evaluation
            const inferenceResult = await runInference(game, modelPath);
            value = inferenceResult.value.data[0];
            let policy = inferenceResult.policy.data;

            // Expansion
            let legalActions = game.legalActions();
            let policyMasked = new Array(50).fill(0.0);
            for (const actionIndex of legalActions) {
                policyMasked[actionIndex] = policy[actionIndex];

            }
            policy = normalizeArray(policyMasked)
            for (const actionIndex of legalActions) {
                node.children.set(actionIndex, new MCTSNode(policy[actionIndex]));
            }
        }

        // backup
        for (const n of path.reverse()) {
            n.N += 1
            n.W += value
            value = -value
        }

        root.N += 1
        root.W += value
    }

    // Imporoved policy
    let pi =  new Array(50).fill(0.0);
    for (const [actionIndex, child] of root.children) {
        pi[actionIndex] = child.N;
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