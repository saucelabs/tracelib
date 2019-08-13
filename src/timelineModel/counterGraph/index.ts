import Calculator from './calculator'
import Counter from './counter'
import { CountersObject, RecordType } from '../../types'
import PerformanceModel from '../performanceModel'
import Track from '../track'

/**
 * UI class, therefor only a portion of the original logic is ported
 *
 * @unrestricted
 * @custom
 */
export default class CountersGraph {
    private _calculator: Calculator
    private _counters: Counter[]
    private _countersByName: CountersObject
    private _gpuMemoryCounter: Counter
    private _model: PerformanceModel
    private _track: Track

    public constructor() {
        this._calculator = new Calculator()
        this._counters = []
        this._countersByName = {}
        this._countersByName['jsHeapSizeUsed'] = this._createCounter('JS Heap')
        this._countersByName['documents'] = this._createCounter('Documents')
        this._countersByName['nodes'] = this._createCounter('Nodes')
        this._countersByName['jsEventListeners'] = this._createCounter('Listeners')
        this._gpuMemoryCounter = this._createCounter('GPU Memory')
        this._countersByName['gpuMemoryUsedKB'] = this._gpuMemoryCounter
    }

    /**
     * @param {?Timeline.PerformanceModel} model
     * @param {?TimelineModel.TimelineModel.Track} track
     */
    public setModel(model: PerformanceModel, track: Track): CountersObject {
        this._calculator.setZeroTime(model ? model.timelineModel().minimumRecordTime() : 0)
        for (let i = 0; i < this._counters.length; ++i) {
            this._counters[i].reset()
        }
        this._track = track
        if (!track) {
            return
        }
        const events = track.syncEvents()
        for (let i = 0; i < events.length; ++i) {
            const event = events[i]
            if (event.name !== RecordType.UpdateCounters) {
                continue
            }

            const counters: any = event.args.data
            if (!counters) {
                return
            }
            for (const name in counters) {
                const counter = this._countersByName[name]
                if (counter) {
                    counter.appendSample(event.startTime, counters[name])
                }
            }

            const gpuMemoryLimitCounterName = 'gpuMemoryLimitKB'
            if (gpuMemoryLimitCounterName in counters) {
                this._gpuMemoryCounter.setLimit(counters[gpuMemoryLimitCounterName])
            }
        }
        return this._countersByName
    }

    /**
     * @param {string} uiName
     * @return {!Timeline.CountersGraph.Counter}
     */
    private _createCounter(uiName: string): Counter {
        const counter = new Counter()
        this._counters.push(counter)
        return counter
    }
}
