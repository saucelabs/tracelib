import InvalidationTrackingEvent from './timelineModel/invalidationTrackingEvent'
import ProfileNode from './profileTreeModel/profileNode'

export interface TracelogArgs {
    name?: string;
    // eslint-disable-next-line
    sort_index?: number;
    snapshot?: string;
    stackTrace?: any;
    data?: {
        args: {
            sessionId: string,
            workerThreadId: string,
            page: object,
            workerId: string
        }
    };
}

export interface EventData {
    startTime?: number;
    endTime?: number;
    cpuProfile?: object;
    lines?: number[];
    timeDeltas?: number[];
    stackTrace?: object;
    url?: string;
    frame?: string;
}

export interface Profile {
    startTime: number;
    endTime: number;
    timestamps: number[];
    samples: number[];
    lines: number[];
    nodes: ProfileNode[];
    head: ProfileNode;
    timeDeltas: number[];
}

export interface TraceEvent {
    cat?: string;
    pid: number;
    tid: number;
    ts: number;
    ph: string;
    name: string;
    args: TracelogArgs;
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

export interface PageFramePayload {
    frame: string;
    url: string;
    name: string;
    processId: number;
    processPseudoId: string;
}

export interface InvalidationCause {
    reason: string
    stackTrace: any
}

export interface InvalidationMap {
    [key: string]: InvalidationTrackingEvent[]
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

export interface BrowserFrames {
    from: number
    to: number
    main: object
    url: string
}

export interface Summary {
    scripting: number
    rendering: number
    painting: number
    system: number
    idle: number
}
