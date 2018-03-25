interface REPLOptions {
    includeNative?: boolean;
    includeBuiltinLibs?: boolean;
    indentation?: number;
    name?: string;
}

interface Context {}

declare class REPL {
    constructor(options: REPLOptions, ctx: Context);

    prompt(command: string, append: boolean): string;
    execute(command: string): Promise<any>;
}

export = REPL;