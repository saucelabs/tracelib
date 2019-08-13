TraceLib
========

This library provides a set of models from the [`devtools-frontend`](https://github.com/ChromeDevTools/devtools-frontend) code base in order to parse trace log files.

__Note:__ This is early development and not ready to be consumed yet!

# Installation

To install the package to your project, run:

```sh
$ npm install --save tracelib
```

# Usage

## `getSummary`

Fetch time-durations of scripting, rendering, painting from tracelogs.

```js
import Tracelib from 'tracelib'
import JANK_TRACE_LOG from './jankTraceLog.json'

const tasks = new Tracelib(JANK_TRACE_LOG)
const summary = tasks.getSummary()
console.log(summary)

/**
 * output:
 * {
 *   rendering: 847.373997092247,
 *   painting: 69.94999980926514,
 *   other: 9.896000564098358,
 *   scripting: 394.4800021648407,
 *   idle: 52.38300037384033,
 *   startTime: 289959855.634,
 *   endTime: 289961229.717
 * }
```

# Test

To test this package, run:

```sh
$ npm run test
```
