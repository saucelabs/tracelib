import { Phase } from '../tracingModel/index'
import { TracelogArgs } from '../types'

export interface EventPayload {
    cat?: string;
    pid: number;
    tid: number;
    ts: number;
    ph: Phase;
    name: string;
    args: TracelogArgs;
    dur: number;
    id: string;
    id2: {
        global?: string;
        local?: string;
    } | void;
    scope: string;
    // eslint-disable-next-line
    bind_id: string;
    s: string;
}
