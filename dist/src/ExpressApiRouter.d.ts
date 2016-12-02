/// <reference types="express" />
import { Api } from "api-core";
import * as express from "express";
export declare class ExpressApiRouter {
    defaultApi: Api;
    apis: Api[];
    private apiVersions;
    constructor(apis: Api[]);
    apply: (app: express.Router) => void;
}
