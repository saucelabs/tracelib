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

export interface invalidationCause {
    reason: string
    stackTrace: any
}
