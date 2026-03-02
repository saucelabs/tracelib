import TracingModel from './tracingModel/index'
import PerformanceModel from './timelineModel/performanceModel'
import Logger from '../src/logger'

export default class TimelineLoader {
    private _tracingModel: TracingModel
    public performanceModel: PerformanceModel
    private _traceLog: any

    public constructor(traceLog: any) {
        this._tracingModel = new TracingModel()
        this._traceLog = traceLog
    }

    /**
     * @param {string} data
     */
    public init(): void {
        Logger.debug('TimelineLoader', 'Initializing with trace log')
        try {
            this._tracingModel.addEvents(this._traceLog)
        } catch (e) {
            console.error('Malformed timeline data: %s', e.toString())
            return
        }
        this._tracingModel.tracingComplete()
        Logger.debug('TimelineLoader', 'TracingModel complete, creating PerformanceModel')
        this.performanceModel = new PerformanceModel()
        this.performanceModel.setTracingModel(this._tracingModel)
        Logger.debug('TimelineLoader', 'Initialization complete')
    }
}
