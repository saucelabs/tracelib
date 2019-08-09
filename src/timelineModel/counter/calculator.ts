export default class Calculator {
    private _zeroTime: number
    private _minimumBoundary: number
    private _maximumBoundary: number
    private _workingArea: number

    public constructor() {}

    /**
     * @param {number} time
     */
    public setZeroTime(time: number): void {
        this._zeroTime = time
    }

    /**
     * @override
     * @param {number} time
     * @return {number}
     */
    public computePosition(time: number): number {
        return ((time - this._minimumBoundary) / this.boundarySpan()) * this._workingArea
    }

    public setWindow(minimumBoundary: number, maximumBoundary: number): void {
        this._minimumBoundary = minimumBoundary
        this._maximumBoundary = maximumBoundary
    }

    /**
     * @param {number} clientWidth
     */
    public setDisplayWidth(clientWidth: number): void {
        this._workingArea = clientWidth
    }

    /**
     * @override
     * @return {number}
     */
    public maximumBoundary(): number {
        return this._maximumBoundary
    }

    /**
     * @override
     * @return {number}
     */
    public minimumBoundary(): number {
        return this._minimumBoundary
    }

    /**
     * @override
     * @return {number}
     */
    public zeroTime(): number {
        return this._zeroTime
    }

    /**
     * @override
     * @return {number}
     */
    public boundarySpan(): number {
        return this._maximumBoundary - this._minimumBoundary
    }
}
