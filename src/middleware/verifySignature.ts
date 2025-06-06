import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { RawBodyRequest } from "..";

export function verifySignatureMiddleware(req: RawBodyRequest, res: Response, next: NextFunction) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!signature || !req.rawBody) {
    return res.status(401).send("Missing signature or raw body");
  }

  const secret = process.env.WEBHOOK_SECRET!;
  const hmac = crypto.createHmac("sha256", secret).update(req.rawBody);
  const digest = `sha256=${hmac.digest("hex")}`;

  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (
    sigBuffer.length !== digestBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, digestBuffer)
  ) {
    return res.status(401).send("Invalid signature");
  }

  next();
}