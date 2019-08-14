module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverageFrom: ['./src/**'],
    coverageDirectory: './coverage/',
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        }
    },
    testMatch: [
        '**/tests/**/*.test.ts'
    ],
    moduleFileExtensions: ['js', 'ts'],
    transform: { '^.+\\.tsx?$': 'ts-jest' }
}
