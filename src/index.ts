import dotenv from "dotenv";
dotenv.config();
import express, { Request } from "express";
import bodyParser from "body-parser";

import { verifySignatureMiddleware } from "./middleware/verifySignature";
import { handlePullRequestReviewEvent } from "./controllers/pullRequestController";


const app = express();

export interface RawBodyRequest extends Request {
  rawBody?: string;
}

// Capture raw body for signature verification
app.use(
  bodyParser.json({
    verify: (req: RawBodyRequest, _res, buf) => {
      req.rawBody = buf.toString()
    },
  })
);

// Secure webhook endpoint
app.post("/review", verifySignatureMiddleware as unknown as any, handlePullRequestReviewEvent as unknown as any);
app.get('/ping', (_, res) => res.send('pong') as unknown as any)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot listening on port: ${PORT}`);
});