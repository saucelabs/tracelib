import TracingModel from "../tracingModel";
import TimelineModel from ".";
import TimelineFrameModel from "./timelineFrameModel";
import { TrackType } from "./track";
import TimelineFrame from "./timelineFrame/timelineFrame";

interface ExtensionTracingModel {
  title: string,
  model: TracingModel,
  timeOffset: number
}

export default class PerformanceModel {
  private _mainTarget: any
  private _tracingModel: TracingModel
  private _timelineModel: TimelineModel
  private _frameModel: TimelineFrameModel
  private _extensionTracingModels: ExtensionTracingModel[];
  private _recordStartTime: number

  constructor() {
    /** @type {?SDK.Target} */
    this._mainTarget = null;
    /** @type {?SDK.TracingModel} */
    this._tracingModel = null;
    this._timelineModel = new TimelineModel();
    /** @type {!Array<!{title: string, model: !SDK.TracingModel, timeOffset: number}>} */
    this._extensionTracingModels = [];
    /** @type {number|undefined} */
    this._recordStartTime = undefined;
    this._frameModel = new TimelineFrameModel();
  }

  /**
   * @param {number} time
   */
  public setRecordStartTime(time: number): void {
    this._recordStartTime = time;
  }

  /**
   * @return {number|undefined}
   */
  public recordStartTime(): number {
    return this._recordStartTime;
  }

  /**
   * @param {!SDK.TracingModel} model
   */
  public setTracingModel(model: TracingModel): void {
    this._tracingModel = model;
    this._timelineModel.setEvents(model);

    let inputEvents = null;
    let animationEvents = null;
    for (const track of this._timelineModel.tracks()) {
      if (track.type === TrackType.Input)
        inputEvents = track.asyncEvents;
      if (track.type === TrackType.Animation)
        animationEvents = track.asyncEvents;
    }

    const mainTracks = this._timelineModel.tracks().filter(
        track => track.type === TrackType.MainThread && track.forMainFrame &&
            track.events.length);
    const threadData = mainTracks.map(track => {
      const event = track.events[0];
      return {thread: event.thread, time: event.startTime};
    });
    this._frameModel.addTraceEvents(this._mainTarget, this._timelineModel.inspectedTargetEvents(), threadData);

    for (const entry of this._extensionTracingModels) {
      entry.model.adjustTime(
          this._tracingModel.minimumRecordTime() + (entry.timeOffset / 1000) - this._recordStartTime);
    }
  }

  /**
   * @param {string} title
   * @param {!SDK.TracingModel} model
   * @param {number} timeOffset
   */
  public addExtensionEvents(title: string, model: TracingModel, timeOffset: number): void {
    this._extensionTracingModels.push({model: model, title: title, timeOffset: timeOffset});
    if (!this._tracingModel)
      return;
    model.adjustTime(this._tracingModel.minimumRecordTime() + (timeOffset / 1000) - this._recordStartTime);
  }

  /**
   * @return {!SDK.TracingModel}
   */
  public tracingModel(): TracingModel {
    if (!this._tracingModel)
      throw 'call setTracingModel before accessing PerformanceModel';
    return this._tracingModel;
  }

  /**
   * @return {!TimelineModel.TimelineModel}
   */
  timelineModel() {
    return this._timelineModel;
  }

  /**
   * @return {!Array<!TimelineModel.TimelineFrame>} frames
   */
  public frames(): TimelineFrame[] {
    return this._frameModel.frames();
  }

  /**
   * @return {!TimelineModel.TimelineFrameModel} frames
   */
  public frameModel(): TimelineFrameModel {
    return this._frameModel;
  }
};
