import { Phase } from './tracingModel/index'
import ProfileNode from './profileTreeModel/profileNode'

export interface TracelogArgs {
    name?: string;
    // eslint-disable-next-line
    sort_index?: number;
    snapshot?: string;
    stackTrace?: any;
    data?: any;
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
