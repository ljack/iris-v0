
export interface IFileSystem {
    readFile(path: string): string | null; // null if not found/error
    writeFile(path: string, content: string): boolean;
    exists(path: string): boolean;
    readDir?(path: string): string[] | null; // Optional
}

export interface INetwork {
    listen(port: number): Promise<number | null>;
    accept(serverHandle: number): Promise<number | null>;
    read(handle: number): Promise<string | null>;
    write(handle: number, data: string): Promise<boolean>;
    close(handle: number): Promise<boolean>;
    connect(host: string, port: number): Promise<number | null>;
}

import { Program, Definition, FunctionLikeDef, Value, ModuleResolver } from '../types';

export interface IToolHost {
    callTool(name: string, args: Value[]): Promise<Value>;
    callToolSync?: (name: string, args: Value[]) => Value;
}

export interface IInterpreter {
    program: Program;
    functions: Map<string, FunctionLikeDef>;
    constants: Map<string, Value>;
    fs: IFileSystem;
    net: INetwork;
    tools?: IToolHost;
    resolver?: ModuleResolver;
    pid: number;
    args: string[];

    callFunction(name: string, args: Value[]): Promise<Value>;
    spawn(fnName: string): number;
    getInterpreter(path: string): IInterpreter | undefined;
    createInterpreter(program: Program): IInterpreter;
}
