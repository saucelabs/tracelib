module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    coverageDirectory: './coverage/',
    coverageThreshold: {
        global: {
            branches: 33,
            functions: 50,
            lines: 48,
            statements: 47
        }
    },
    testMatch: [
        '**/tests/**/*.test.ts'
    ],
    moduleFileExtensions: ['js', 'ts'],
    transform: { '^.+\\.tsx?$': 'ts-jest' }
}
