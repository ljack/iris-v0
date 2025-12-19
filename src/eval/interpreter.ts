
import { Program, Definition, FunctionLikeDef, Value, ModuleResolver, LinkedEnv } from '../types';
import { IFileSystem, INetwork, IInterpreter, IToolHost } from './interfaces';
import { MockFileSystem, MockNetwork } from './mocks';
import { evalExpr } from './expr';
import { evalExprSync } from './sync';
import { ProcessManager } from '../runtime/process';

export class Interpreter implements IInterpreter {
    public functions = new Map<string, FunctionLikeDef>();
    public constants = new Map<string, Value>();
    public fs: IFileSystem;
    public net: INetwork;
    public tools?: IToolHost;
    public pid: number;
    public args: string[] = [];

    private interpreterCache: Map<string, Interpreter> = new Map();

    constructor(
        public program: Program,
        fs: Record<string, string> | IFileSystem = {},
        public resolver?: ModuleResolver,
        net?: INetwork,
        tools?: IToolHost,
        cache?: Map<string, Interpreter>,
        args: string[] = []
    ) {
        this.args = args;
        if (cache) this.interpreterCache = cache;
        this.interpreterCache.set(this.program.module.name, this);

        // Backwards compatibility
        if (typeof (fs as any).readFile === 'function') {
            this.fs = fs as IFileSystem;
        } else {
            this.fs = new MockFileSystem(fs as Record<string, string>);
        }
        this.net = net || new MockNetwork();
        this.tools = tools;

        this.pid = ProcessManager.instance.getNextPid();
        ProcessManager.instance.register(this.pid);

        for (const def of program.defs) {
            if (def.kind === 'DefFn' || def.kind === 'DefTool') {
                this.functions.set(def.name, def);
            }
        }
    }

    createInterpreter(program: Program): IInterpreter {
        return new Interpreter(program, this.fs, this.resolver, this.net, this.tools, this.interpreterCache, this.args);
    }

    getInterpreter(path: string): IInterpreter | undefined {
        return this.interpreterCache.get(path);
    }

    spawn(fnName: string): number {
        // Create detached interpreter
        const child = new Interpreter(this.program, this.fs, this.resolver, this.net, this.tools, undefined, this.args);
        const childPid = child.pid;

        // Fire and forget (detached)
        Promise.resolve().then(async () => {
            try {
                await child.callFunction(fnName, []);
            } catch (e) {
                console.error(`Process ${childPid} crashed: `, e);
            }
        });

        return childPid;
    }

    async evalMain(): Promise<Value> {
        const main = this.functions.get('main');
        if (!main) throw new Error("No main function defined");
        if (main.kind !== 'DefFn') throw new Error("Main must be a function");

        if (main.eff === '!Pure' || main.eff === '!IO') {
            this.initConstantsSync();
            return evalExprSync(this, main.body, undefined);
        }

        await this.initConstants();
        return evalExpr(this, main.body, undefined);
    }

    public async callFunction(name: string, args: Value[]): Promise<Value> {
        await this.initConstants();
        const func = this.functions.get(name);
        if (!func) throw new Error(`Unknown function: ${name}`);
        if (func.kind === 'DefTool') {
            if (!this.tools) throw new Error(`Tool not implemented: ${name}`);
            return this.tools.callTool(name, args);
        }
        if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);

        let env: LinkedEnv | undefined = undefined;
        for (let i = 0; i < args.length; i++) {
            env = { name: func.args[i].name, value: args[i], parent: env };
        }
        return evalExpr(this, func.body, env);
    }

    public callFunctionSync(name: string, args: Value[]): Value {
        this.initConstantsSync();
        const func = this.functions.get(name);
        if (!func) throw new Error(`Unknown function: ${name}`);
        if (func.kind === 'DefTool') {
            if (!this.tools?.callToolSync) throw new Error(`Tool not implemented: ${name}`);
            return this.tools.callToolSync(name, args);
        }
        if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);

        let env: LinkedEnv | undefined = undefined;
        for (let i = 0; i < args.length; i++) {
            env = { name: func.args[i].name, value: args[i], parent: env };
        }
        return evalExprSync(this, func.body, env);
    }

    private async initConstants() {
        if (this.constants.size > 0) return;
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, await evalExpr(this, def.value, undefined));
            }
        }
    }

    private initConstantsSync() {
        if (this.constants.size > 0) return;
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, evalExprSync(this, def.value, undefined));
            }
        }
    }
}
