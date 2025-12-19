
import { Program, FunctionLikeDef, Value, ModuleResolver } from '../types';
import { IFileSystem, INetwork } from './interfaces';

export interface InterpreterContext {
    program: Program;
    functions: Map<string, FunctionLikeDef>;
    constants: Map<string, Value>;
    fs: IFileSystem;
    net: INetwork;
    resolver?: ModuleResolver;
    pid: number;
    args: string[];

    // Capability to spawn a new process/interpreter
    spawn(fnName: string): number;
}
