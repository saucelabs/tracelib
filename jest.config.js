module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    coverageDirectory: './coverage/',
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    },
    moduleFileExtensions: ['js', 'ts'],
    transform: { '^.+\\.tsx?$': 'ts-jest' }
}
