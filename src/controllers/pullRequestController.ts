import { Request, Response } from 'express'
import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import OpenAI from 'openai'

import { parseAISuggestions } from '../helpers/parser'

const openai = new OpenAI({
    apiKey: process.env.GROK_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1'
})

export async function handlePullRequestReviewEvent(
    req: Request,
    res: Response
) {
    try {
        const event = req.body

        if (!event.pull_request) return res.sendStatus(200)

        const pr = event.pull_request
        const installationId = event.installation.id

        const auth = createAppAuth({
            appId: process.env.APP_ID!,
            privateKey: process.env.PRIVATE_KEY!,
            installationId
        })

        const { token } = await auth({ type: 'installation' })
        const octokit = new Octokit({ auth: token })

        const diffRes = await octokit.pulls.get({
            owner: event.repository.owner.login,
            repo: event.repository.name,
            pull_number: pr.number,
            mediaType: { format: 'diff' }
        })

        const diff = diffRes.data as unknown as string

        const prompt = `You're a senior engineer reviewing a pull request. Focus only on high-value, actionable suggestions. Output in format: [file:line] - comment.

${diff}`

        const completion = await openai.chat.completions.create({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
        })

        const aiResponse = completion.choices[0].message?.content?.trim()

        const suggestions = parseAISuggestions(aiResponse || '')

        suggestions.forEach(async (suggestion) => {
            try {
                await octokit.pulls.createReviewComment({
                    owner: event.repository.owner.login,
                    repo: event.repository.name,
                    pull_number: pr.number,
                    body: suggestion.comment,
                    commit_id: pr.head.sha,
                    path: suggestion.file,
                    line: suggestion.line,
                    side: 'RIGHT'
                })
            } catch (err) {
                console.warn(
                    `Failed to comment on ${suggestion.file}:${suggestion.line}`,
                    err
                )
            }
        })

        return res.sendStatus(200)
    } catch (error) {
        console.error('Error handling pull request review event:', error)
        return res.send({ status: 500, error: (error as any).error })
    }
}
