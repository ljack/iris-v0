// WASM binary emitter for a minimal subset used by the Iris compiler.
// Keeps the existing WAT renderer untouched while providing a binary form
// for smoke testing and experimentation.

export type ValType = 'i32' | 'i64';

export type WasmInstruction =
    | { kind: 'local.get'; index: number }
    | { kind: 'local.set'; index: number }
    | { kind: 'call'; index: number }
    | { kind: 'i64.const'; value: bigint | number }
    | { kind: 'i64.add' }
    | { kind: 'i64.mul' }
    | { kind: 'i64.lt_u' }
    | { kind: 'i64.ne' }
    | { kind: 'i64.eq' }
    | { kind: 'i64.load'; align?: number; offset?: number }
    | { kind: 'i64.store'; align?: number; offset?: number }
    | { kind: 'i64.store8'; align?: number; offset?: number }
    | { kind: 'i32.wrap_i64' }
    | { kind: 'if'; result?: ValType; thenInstrs: WasmInstruction[]; elseInstrs?: WasmInstruction[] }
    | { kind: 'memory.copy'; src?: number; dest?: number };

export type WasmFunc = {
    name: string;
    params: ValType[];
    result?: ValType;
    locals?: ValType[];
    body: WasmInstruction[];
};

export type WasmMemory = {
    min: number;
    max?: number;
    exportName?: string;
};

export type WasmExport = { name: string; kind: 'func' | 'memory'; index: number };

export type WasmModule = {
    funcs: WasmFunc[];
    memory?: WasmMemory;
    exports?: WasmExport[];
};

const VAL_TYPE_CODE: Record<ValType, number> = {
    i32: 0x7f,
    i64: 0x7e
};

const OPCODES: Record<string, number> = {
    'unreachable': 0x00,
    'call': 0x10,
    'local.get': 0x20,
    'local.set': 0x21,
    'i64.const': 0x42,
    'i64.eq': 0x51,
    'i64.ne': 0x52,
    'i64.lt_u': 0x55,
    'i64.add': 0x7c,
    'i64.mul': 0x7e,
    'i32.wrap_i64': 0xa7,
    'i64.load': 0x29,
    'i64.store': 0x37,
    'i64.store8': 0x3c
};

export function emitWasmBinary(module: WasmModule): Uint8Array {
    const bytes: number[] = [];

    append(bytes, 0x00, 0x61, 0x73, 0x6d); // magic
    append(bytes, 0x01, 0x00, 0x00, 0x00); // version

    const { typeSection, funcTypeIndices } = buildTypeSection(module.funcs);
    if (typeSection.length > 0) {
        emitSection(bytes, 1, typeSection);
    }

    if (module.funcs.length > 0) {
        const funcSection = buildFuncSection(funcTypeIndices);
        emitSection(bytes, 3, funcSection);
    }

    if (module.memory) {
        const memorySection = buildMemorySection(module.memory);
        emitSection(bytes, 5, memorySection);
    }

    const exportEntries = collectExports(module);
    if (exportEntries.length > 0) {
        const exportSection = buildExportSection(exportEntries);
        emitSection(bytes, 7, exportSection);
    }

    if (module.funcs.length > 0) {
        const codeSection = buildCodeSection(module.funcs);
        emitSection(bytes, 10, codeSection);
    }

    return new Uint8Array(bytes);
}

function collectExports(module: WasmModule): WasmExport[] {
    const exports: WasmExport[] = module.exports ? [...module.exports] : [];

    module.funcs.forEach((fn, index) => {
        if (!exports.some((e) => e.kind === 'func' && e.index === index)) {
            exports.push({ name: fn.name, kind: 'func', index });
        }
    });

    if (module.memory) {
        const name = module.memory.exportName ?? 'memory';
        if (!exports.some((e) => e.kind === 'memory')) {
            exports.push({ name, kind: 'memory', index: 0 });
        }
    }

    return exports;
}

function buildTypeSection(funcs: WasmFunc[]) {
    const typeEntries: number[][] = [];
    const typeKeyToIndex = new Map<string, number>();
    const funcTypeIndices: number[] = [];

    for (const fn of funcs) {
        const key = `${fn.params.join(',')}->${fn.result ?? ''}`;
        let index = typeKeyToIndex.get(key);
        if (index === undefined) {
            index = typeKeyToIndex.size;
            typeKeyToIndex.set(key, index);
            const entry: number[] = [0x60];
            encodeVector(entry, fn.params, (p) => entry.push(VAL_TYPE_CODE[p]));
            if (fn.result) {
                encodeVector(entry, [fn.result], (r) => entry.push(VAL_TYPE_CODE[r]));
            } else {
                encodeVector(entry, [], () => undefined);
            }
            typeEntries.push(entry);
        }
        funcTypeIndices.push(index);
    }

    if (typeEntries.length === 0) {
        return { typeSection: [] as number[], funcTypeIndices };
    }

    const section: number[] = [];
    encodeVector(section, typeEntries, (entry) => append(section, ...entry));

    return { typeSection: section, funcTypeIndices };
}

function buildFuncSection(funcTypeIndices: number[]): number[] {
    const section: number[] = [];
    encodeVector(section, funcTypeIndices, (idx) => encodeU32(section, idx));
    return section;
}

function buildMemorySection(memory: WasmMemory): number[] {
    const section: number[] = [];
    encodeVector(section, [memory], (mem) => {
        if (mem.max === undefined) {
            append(section, 0x00);
            encodeU32(section, mem.min);
        } else {
            append(section, 0x01);
            encodeU32(section, mem.min);
            encodeU32(section, mem.max);
        }
    });
    return section;
}

function buildExportSection(exports: WasmExport[]): number[] {
    const section: number[] = [];
    encodeVector(section, exports, (exp) => {
        encodeName(section, exp.name);
        append(section, exp.kind === 'func' ? 0x00 : 0x02);
        encodeU32(section, exp.index);
    });
    return section;
}

function buildCodeSection(funcs: WasmFunc[]): number[] {
    const bodies: number[] = [];
    encodeVector(bodies, funcs, (fn) => {
        const body: number[] = [];
        encodeLocals(body, fn.locals ?? []);
        encodeInstructions(body, fn.body);
        append(body, 0x0b); // end

        encodeU32(bodies, body.length);
        append(bodies, ...body);
    });
    return bodies;
}

function encodeLocals(out: number[], locals: ValType[]) {
    const counts = new Map<ValType, number>();
    locals.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    const entries = Array.from(counts.entries());
    encodeVector(out, entries, ([type, count]) => {
        encodeU32(out, count);
        append(out, VAL_TYPE_CODE[type]);
    });
}

function encodeInstructions(out: number[], instrs: WasmInstruction[]) {
    for (const instr of instrs) {
        switch (instr.kind) {
            case 'local.get':
            case 'local.set':
            case 'call':
                append(out, OPCODES[instr.kind]);
                encodeU32(out, instr.index);
                break;
            case 'i64.const':
                append(out, OPCODES[instr.kind]);
                encodeS64(out, BigInt(instr.value));
                break;
            case 'i64.add':
            case 'i64.mul':
            case 'i64.lt_u':
            case 'i64.ne':
            case 'i64.eq':
            case 'i32.wrap_i64':
                append(out, OPCODES[instr.kind]);
                break;
            case 'i64.load':
            case 'i64.store':
            case 'i64.store8': {
                append(out, OPCODES[instr.kind]);
                encodeU32(out, instr.align ?? 0);
                encodeU32(out, instr.offset ?? 0);
                break;
            }
            case 'if': {
                append(out, 0x04);
                if (instr.result) {
                    append(out, VAL_TYPE_CODE[instr.result]);
                } else {
                    append(out, 0x40); // empty block type
                }
                encodeInstructions(out, instr.thenInstrs);
                if (instr.elseInstrs && instr.elseInstrs.length > 0) {
                    append(out, 0x05);
                    encodeInstructions(out, instr.elseInstrs);
                }
                append(out, 0x0b);
                break;
            }
            case 'memory.copy':
                append(out, 0xfc, 0x0a);
                encodeU32(out, instr.dest ?? 0);
                encodeU32(out, instr.src ?? 0);
                break;
            default:
                throw new Error(`Unsupported instruction: ${(instr as any).kind}`);
        }
    }
}

function emitSection(out: number[], id: number, content: number[]) {
    append(out, id);
    encodeU32(out, content.length);
    append(out, ...content);
}

function encodeVector<T>(out: number[], items: T[], encodeItem: (item: T) => void) {
    encodeU32(out, items.length);
    for (const item of items) {
        encodeItem(item);
    }
}

function encodeName(out: number[], name: string) {
    const bytes = Array.from(Buffer.from(name, 'utf8'));
    encodeU32(out, bytes.length);
    append(out, ...bytes);
}

function encodeU32(out: number[], value: number) {
    let v = value >>> 0;
    do {
        let byte = v & 0x7f;
        v >>>= 7;
        if (v !== 0) byte |= 0x80;
        out.push(byte);
    } while (v !== 0);
}

function encodeS64(out: number[], value: bigint) {
    let more = true;
    let v = value;
    while (more) {
        let byte = Number(v & 0x7fn);
        v >>= 7n;
        const signBit = (byte & 0x40) !== 0;
        more = !((v === 0n && !signBit) || (v === -1n && signBit));
        if (more) byte |= 0x80;
        out.push(byte);
    }
}

function append(out: number[], ...vals: number[]) {
    out.push(...vals);
}
