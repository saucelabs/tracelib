import TimelineModel, { RecordType } from './index';
import TimelineData from './timelineData';
import Event from '../tracingModel/event'

export default class TimelineAsyncEventTracker {
  private static _asyncEvents: any // todo
  private _initiatorByType: Map<number|string, any> // todo
  private static _typeToInitiator: Map<any, any> // todo

  constructor() {
    TimelineAsyncEventTracker._initialize();
    /** @type {!Map<!TimelineModel.TimelineModel.RecordType, !Map<string, !SDK.TracingModel.Event>>} */
    this._initiatorByType = new Map();
    for (const initiator of TimelineAsyncEventTracker._asyncEvents.keys())
      this._initiatorByType.set(initiator, new Map());
  }

  private static _initialize(): void {
    if (TimelineAsyncEventTracker._asyncEvents)
      return;
    const events = new Map();
    let type = RecordType;

    events.set(type.TimerInstall, {causes: [type.TimerFire], joinBy: 'timerId'});
    events.set(
        type.ResourceSendRequest,
        {causes: [type.ResourceReceiveResponse, type.ResourceReceivedData, type.ResourceFinish], joinBy: 'requestId'});
    events.set(type.RequestAnimationFrame, {causes: [type.FireAnimationFrame], joinBy: 'id'});
    events.set(type.RequestIdleCallback, {causes: [type.FireIdleCallback], joinBy: 'id'});
    events.set(type.WebSocketCreate, {
      causes: [type.WebSocketSendHandshakeRequest, type.WebSocketReceiveHandshakeResponse, type.WebSocketDestroy],
      joinBy: 'identifier'
    });

    this._asyncEvents = events;
    /** @type {!Map<!TimelineModel.TimelineModel.RecordType, !TimelineModel.TimelineModel.RecordType>} */
    this._typeToInitiator = new Map();
    for (const entry of events) {
      const types = entry[1].causes;
      for (type of types)
      this._typeToInitiator.set(type, entry[0]);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  public processEvent(event: Event): void {
    let initiatorType = TimelineAsyncEventTracker._typeToInitiator.get(
        /** @type {!TimelineModel.TimelineModel.RecordType} */ (event.name));
    const isInitiator = !initiatorType;
    if (!initiatorType)
      initiatorType = /** @type {!TimelineModel.TimelineModel.RecordType} */ (event.name);
    const initiatorInfo = TimelineAsyncEventTracker._asyncEvents.get(initiatorType);
    if (!initiatorInfo)
      return;
    const id = TimelineModel.globalEventId(event, initiatorInfo.joinBy);
    if (!id)
      return;
    /** @type {!Map<string, !SDK.TracingModel.Event>|undefined} */
    const initiatorMap = this._initiatorByType.get(initiatorType);
    if (isInitiator) {
      initiatorMap.set(id, event);
      return;
    }
    const initiator = initiatorMap.get(id) || null;
    const timelineData = TimelineData.forEvent(event);
    timelineData.setInitiator(initiator);
    if (!timelineData.frameId && initiator)
      timelineData.frameId = TimelineModel.eventFrameId(initiator);
  }
};
