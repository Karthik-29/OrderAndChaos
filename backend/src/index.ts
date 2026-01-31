import { Hono } from "hono"
import { evaluateGame } from "./gameEvaluator"
import { cors } from "hono/cors"



const app = new Hono()

app.use("/evaluate", cors())

app.post("/evaluate", async (c) => {
    const { board, lastPlayed } = await c.req.json()

    const result = evaluateGame(board)

    return c.json(result)
})

export default app
