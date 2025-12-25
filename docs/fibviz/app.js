const state = {
  events: new Map(),
  metrics: new Map(),
  logLines: [],
  startTimes: new Map(),
  runStart: 0,
  eventSeq: 0
};

const els = {
  nInput: document.getElementById('nInput'),
  runBtn: document.getElementById('runBtn'),
  metrics: document.getElementById('metrics'),
  charts: document.getElementById('charts'),
  log: document.getElementById('log'),
  xMode: document.getElementById('xMode'),
  eventAlgoFilters: document.getElementById('eventAlgoFilters'),
  eventStepMin: document.getElementById('eventStepMin'),
  eventStepMax: document.getElementById('eventStepMax'),
  eventDepthMin: document.getElementById('eventDepthMin'),
  eventDepthMax: document.getElementById('eventDepthMax'),
  eventSearch: document.getElementById('eventSearch'),
  eventMaxRows: document.getElementById('eventMaxRows'),
  eventTableBody: document.getElementById('eventTableBody'),
  eventCount: document.getElementById('eventCount')
};

let wasmBytes = null;

function resetState() {
  state.events.clear();
  state.metrics.clear();
  state.logLines = [];
  state.startTimes.clear();
  state.runStart = 0;
  state.eventSeq = 0;
  els.metrics.innerHTML = '';
  els.charts.innerHTML = '';
  els.log.textContent = '';
  if (els.eventTableBody) els.eventTableBody.innerHTML = '';
  if (els.eventCount) els.eventCount.textContent = '';
}

function parseLine(line) {
  if (line.startsWith('EVT ')) {
    const payload = parseKV(line.slice(4));
    const alg = payload.alg || 'unknown';
    if (!state.events.has(alg)) state.events.set(alg, []);
    state.events.get(alg).push({
      seq: state.eventSeq++,
      step: Number(payload.step || 0),
      depth: Number(payload.depth || 0),
      n: Number(payload.n || 0),
      a: Number(payload.a || 0),
      b: Number(payload.b || 0),
      val: Number(payload.val || 0),
      note: payload.note || ''
    });
  } else if (line.startsWith('METRIC ')) {
    const payload = parseKV(line.slice(7));
    const alg = payload.alg || 'unknown';
    state.metrics.set(alg, {
      steps: Number(payload.steps || 0),
      result: Number(payload.result || 0),
      durationMs: (() => {
        const start = state.startTimes.get(alg) ?? state.runStart;
        if (!start) return 0;
        return performance.now() - start;
      })()
    });
  } else if (line.startsWith('RUN ')) {
    const payload = parseKV(line.slice(4));
    const alg = payload.alg || 'unknown';
    if (!state.startTimes.has(alg)) {
      state.startTimes.set(alg, performance.now());
    }
  }
}

function parseKV(text) {
  const out = {};
  const parts = text.trim().split(/\s+/);
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (!k) continue;
    out[k] = v ?? '';
  }
  return out;
}

function buildEventAlgoFilters() {
  if (!els.eventAlgoFilters) return;
  const existing = new Set(
    Array.from(els.eventAlgoFilters.querySelectorAll('input')).map((el) => el.value)
  );
  const selected = new Set(
    Array.from(els.eventAlgoFilters.querySelectorAll('input:checked')).map((el) => el.value)
  );
  let changed = false;
  for (const alg of state.events.keys()) {
    if (!existing.has(alg)) changed = true;
  }
  if (!changed) return;
  const preserve = selected.size ? selected : null;
  els.eventAlgoFilters.innerHTML = '';
  for (const alg of state.events.keys()) {
    const label = document.createElement('label');
    label.className = 'chip';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = alg;
    input.checked = preserve ? preserve.has(alg) : true;
    input.addEventListener('change', renderEventTable);
    label.appendChild(input);
    label.appendChild(document.createTextNode(alg));
    els.eventAlgoFilters.appendChild(label);
  }
}

function eventNote(alg, evt) {
  if (evt.note) return evt.note;
  const parts = [];
  if (evt.n) parts.push(`n=${evt.n}`);
  if (alg === 'fast-doubling' && (evt.a || evt.b)) {
    parts.push(`a=${evt.a} b=${evt.b}`);
  }
  return parts.join(' ');
}

function renderEventTable() {
  if (!els.eventTableBody) return;
  buildEventAlgoFilters();
  const selectedAlgos = els.eventAlgoFilters
    ? new Set(
        Array.from(els.eventAlgoFilters.querySelectorAll('input:checked')).map((el) => el.value)
      )
    : null;
  const stepMin = Number(els.eventStepMin?.value || '');
  const stepMax = Number(els.eventStepMax?.value || '');
  const depthMin = Number(els.eventDepthMin?.value || '');
  const depthMax = Number(els.eventDepthMax?.value || '');
  const search = (els.eventSearch?.value || '').toLowerCase();
  const maxRows = Math.max(50, Number(els.eventMaxRows?.value || 400));

  const rows = [];
  for (const [alg, events] of state.events.entries()) {
    if (selectedAlgos && selectedAlgos.size && !selectedAlgos.has(alg)) continue;
    for (const evt of events) {
      const note = eventNote(alg, evt);
      if (Number.isFinite(stepMin) && String(els.eventStepMin?.value) !== '' && evt.step < stepMin) continue;
      if (Number.isFinite(stepMax) && String(els.eventStepMax?.value) !== '' && evt.step > stepMax) continue;
      if (Number.isFinite(depthMin) && String(els.eventDepthMin?.value) !== '' && evt.depth < depthMin) continue;
      if (Number.isFinite(depthMax) && String(els.eventDepthMax?.value) !== '' && evt.depth > depthMax) continue;
      if (search && !note.toLowerCase().includes(search)) continue;
      rows.push({
        seq: evt.seq,
        step: evt.step,
        depth: evt.depth,
        value: evt.val,
        alg,
        note
      });
    }
  }

  rows.sort((a, b) => a.seq - b.seq);
  const shown = rows.slice(0, maxRows);
  els.eventTableBody.innerHTML = '';
  for (const row of shown) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.step}</td>
      <td>${row.depth}</td>
      <td>${row.value}</td>
      <td>${row.alg}</td>
      <td>${row.note || ''}</td>
    `;
    els.eventTableBody.appendChild(tr);
  }
  if (els.eventCount) {
    els.eventCount.textContent = `${shown.length} / ${rows.length} events`;
  }
}

function renderMetrics() {
  els.metrics.innerHTML = '';
  const algoLinks = {
    iterative: 'https://en.wikipedia.org/wiki/Fibonacci_number#Computation_by_rounding',
    recursive: 'https://en.wikipedia.org/wiki/Fibonacci_number#Recursive_definition',
    'fast-doubling': 'https://www.nayuki.io/page/fast-fibonacci-algorithms'
  };
  for (const [alg, metric] of state.metrics.entries()) {
    const div = document.createElement('div');
    div.className = 'metric';
    const duration = metric.durationMs ? `${metric.durationMs.toFixed(1)} ms` : '—';
    const link = algoLinks[alg];
    const label = link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${alg}</a>` : alg;
    div.innerHTML = `<strong>${label}</strong><span>steps: ${metric.steps} | result: ${metric.result} | time: ${duration}</span>`;
    els.metrics.appendChild(div);
  }
}

function renderCharts() {
  els.charts.innerHTML = '';
  const mode = els.xMode ? els.xMode.value : 'step';
  for (const [alg, events] of state.events.entries()) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    const title = document.createElement('h3');
    title.textContent = alg;
    const meta = document.createElement('div');
    meta.className = 'chart-meta';
    meta.textContent = `x: ${mode}`;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 220;
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(canvas);
    els.charts.appendChild(card);
    const series = alg === 'fast-doubling'
      ? [
        { key: 'a', color: '#cc4c2a', label: 'a' },
        { key: 'b', color: '#4c9bcc', label: 'b' },
      ]
      : [{ key: 'val', color: '#cc4c2a', label: 'value' }];
    drawSeries(canvas, events, { xMode: mode, series, alg });
  }
}

function drawSeries(canvas, events, { xMode, series, alg }) {
  if (!events.length) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const padding = 20;
  const useDepth = xMode === 'depth' && events.some(e => e.depth > 0);
  const xKey = useDepth ? 'depth' : 'step';
  const maxX = Math.max(...events.map(e => e[xKey]));
  const maxVal = Math.max(...events.flatMap(e => series.map(s => e[s.key])));
  const scaleX = (canvas.width - padding * 2) / Math.max(1, maxX);
  const scaleY = (canvas.height - padding * 2) / Math.max(1, maxVal);

  // Axes
  ctx.strokeStyle = '#2d3440';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  series.forEach((seriesDef) => {
    ctx.strokeStyle = seriesDef.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    events.forEach((evt, idx) => {
      const x = padding + evt[xKey] * scaleX;
      const y = canvas.height - padding - evt[seriesDef.key] * scaleY;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw points for sparse series (e.g. fast-doubling).
    ctx.fillStyle = seriesDef.color;
    events.forEach((evt) => {
      const x = padding + evt[xKey] * scaleX;
      const y = canvas.height - padding - evt[seriesDef.key] * scaleY;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Axis labels for quick orientation.
  ctx.fillStyle = '#9aa4b2';
  ctx.font = '12px system-ui, sans-serif';
  const xLabel = xKey === 'depth' ? 'depth' : 'step';
  const yLabel = series.length > 1 ? 'a/b' : 'value';
  ctx.fillText(xLabel, canvas.width - padding - 32, canvas.height - 6);
  ctx.save();
  ctx.translate(8, padding + 8);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  // Tick labels (min/max).
  ctx.fillStyle = '#7c8796';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('0', padding - 6, canvas.height - padding + 12);
  ctx.fillText(String(maxX), canvas.width - padding - 8, canvas.height - padding + 12);
  ctx.fillText(String(maxVal), padding - 18, padding + 4);

  if (series.length > 1) {
    ctx.fillStyle = '#9aa4b2';
    ctx.font = '11px system-ui, sans-serif';
    const legendX = canvas.width - padding - 60;
    const legendY = padding + 8;
    series.forEach((seriesDef, idx) => {
      const y = legendY + idx * 14;
      ctx.fillStyle = seriesDef.color;
      ctx.fillRect(legendX, y - 8, 10, 10);
      ctx.fillStyle = '#9aa4b2';
      ctx.fillText(seriesDef.label, legendX + 14, y);
    });
  }
}

class WasmHost {
  constructor(args, onPrint) {
    this.args = args;
    this.onPrint = onPrint;
    this.memory = null;
    this.allocCursor = null;
    this.alloc = null;
    this.argsPtr = null;
    this.tempCursor = null;
    this.tempSize = 65536;
  }

  attachMemory(memory) {
    this.memory = memory;
    this.allocCursor = memory.buffer.byteLength;
    this.tempCursor = null;
  }

  attachAlloc(allocFn) {
    this.alloc = allocFn;
  }

  getImportObject() {
    return {
      host: {
        print: (ptr) => this.print(ptr),
        parse_i64: (ptr) => this.parseI64(ptr),
        i64_to_string: (value) => this.i64ToString(value),
        str_concat: (a, b) => this.strConcat(a, b),
        str_concat_temp: (a, b) => this.strConcatTemp(a, b),
        str_eq: (a, b) => this.strEq(a, b),
        temp_reset: () => this.resetTemp(),
        rand_u64: () => this.randU64(),
        args_list: () => this.argsList(),
        record_get: (recordPtr, keyPtr) => this.recordGet(recordPtr, keyPtr)
      }
    };
  }

  print(ptr) {
    const text = this.readString(ptr);
    this.onPrint(text);
    return 0n;
  }

  parseI64(ptr) {
    const text = this.readString(ptr).trim();
    const val = BigInt(Number(text));
    return val;
  }

  i64ToString(value) {
    return this.writeString(String(value));
  }

  strConcat(aPtr, bPtr) {
    const a = this.readString(aPtr);
    const b = this.readString(bPtr);
    return this.writeString(a + b);
  }

  strConcatTemp(aPtr, bPtr) {
    const a = this.readString(aPtr);
    const b = this.readString(bPtr);
    return this.writeStringTemp(a + b);
  }

  strEq(aPtr, bPtr) {
    const a = this.readString(aPtr);
    const b = this.readString(bPtr);
    return a === b ? 1n : 0n;
  }

  randU64() {
    const hi = Math.floor(Math.random() * 0x80000000);
    const lo = Math.floor(Math.random() * 0x100000000);
    return (BigInt(hi) << 32n) | BigInt(lo);
  }

  resetTemp() {
    this.tempCursor = this.getTempBase();
    return 0n;
  }

  argsList() {
    if (this.argsPtr !== null) return this.argsPtr;
    const ptrs = this.args.map((arg) => this.writeString(arg));
    const total = 8 + ptrs.length * 8;
    const base = this.writeAlloc(total);
    const view = new DataView(this.memory.buffer);
    view.setBigInt64(base, BigInt(ptrs.length), true);
    ptrs.forEach((ptr, i) => {
      view.setBigInt64(base + 8 + i * 8, ptr, true);
    });
    this.argsPtr = BigInt(base);
    return this.argsPtr;
  }

  recordGet(recordPtr, keyPtr) {
    const base = Number(recordPtr);
    const view = new DataView(this.memory.buffer);
    const len = Number(view.getBigInt64(base, true));
    const key = this.readString(keyPtr);
    for (let i = 0; i < len; i++) {
      const keyAddr = base + 8 + i * 16;
      const valAddr = base + 16 + i * 16;
      const entryKeyPtr = view.getBigInt64(keyAddr, true);
      const entryKey = this.readString(entryKeyPtr);
      if (entryKey === key) {
        return view.getBigInt64(valAddr, true);
      }
    }
    throw new Error(`record_get: missing field ${key}`);
  }

  getTempBase() {
    const base = this.memory.buffer.byteLength - this.tempSize;
    if (base < 0) {
      throw new Error(`WASM temp buffer invalid (mem=${this.memory.buffer.byteLength})`);
    }
    return base;
  }

  writeStringTemp(value) {
    const bytes = new TextEncoder().encode(value);
    const total = 8 + bytes.length;
    const p = this.writeTempAlloc(total);
    const buf = new Uint8Array(this.memory.buffer);
    const view = new DataView(this.memory.buffer);
    view.setBigInt64(p, BigInt(bytes.length), true);
    buf.set(bytes, p + 8);
    return BigInt(p);
  }

  writeTempAlloc(size) {
    if (size > this.tempSize - 8) {
      throw new Error(`WASM temp buffer overflow (size=${size})`);
    }
    const base = this.getTempBase();
    if (this.tempCursor === null || this.tempCursor < base || this.tempCursor > base + this.tempSize) {
      this.tempCursor = base;
    }
    if (this.tempCursor + size > base + this.tempSize) {
      this.tempCursor = base;
    }
    const p = this.tempCursor;
    this.tempCursor += size;
    return p;
  }

  readString(ptr) {
    const base = Number(ptr);
    const view = new DataView(this.memory.buffer);
    const len = Number(view.getBigInt64(base, true));
    const bytes = new Uint8Array(this.memory.buffer, base + 8, len);
    return new TextDecoder().decode(bytes);
  }

  writeString(value) {
    const bytes = new TextEncoder().encode(value);
    const total = 8 + bytes.length;
    const base = this.writeAlloc(total);
    const view = new DataView(this.memory.buffer);
    view.setBigInt64(base, BigInt(bytes.length), true);
    new Uint8Array(this.memory.buffer).set(bytes, base + 8);
    return BigInt(base);
  }

  writeAlloc(size) {
    if (this.alloc) {
      const ptr = Number(this.alloc(BigInt(size)));
      if (ptr <= 0) throw new Error('WASM host alloc failed');
      return ptr;
    }
    const cursor = this.allocCursor ?? this.memory.buffer.byteLength;
    const next = cursor - size;
    if (next <= 0) throw new Error('WASM host out of memory');
    this.allocCursor = next;
    return next;
  }
}

async function loadWasm() {
  if (wasmBytes) return wasmBytes;
  const res = await fetch('./fib_viz.wasm.b64');
  const b64 = await res.text();
  wasmBytes = decodeBase64(b64.trim());
  return wasmBytes;
}

function decodeBase64(input) {
  const raw = atob(input);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function runViz() {
  resetState();
  state.runStart = performance.now();
  const nVal = Math.min(35, Math.max(1, Number(els.nInput.value || 12)));
  const algs = Array.from(document.querySelectorAll('.algos input:checked')).map((el) => el.value);
  const args = [String(nVal), ...algs];
  if (els.xMode && algs.length === 1 && algs[0] === 'fast-doubling') {
    els.xMode.value = 'depth';
  }

  const host = new WasmHost(args, (line) => {
    state.logLines.push(line);
    parseLine(line);
    els.log.textContent = state.logLines.slice(-120).join('\n');
  });

  const bytes = await loadWasm();
  const result = await WebAssembly.instantiate(bytes, host.getImportObject());
  const instance = result.instance ?? result;
  host.attachMemory(instance.exports.memory);
  if (instance.exports.alloc) {
    host.attachAlloc(instance.exports.alloc);
  }
  if (!instance.exports.main) {
    throw new Error('WASM module does not export main.');
  }
  instance.exports.main();

  renderMetrics();
  renderCharts();
  renderEventTable();
}

els.runBtn.addEventListener('click', () => {
  runViz().catch((err) => {
    els.log.textContent = String(err);
  });
});

if (els.xMode) {
  els.xMode.addEventListener('change', () => {
    renderCharts();
  });
}

[
  els.eventStepMin,
  els.eventStepMax,
  els.eventDepthMin,
  els.eventDepthMax,
  els.eventSearch,
  els.eventMaxRows
].forEach((el) => {
  if (!el) return;
  el.addEventListener('input', () => {
    renderEventTable();
  });
});
