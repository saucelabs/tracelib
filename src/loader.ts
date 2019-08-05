import TracingModel from './tracingModel/index'
import TimelineJSProfileProcessor from './timelineModel/timelineJSProfileProcessor'
import PerformanceModel from './timelineModel/performanceModel'

enum State {
    Initial,
    LookingForEvents,
    ReadingEvents,
    SkippingTail,
    LoadingCPUProfileFormat,
}

export default class TimelineLoader {
    private _tracingModel: TracingModel
    private _state: State
    private _buffer: string
    private _firstRawChunk: boolean
    private _firstChunk: boolean
    private _loadedBytes: number
    private _totalSize: number
    public performanceModel: PerformanceModel
    private _traceLog: any

    public constructor(traceLog: any) {
        this._tracingModel = new TracingModel()
        this._state = State.Initial
        this._buffer = ''
        this._firstRawChunk = true
        this._firstChunk = true
        this._loadedBytes = 0
        /** @type {number} */
        this._totalSize
        this._traceLog = traceLog
        // this._jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this), true);
    }

    /**
    * @param {string} data
    */
    public init(): void {
        // let json = data;

        // let items = data;
        // try {
        //   items = /** @type {!Array.<!SDK.TracingManager.EventPayload>} */ (JSON.parse(json));
        // } catch (e) {
        //   console.error('Malformed timeline data: %s', e.toString())
        //   return;
        // }

        try {
            this._tracingModel.addEvents(this._traceLog)
        } catch (e) {
            console.error('Malformed timeline data: %s', e.toString())
            return
        }
        this._finalizeTrace()
    }

    private _finalizeTrace(): void {
        if (this._state === State.LoadingCPUProfileFormat) {
            // this._parseCPUProfileFormat(this._buffer);
            // this._buffer = '';
        }
        this.performanceModel = new PerformanceModel()
        this.performanceModel.setTracingModel(this._tracingModel)
    }

    /**
    * @param {string} text
    */
    private _parseCPUProfileFormat(text: string): void {
        let traceEvents
        try {
            const profile = JSON.parse(text)
            traceEvents = TimelineJSProfileProcessor.buildTraceProfileFromCpuProfile(
                profile, /* tid */ 1, /* injectPageEvent */ true)
        } catch (e) {
            console.error('Malformed CPU profile format')
            return
        }
        this._tracingModel.addEvents(traceEvents)
    }
};
