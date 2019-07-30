const world = 'foobar'

export function hello(word: string = world): string {
    return `Hello ${world} + ${word}!!`
}
