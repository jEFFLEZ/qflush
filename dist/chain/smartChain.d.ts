export type QFlashOptions = {
    global?: Record<string, any>;
    modulePaths?: Record<string, string>;
    tokens?: Record<string, string>;
    flags?: Record<string, boolean | string>;
    detected?: Record<string, any>;
    services?: string[];
};
export declare function buildPipeline(argv: string[]): {
    pipeline: string[];
    options: {
        flags: Record<string, string | boolean>;
        modulePaths: Record<string, string>;
        tokens: Record<string, string>;
        global: any;
        services: string[];
    };
} | {
    pipeline: string[];
    options: QFlashOptions;
};
export declare function executePipeline(pipeline: string[], options: QFlashOptions): Promise<void>;
