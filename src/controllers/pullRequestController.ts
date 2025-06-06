import { Request, Response } from "express";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import OpenAI from "openai";

import { readFileSync } from "fs";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function handlePullRequestReviewEvent(req: Request, res: Response) {
  const event = req.body;

  if (!event.pull_request) return res.sendStatus(200);

  const pr = event.pull_request;
  const installationId = event.installation.id;

  const auth = createAppAuth({
    appId: process.env.APP_ID!,
    privateKey: readFileSync(process.env.PRIVATE_KEY_PATH!, "utf8"),
    installationId,
  });

  const { token } = await auth({ type: "installation" });
  const octokit = new Octokit({ auth: token });

  const diffRes = await octokit.pulls.get({
    owner: event.repository.owner.login,
    repo: event.repository.name,
    pull_number: pr.number,
    mediaType: { format: "diff" },
  });

  const diff = diffRes.data as unknown as string;

  const prompt = `You're a senior engineer reviewing a pull request. Focus only on high-value, actionable suggestions. Output in format: [file:line] - comment.

${diff}`;

  const completion = await await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.2,
});

const aiResponse = completion.choices[0].message?.content?.trim()
  console.log("🤖 AI suggestions:\n", aiResponse);

  // To-do: parse aiResponse and post inline comments

  res.sendStatus(200);
}