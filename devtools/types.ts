import InvalidationTrackingEvent from './timelineModel/invalidationTrackingEvent'
import PageFrame, { PageFrameProcess } from './timelineModel/pageFrame'
import ProfileNode from './profileTreeModel/profileNode'
import Event from './tracingModel/event'
import TimelineFrame from './timelineModel/timelineFrame/timelineFrame'
import Thread from './tracingModel/thread'
import TimelineRecordStyle from './timelineModel/timelineModelFilter/timelineRecordStyle'
import TimelineCategory from './timelineModel/timelineModelFilter/timelineCategory'
import Counter from './timelineModel/counterGraph/counter'

export interface TracelogArgs {
    name?: string;
    // eslint-disable-next-line
    sort_index?: number;
    snapshot?: string;
    stackTrace?: any;
    data?: {
        args: Record<string, EventData>
    };
}

export interface PageFramePayload {
    frameId: string;
    url: string;
    name: string;
    children: PageFrame[];
    parent: string;
    processes: PageFrameProcess[];
    deletedTime: number;
}

export interface EventData {
    startTime?: number;
    endTime?: number;
    finishTime?: number;
    cpuProfile?: Profile;
    lines?: number[];
    timeDeltas?: number[];
    stackTrace?: string[];
    url?: string;
    frame?: string;
    nodeId?: number;
    name?: string;
    nodeName?: string;
    invalidationSet?: number;
    invalidatedSelectorId?: string;
    layerId?: string;
    layerTreeId?: number;
    changedId?: string;
    workerThreadId?: number;
    processId?: number;
    workerId?: string;
    processPseudoId?: string;
    frameTreeNodeId?: number;
    persistentIds?: number[];
    changedClass?: string;
    changedAttribute?: string;
    changedPseudo?: string;
    selectorPart?: string;
    extraData?: string;
    invalidationList?: InvalidationMap[];
    reason?: string;
    mimeType?: string;
    scriptLine?: number;
    scriptName?: string;
    lineNumber?: number;
    decodedBodyLength?: number;
    encodedDataLength?: number;
    requestMethod?: string;
    timing?: Timing;
    fromServiceWorker?: boolean;
    fromCache?: boolean;
    priority?: ResourcePriority;
    isMainFrame?: boolean;
    allottedMilliseconds?: number;
    sessionId?: string;
    page?: boolean;
    INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT?: string;
    INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT?: { time: number };
    frames?: PageFramePayload[];
    // eslint-disable-next-line
    sort_index?: number;
    snapshot?: string;
    sourceFrameNumber?: number;
    needsBeginFrame?: any; // todo fix type here
    frameId?: number | undefined;
    parent?: string;
}

export interface Profile {
    startTime?: number;
    endTime?: number;
    timestamps?: number[];
    samples?: number[];
    lines?: number[];
    nodes?: ProfileNode[];
    head?: ProfileNode;
    timeDeltas?: number[];
}

export interface TraceEvent {
    cat?: string;
    pid: number;
    tid: number;
    ts: number;
    ph: string;
    name: string;
    args: EventData;
    dur?: number;
    id?: string;
    id2?: {
        global?: string;
        local?: string;
    } | void;
    scope?: string;
    // eslint-disable-next-line
    bind_id?: string;
    s?: string;
}

export interface InvalidationCause {
    reason: string
    stackTrace: any
}

export interface InvalidationMap {
    [key: string]: InvalidationTrackingEvent | string | number
}

export interface Timing {
    blocked: number;
    dns: number;
    ssl: number;
    connect: number;
    send: number;
    wait: number;
    receive: number;
    // eslint-disable-next-line
    _blocked_queueing: number;
    // eslint-disable-next-line
    _blocked_proxy: (number|undefined);
    pushStart: number;
    requestTime: number;
}

export enum ResourcePriority {
    VeryLow, Low, Medium, High, VeryHigh
}

export interface CallFrame {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
}

export enum RecordType {
    Task = 'RunTask',
    Program = 'Program',
    EventDispatch = 'EventDispatch',

    GPUTask = 'GPUTask',

    Animation = 'Animation',
    RequestMainThreadFrame = 'RequestMainThreadFrame',
    BeginFrame = 'BeginFrame',
    NeedsBeginFrameChanged = 'NeedsBeginFrameChanged',
    BeginMainThreadFrame = 'BeginMainThreadFrame',
    ActivateLayerTree = 'ActivateLayerTree',
    DrawFrame = 'DrawFrame',
    HitTest = 'HitTest',
    ScheduleStyleRecalculation = 'ScheduleStyleRecalculation',
    RecalculateStyles = 'RecalculateStyles', // For backwards compatibility only, now replaced by UpdateLayoutTree.
    UpdateLayoutTree = 'UpdateLayoutTree',
    InvalidateLayout = 'InvalidateLayout',
    Layout = 'Layout',
    UpdateLayer = 'UpdateLayer',
    UpdateLayerTree = 'UpdateLayerTree',
    PaintSetup = 'PaintSetup',
    Paint = 'Paint',
    PaintImage = 'PaintImage',
    Rasterize = 'Rasterize',
    RasterTask = 'RasterTask',
    ScrollLayer = 'ScrollLayer',
    CompositeLayers = 'CompositeLayers',

    ScheduleStyleInvalidationTracking = 'ScheduleStyleInvalidationTracking',
    StyleRecalcInvalidationTracking = 'StyleRecalcInvalidationTracking',
    StyleInvalidatorInvalidationTracking = 'StyleInvalidatorInvalidationTracking',
    LayoutInvalidationTracking = 'LayoutInvalidationTracking',

    ParseHTML = 'ParseHTML',
    ParseAuthorStyleSheet = 'ParseAuthorStyleSheet',

    TimerInstall = 'TimerInstall',
    TimerRemove = 'TimerRemove',
    TimerFire = 'TimerFire',

    XHRReadyStateChange = 'XHRReadyStateChange',
    XHRLoad = 'XHRLoad',
    CompileScript = 'v8.compile',
    EvaluateScript = 'EvaluateScript',
    CompileModule = 'v8.compileModule',
    EvaluateModule = 'v8.evaluateModule',
    WasmStreamFromResponseCallback = 'v8.wasm.streamFromResponseCallback',
    WasmCompiledModule = 'v8.wasm.compiledModule',
    WasmCachedModule = 'v8.wasm.cachedModule',
    WasmModuleCacheHit = 'v8.wasm.moduleCacheHit',
    WasmModuleCacheInvalid = 'v8.wasm.moduleCacheInvalid',

    FrameStartedLoading = 'FrameStartedLoading',
    CommitLoad = 'CommitLoad',
    MarkLoad = 'MarkLoad',
    MarkDOMContent = 'MarkDOMContent',
    MarkFirstPaint = 'firstPaint',
    MarkFCP = 'firstContentfulPaint',
    MarkFMP = 'firstMeaningfulPaint',

    TimeStamp = 'TimeStamp',
    ConsoleTime = 'ConsoleTime',
    UserTiming = 'UserTiming',

    ResourceSendRequest = 'ResourceSendRequest',
    ResourceReceiveResponse = 'ResourceReceiveResponse',
    ResourceReceivedData = 'ResourceReceivedData',
    ResourceFinish = 'ResourceFinish',

    RunMicrotasks = 'RunMicrotasks',
    FunctionCall = 'FunctionCall',
    GCEvent = 'GCEvent', // For backwards compatibility only, now replaced by MinorGC/MajorGC.
    MajorGC = 'MajorGC',
    MinorGC = 'MinorGC',
    JSFrame = 'JSFrame',
    JSSample = 'JSSample',
    // V8Sample events are coming from tracing and contain raw stacks with function addresses.
    // After being processed with help of JitCodeAdded and JitCodeMoved events they
    // get translated into function infos and stored as stacks in JSSample events.
    V8Sample = 'V8Sample',
    JitCodeAdded = 'JitCodeAdded',
    JitCodeMoved = 'JitCodeMoved',
    ParseScriptOnBackground = 'v8.parseOnBackground',
    V8Execute = 'V8.Execute',

    UpdateCounters = 'UpdateCounters',

    RequestAnimationFrame = 'RequestAnimationFrame',
    CancelAnimationFrame = 'CancelAnimationFrame',
    FireAnimationFrame = 'FireAnimationFrame',

    RequestIdleCallback = 'RequestIdleCallback',
    CancelIdleCallback = 'CancelIdleCallback',
    FireIdleCallback = 'FireIdleCallback',

    WebSocketCreate = 'WebSocketCreate',
    WebSocketSendHandshakeRequest = 'WebSocketSendHandshakeRequest',
    WebSocketReceiveHandshakeResponse = 'WebSocketReceiveHandshakeResponse',
    WebSocketDestroy = 'WebSocketDestroy',

    EmbedderCallback = 'EmbedderCallback',

    SetLayerTreeId = 'SetLayerTreeId',
    TracingStartedInPage = 'TracingStartedInPage',
    TracingSessionIdForWorker = 'TracingSessionIdForWorker',

    DecodeImage = 'Decode Image',
    ResizeImage = 'Resize Image',
    DrawLazyPixelRef = 'Draw LazyPixelRef',
    DecodeLazyPixelRef = 'Decode LazyPixelRef',

    LazyPixelRef = 'LazyPixelRef',
    LayerTreeHostImplSnapshot = 'cc::LayerTreeHostImpl',
    PictureSnapshot = 'cc::Picture',
    DisplayItemListSnapshot = 'cc::DisplayItemList',
    LatencyInfo = 'LatencyInfo',
    LatencyInfoFlow = 'LatencyInfo.Flow',
    InputLatencyMouseMove = 'InputLatency::MouseMove',
    InputLatencyMouseWheel = 'InputLatency::MouseWheel',
    ImplSideFling = 'InputHandlerProxy::HandleGestureFling::started',
    GCCollectGarbage = 'BlinkGC.AtomicPhase',

    CryptoDoEncrypt = 'DoEncrypt',
    CryptoDoEncryptReply = 'DoEncryptReply',
    CryptoDoDecrypt = 'DoDecrypt',
    CryptoDoDecryptReply = 'DoDecryptReply',
    CryptoDoDigest = 'DoDigest',
    CryptoDoDigestReply = 'DoDigestReply',
    CryptoDoSign = 'DoSign',
    CryptoDoSignReply = 'DoSignReply',
    CryptoDoVerify = 'DoVerify',
    CryptoDoVerifyReply = 'DoVerifyReply',

    // CpuProfile is a virtual event created on frontend to support
    // serialization of CPU Profiles within tracing timeline data.
    CpuProfile = 'CpuProfile',
    Profile = 'Profile',

    AsyncTask = 'AsyncTask',
}

export enum Category {
    Console = 'blink.console',
    UserTiming = 'blink.user_timing',
    LatencyInfo = 'latencyInfo',
}

export enum WarningType {
    LongTask = 'LongTask',
    ForcedStyle = 'ForcedStyle',
    ForcedLayout = 'ForcedLayout',
    IdleDeadlineExceeded = 'IdleDeadlineExceeded',
    LongHandler = 'LongHandler',
    LongRecurringHandler = 'LongRecurringHandler',
    V8Deopt = 'V8Deopt',
}

export enum DevToolsMetadataEvent {
    TracingStartedInBrowser = 'TracingStartedInBrowser',
    TracingStartedInPage = 'TracingStartedInPage',
    TracingSessionIdForWorker = 'TracingSessionIdForWorker',
    FrameCommittedInBrowser = 'FrameCommittedInBrowser',
    ProcessReadyInBrowser = 'ProcessReadyInBrowser',
    FrameDeletedInBrowser = 'FrameDeletedInBrowser',
}

export enum Thresholds {
    LongTask = 200,
    Handler = 150,
    RecurringHandler = 50,
    ForcedLayout = 30,
    IdleCallbackAddon = 5,
}

export interface MetadataEvents {
    page: Event[]
    workers: Event[]
}

export interface Range {
    from: number
    to: number
}

export interface LayoutInvalidationMap {
    [key: string]: Event
}

export interface TimeByCategory {
    [key: string]: number
}

export interface BrowserFrames {
    from: number
    to: number
    main: boolean
    url: string
}

export interface Summary {
    scripting: number
    rendering: number
    painting: number
    system: number
    idle: number
}

export interface FPS {
    fps: number
}

export interface PicturePromise {
    rect: number[],
    serializedPicture: string
}

export interface FrameById {
    [key: number]: TimelineFrame
}

export interface ThreadData {
    thread: Thread,
    time: number
}

export enum TimelineSelectionType {
    Frame,
    NetworkRequest,
    TraceEvent,
    Range
};

export interface StatsObject {
    [key: string]: number
}

export interface TimelineRecordObject {
    [key: string]: TimelineRecordStyle
}

export interface TimelineCategoryObject {
    [key: string]: TimelineCategory
}

export enum NetworkCategory {
    HTML,
    Script,
    Style,
    Media,
    Other
};

export interface StatsArray {
    [key: string]: {
        time: number[],
        value: number[]
    }
}

export interface CountersObject {
    [key: string]: Counter
}

export interface CountersValuesTimestamp {
    times: number[],
    values: number[]
}

export interface CountersData {
    [key: string]: CountersValuesTimestamp
}
