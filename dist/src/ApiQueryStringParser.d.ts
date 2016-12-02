import { ApiEdgeQueryContext, ApiRequestPath } from "api-core";
export declare class ApiQueryStringParser {
    static defaultLimit: number;
    static excludedKeys: string[];
    static parse(query: any, path: ApiRequestPath): ApiEdgeQueryContext;
}
