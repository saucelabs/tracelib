module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    coverageDirectory: './coverage/',
    coverageThreshold: {
        global: {
            branches: 43,
            functions: 68,
            lines: 63,
            statements: 63
        }
    },
    testMatch: [
        '**/tests/**/*.test.ts'
    ],
    moduleFileExtensions: ['js', 'ts'],
    transform: { '^.+\\.tsx?$': 'ts-jest' }
}
