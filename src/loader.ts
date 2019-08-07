import TracingModel from './tracingModel/index'
import PerformanceModel from './timelineModel/performanceModel'

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
        try {
            this._tracingModel.addEvents(this._traceLog)
        } catch (e) {
            console.error('Malformed timeline data: %s', e.toString())
            return
        }
        this._tracingModel.tracingComplete();
        this.performanceModel = new PerformanceModel()
        this.performanceModel.setTracingModel(this._tracingModel)
    }
};
