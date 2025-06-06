export interface AISuggestion {
    file: string
    line: number
    comment: string
}

export const parseAISuggestions = (raw: string): AISuggestion[] => {
    const lines = raw.split('\n')
    const suggestions: AISuggestion[] = []

    lines.forEach((line) => {
        const match = line.match(/^\[(.+):(\d+)\]\s*-\s*(.+)$/)
        if (match) {
            const [, file, lineNum, comment] = match
            suggestions.push({
                file,
                line: parseInt(lineNum, 10),
                comment: comment.trim()
            })
        }
    })
    return suggestions
}
