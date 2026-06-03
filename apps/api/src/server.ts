import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { router } from "./routes.js";
import { aggregateDisasterSources } from "./services/aggregation.js";

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.webOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 180 }));
app.use("/api", router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Unexpected error";
  res.status(400).json({ error: message });
});

setInterval(() => {
  aggregateDisasterSources().catch((error) => console.error("aggregation failed", error));
}, 1000 * 60 * 15);

app.listen(config.port, () => {
  console.log(`DisasterWatch AI API listening on ${config.port}`);
});
