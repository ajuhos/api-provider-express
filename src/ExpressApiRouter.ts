import {ApiEdgeError, ApiEdgeQueryResponse, Api, ApiRequestType} from "api-core";
import {ApiQueryStringParser} from "./ApiQueryStringParser";
import * as express from "express";

interface ExtendedRequest extends express.Request {
    error: ApiEdgeError|Error;
    api: Api;
    apiPath: string;
    user: any;
}

export class ExpressApiRouter {

    defaultApi: Api;
    apis: Api[];

    private apiVersions: string[];

    constructor(apis: Api[]) {
        this.apis = apis;
        this.defaultApi = apis[0];

        this.apiVersions = apis.map(api => api.version);
    }

    apply = (app: express.Router) => {
        app.use('/v:version/*', (req: ExtendedRequest, res: express.Response, next: express.NextFunction) => {
            let index = this.apiVersions.indexOf(req.params.version);
            if(index == -1) {
                req.error = new ApiEdgeError(400, "Unsupported API version");
                next()
            }
            else {
                req.api = this.apis[index];
                req.apiPath = req.path.replace(`/v${req.api.version}/`, '');
                next()
            }
        });

        app.use('/*', (req: ExtendedRequest, res: express.Response, next: express.NextFunction) => {
            if(!req.api) {
                req.api = this.defaultApi;
                req.apiPath = req.path.replace('/', '');
            }

            next()
        });

        app.use((req: ExtendedRequest, res: express.Response, next: express.NextFunction) => {
            if(req.error || !req.api) next();
            else {
                try {
                    let request = req.api.parseRequest(req.apiPath.split('/'));

                    if(!request.path.segments.length) {
                        req.error = new ApiEdgeError(404, 'Not Found');
                        return next()
                    }

                    request.context = ApiQueryStringParser.parse(req.query, request.path);

                    if (req.body) {
                        request.body = req.body;
                    }

                    switch(req.method) {
                        case "GET":
                            request.type = ApiRequestType.Read;
                            break;
                        case "POST":
                            request.type = ApiRequestType.Create;
                            break;
                        case "PUT":
                            request.type = ApiRequestType.Update;
                            break;
                        case "PATCH":
                            request.type = ApiRequestType.Patch;
                            break;
                        case "DELETE":
                            request.type = ApiRequestType.Delete;
                            break;
                    }

                    let query = req.api.buildQuery(request);
                    query.request = request;

                    //TODO: req.user - Is this an acceptable solution?
                    query.execute(req.user)
                        .then((resp: ApiEdgeQueryResponse) => {
                            if(resp.metadata) {
                                if(resp.metadata.pagination) {
                                    const total = resp.metadata.pagination.total || 0,
                                        limit = +req.query.limit || ApiQueryStringParser.defaultLimit;
                                    res.setHeader('X-Total-Count', req.query.page ? Math.ceil(total / limit) : total);
                                }
                            }

                            res.json(resp.data)
                        })
                        .catch((e: any) => {
                            req.error = e;
                            next()
                        })
                }
                catch (e) {
                    req.error = e;
                    next()
                }
            }
        });

        app.use((req: ExtendedRequest, res: express.Response) => {
            let e = req.error;
            if(e instanceof ApiEdgeError) {
                res.status(e.status).send(e.message)
            }
            else {
                res.status(500).send("Internal Server Error")
            }
        });
    }
}