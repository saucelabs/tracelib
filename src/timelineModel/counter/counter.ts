import Calculator from './calculator'
import { constrain, upperBound, lowerBound } from '../../utils'

export default class Counter {
    public times: number[]
    public values: number[]
    private _limitValue: number
    private _minimumIndex: number
    private _maximumIndex: number
    private _minTime: number
    private _maxTime: number
    public x: number[]

    public constructor() {
        this.times = []
        this.values = []
    }

    /**
     * @param {number} time
     * @param {number} value
     */
    public appendSample(time: number, value: number): void {
        if (this.values.slice(-1) === value) return
        this.times.push(time)
        this.values.push(value)
    }

    public reset(): void {
        this.times = []
        this.values = []
    }

    /**
     * @param {number} value
     */
    public setLimit(value: number): void {
        this._limitValue = value
    }

    /**
     * @return {!{min: number, max: number}}
     */
    private _calculateBounds(): { min: number; max: number } {
        let maxValue
        let minValue
        for (let i = this._minimumIndex; i <= this._maximumIndex; i++) {
            const value = this.values[i]
            if (minValue === undefined || value < minValue) minValue = value
            if (maxValue === undefined || value > maxValue) maxValue = value
        }
        minValue = minValue || 0
        maxValue = maxValue || 1
        if (this._limitValue) {
            if (maxValue > this._limitValue * 0.5) {
                maxValue = Math.max(maxValue, this._limitValue)
            }
            minValue = Math.min(minValue, this._limitValue)
        }
        return {
            min: minValue,
            max: maxValue,
        }
    }

    /**
     * @param {!Timeline.CountersGraph.Calculator} calculator
     */
    private _calculateVisibleIndexes(calculator: Calculator): void {
        const start = calculator.minimumBoundary()
        const end = calculator.maximumBoundary()

        // Maximum index of element whose time <= start.
        this._minimumIndex = constrain(upperBound(this.times, start) - 1, 0, this.times.length - 1)

        // Minimum index of element whose time >= end.
        this._maximumIndex = constrain(lowerBound(this.times, end), 0, this.times.length - 1)

        // Current window bounds.
        this._minTime = start
        this._maxTime = end
    }

    /**
     * @param {number} width
     */
    private _calculateXValues(width: number): void {
        if (!this.values.length) return

        const xFactor = width / (this._maxTime - this._minTime)

        this.x = new Array(this.values.length)
        for (let i = this._minimumIndex + 1; i <= this._maximumIndex; i++)
            this.x[i] = xFactor * (this.times[i] - this._minTime)
    }
}
