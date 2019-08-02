import TimelineFrame from "./timelineFrame/timelineFrame";
import { lowerBound } from "../utils";
import Event from '../tracingModel/event'
import { FrameById, TimeByCategory, RecordType, EventData, ThreadData } from "../types";
import TracingFrameLayerTree from "./timelineFrame/tracingFrameLayerTree";
import PendingFrame from './timelineFrame/pendingFrame'
import Thread from "../tracingModel/thread";
import TracingModel, { Phase } from "../tracingModel";
import LayerPaintEvent from "./timelineFrame/layerPaintEvent";
import TimelineData from "./TimelineData";

export default class TimelineFrameModel {
  private _categoryMapper: any
  private _frames: TimelineFrame[]
  private _frameById: FrameById
  private _minimumRecordTime: number;
  private _lastFrame: TimelineFrame;
  private _lastLayerTree: TracingFrameLayerTree;
  private _mainFrameCommitted: boolean;
  private _mainFrameRequested: boolean;
  private _framePendingCommit: PendingFrame;
  private _lastBeginFrame: number;
  private _lastNeedsBeginFrame: number;
  private _framePendingActivation: PendingFrame;
  private _lastTaskBeginTime: number;
  private _target: any;
  private _layerTreeId: any; // todo fix type
  private _currentTaskTimeByCategory: TimeByCategory;
  private _currentProcessMainThread: Thread
  private _mainFrameMarkers: string[]

  /**
   * @param {function(!SDK.TracingModel.Event):string} categoryMapper
   */
  public constructor(categoryMapper: any) {
    this._categoryMapper = categoryMapper;
    this._mainFrameMarkers = [
      RecordType.ScheduleStyleRecalculation,
      RecordType.InvalidateLayout,
      RecordType.BeginMainThreadFrame,
      RecordType.ScrollLayer
    ]
    this.reset();
  }

  /**
   * @param {number=} startTime
   * @param {number=} endTime
   * @return {!Array<!TimelineModel.TimelineFrame>}
   */
  public frames(startTime: number, endTime: number): TimelineFrame[] {
    if (!startTime && !endTime)
      return this._frames;
    const firstFrame = lowerBound(this._frames, startTime || 0, (time, frame) => time - frame.endTime);
    const lastFrame = lowerBound(this._frames, endTime || Infinity, (time, frame) => time - frame.startTime);
    return this._frames.slice(firstFrame, lastFrame);
  }

  /**
   * @param {!SDK.TracingModel.Event} rasterTask
   * @return {boolean}
   */
  public hasRasterTile(rasterTask: Event): boolean {
    const data = rasterTask.args['tileData'];
    if (!data) {
      return false;
    }
    const frameId = data['sourceFrameNumber'];
    const frame = frameId && this._frameById[frameId];
    if (!frame || !frame.layerTree)
      return false;
    return true;
  }

  /**
   * @param {!SDK.TracingModel.Event} rasterTask
   * @return Promise<?{rect: !Protocol.DOM.Rect, snapshot: !SDK.PaintProfilerSnapshot}>}
   */
  // target was used
  public rasterTilePromise(rasterTask: Event): Promise<any> {
    return Promise.resolve(null);
  }

  public reset(): void {
    this._minimumRecordTime = Infinity;
    this._frames = [];
    this._frameById = {};
    this._lastFrame = null;
    this._lastLayerTree = null;
    this._mainFrameCommitted = false;
    this._mainFrameRequested = false;
    this._framePendingCommit = null;
    this._lastBeginFrame = null;
    this._lastNeedsBeginFrame = null;
    this._framePendingActivation = null;
    this._lastTaskBeginTime = null;
    this._target = null;
    this._layerTreeId = null;
    this._currentTaskTimeByCategory = {};
  }

  /**
   * @param {number} startTime
   */
  public handleBeginFrame(startTime: number): void {
    if (!this._lastFrame)
      this._startFrame(startTime);
    this._lastBeginFrame = startTime;
  }

  /**
   * @param {number} startTime
   */
  public handleDrawFrame(startTime: number) {
    if (!this._lastFrame) {
      this._startFrame(startTime);
      return;
    }

    // - if it wasn't drawn, it didn't happen!
    // - only show frames that either did not wait for the main thread frame or had one committed.
    if (this._mainFrameCommitted || !this._mainFrameRequested) {
      if (this._lastNeedsBeginFrame) {
        const idleTimeEnd = this._framePendingActivation ? this._framePendingActivation.triggerTime :
                                                           (this._lastBeginFrame || this._lastNeedsBeginFrame);
        if (idleTimeEnd > this._lastFrame.startTime) {
          this._lastFrame.idle = true;
          this._startFrame(idleTimeEnd);
          if (this._framePendingActivation)
            this._commitPendingFrame();
          this._lastBeginFrame = null;
        }
        this._lastNeedsBeginFrame = null;
      }
      this._startFrame(startTime);
    }
    this._mainFrameCommitted = false;
  }

  public handleActivateLayerTree(): void {
    if (!this._lastFrame)
      return;
    if (this._framePendingActivation && !this._lastNeedsBeginFrame)
      this._commitPendingFrame();
  }

  public handleRequestMainThreadFrame(): void {
    if (!this._lastFrame)
      return;
    this._mainFrameRequested = true;
  }

  public handleCompositeLayers(): void {
    if (!this._framePendingCommit)
      return;
    this._framePendingActivation = this._framePendingCommit;
    this._framePendingCommit = null;
    this._mainFrameRequested = false;
    this._mainFrameCommitted = true;
  }

  /**
   * @param {!TimelineModel.TracingFrameLayerTree} layerTree
   */
  public handleLayerTreeSnapshot(layerTree: TracingFrameLayerTree): void {
    this._lastLayerTree = layerTree;
  }

  /**
   * @param {number} startTime
   * @param {boolean} needsBeginFrame
   */
  public handleNeedFrameChanged(startTime: number, needsBeginFrame: boolean): void {
    if (needsBeginFrame)
      this._lastNeedsBeginFrame = startTime;
  }

  /**
   * @param {number} startTime
   */
  public _startFrame(startTime: number): void {
    if (this._lastFrame)
      this._flushFrame(this._lastFrame, startTime);
    this._lastFrame = new TimelineFrame(startTime, startTime - this._minimumRecordTime);
  }

  /**
   * @param {!TimelineModel.TimelineFrame} frame
   * @param {number} endTime
   */
  private _flushFrame(frame: TimelineFrame, endTime: number): void {
    frame.setLayerTree(this._lastLayerTree);
    frame.setEndTime(endTime);
    if (this._lastLayerTree)
      this._lastLayerTree._setPaints(frame.paints);
    if (this._frames.length &&
        (frame.startTime !== this._frames[this._frames.length - 1].endTime || frame.startTime > frame.endTime)) {
      console.assert(
          false, `Inconsistent frame time for frame ${this._frames.length} (${frame.startTime} - ${frame.endTime})`);
    }
    this._frames.push(frame);
    if (typeof frame.mainFrameId === 'number')
      this._frameById[frame.mainFrameId] = frame;
  }

  private _commitPendingFrame(): void {
    this._lastFrame.addTimeForCategories(this._framePendingActivation.timeByCategory);
    this._lastFrame.paints = this._framePendingActivation.paints;
    this._lastFrame.mainFrameId = this._framePendingActivation.mainFrameId;
    this._framePendingActivation = null;
  }

  /**
   * @param {?SDK.Target} target
   * @param {!Array.<!SDK.TracingModel.Event>} events
   * @param {!Array<!{thread: !SDK.TracingModel.Thread, time: number}>} threadData
   */
  public addTraceEvents(target: any, events: Event[], threadData: ThreadData[]) {
    this._target = target;
    let j = 0;
    this._currentProcessMainThread = threadData.length && threadData[0].thread || null;
    for (let i = 0; i < events.length; ++i) {
      while (j + 1 < threadData.length && threadData[j + 1].time <= events[i].startTime)
        this._currentProcessMainThread = threadData[++j].thread;
      this._addTraceEvent(events[i]);
    }
    this._currentProcessMainThread = null;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  private _addTraceEvent(event: Event): void {
    const eventNames = RecordType;
    if (event.startTime && event.startTime < this._minimumRecordTime)
      this._minimumRecordTime = event.startTime;

    if (event.name === eventNames.SetLayerTreeId) {
      this._layerTreeId = event.args['layerTreeId'] || event.args['data']['layerTreeId'];
    } else if (
        event.phase === Phase.SnapshotObject && event.name === eventNames.LayerTreeHostImplSnapshot &&
        parseInt(event.id, 0) === this._layerTreeId) {
      // todo fix type here
      const snapshot: any = /** @type {!SDK.TracingModel.ObjectSnapshot} */ (event);
      this.handleLayerTreeSnapshot(new TracingFrameLayerTree(this._target, snapshot));
    } else {
      this._processCompositorEvents(event);
      if (event.thread === this._currentProcessMainThread)
        this._addMainThreadTraceEvent(event);
      else if (this._lastFrame && event.selfTime && !TracingModel.isTopLevelEvent(event))
        this._lastFrame.addTimeForCategory(this._categoryMapper(event), event.selfTime);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  private _processCompositorEvents(event: Event): void {
    const eventNames = RecordType;

    if (event.args['layerTreeId'] !== this._layerTreeId)
      return;

    const timestamp = event.startTime;
    if (event.name === eventNames.BeginFrame)
      this.handleBeginFrame(timestamp);
    else if (event.name === eventNames.DrawFrame)
      this.handleDrawFrame(timestamp);
    else if (event.name === eventNames.ActivateLayerTree)
      this.handleActivateLayerTree();
    else if (event.name === eventNames.RequestMainThreadFrame)
      this.handleRequestMainThreadFrame();
    else if (event.name === eventNames.NeedsBeginFrameChanged)
      this.handleNeedFrameChanged(timestamp, event.args['data'] && event.args['data']['needsBeginFrame']);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  private _addMainThreadTraceEvent(event: Event): void {
    const eventNames = RecordType;

    if (TracingModel.isTopLevelEvent(event)) {
      this._currentTaskTimeByCategory = {};
      this._lastTaskBeginTime = event.startTime;
    }
    if (!this._framePendingCommit && this._mainFrameMarkers.indexOf(event.name) >= 0) {
      this._framePendingCommit =
          new PendingFrame(this._lastTaskBeginTime || event.startTime, this._currentTaskTimeByCategory);
    }
    if (!this._framePendingCommit) {
      this._addTimeForCategory(this._currentTaskTimeByCategory, event);
      return;
    }
    this._addTimeForCategory(this._framePendingCommit.timeByCategory, event);

    if (event.name === eventNames.BeginMainThreadFrame && event.args['data'] && event.args['data']['frameId'])
      this._framePendingCommit.mainFrameId = event.args['data']['frameId'];
    if (event.name === eventNames.Paint && event.args['data']['layerId'] &&
        TimelineData.forEvent(event).picture && this._target)
      this._framePendingCommit.paints.push(new LayerPaintEvent(event));
    if (event.name === eventNames.CompositeLayers && event.args['layerTreeId'] === this._layerTreeId)
      this.handleCompositeLayers();
  }

  /**
   * @param {!Object.<string, number>} timeByCategory
   * @param {!SDK.TracingModel.Event} event
   */
  private _addTimeForCategory(timeByCategory: TimeByCategory, event: Event): void {
    if (!event.selfTime)
      return;
    const categoryName = this._categoryMapper(event);
    timeByCategory[categoryName] = (timeByCategory[categoryName] || 0) + event.selfTime;
  }
};
