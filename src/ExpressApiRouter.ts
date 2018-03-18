import {
    ApiEdgeError, ApiEdgeQueryResponse, ApiEdgeQueryStreamResponse, Api, ApiRequestType,
    ApiEdgeQueryContext
} from "api-core";
import {ApiQueryStringParser} from "./ApiQueryStringParser";
import * as express from "express";

const stream = require('stream'),
    destroy = require('destroy'),
    onFinished = require('on-finished'),
    pkg = require('../../package.json');

interface Upstream extends NodeJS.ReadableStream {
    isNoop: boolean;
    fatalIncomingError: () => void;
}

interface ExtendedRequest extends express.Request {
    error: ApiEdgeError|Error;
    api: Api;
    apiPath: string;
    user: any;
    file: (name: string) => Upstream;
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
        app.use(require('skipper')());

        app.all('/v:version/*', (req: ExtendedRequest, res: express.Response, next: express.NextFunction) => {
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

        app.all('/*', (req: ExtendedRequest, res: express.Response, next: express.NextFunction) => {
            if(!req.api) {
                req.api = this.defaultApi;
                req.apiPath = req.path.replace('/', '');
            }

            next()
        });

        app.get('/.api-core', async (req: ExtendedRequest, res) => {
            const url = req.api.url || '';
            const metadata = req.api.metadata() as any;
            metadata.url = url;
            metadata.provider = 'api-provider-express@' + pkg.version;
            metadata.edges.forEach((edge: any) => {
                edge.url = `${metadata.url}/${edge.pluralName}`;
                edge.provider = metadata.provider
            });
            res.json(metadata)
        });

        app.get('/.api-core/edges/:edge', async (req: ExtendedRequest, res) => {
            const edgeName = req.params.edge;
            const edge = req.api.edges.find(e => e.name === edgeName || e.pluralName === edgeName);
            if(!edge) {
                res.status(404).send("Not Found");
                return
            }

            const metadata = edge.metadata() as any;
            const url = req.api.url || '';
            metadata.url = `${url}/${edge.pluralName}`;
            metadata.provider = 'api-provider-express@' + pkg.version;

            res.json(metadata)
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

                    if(req.query['.context']) {
                        request.context = ApiEdgeQueryContext.fromJSON(JSON.parse(req.query['.context']), req.api)
                    }
                    else {
                        request.context = ApiQueryStringParser.parse(req.query, request.path)
                    }

                    if (req.body) {
                        request.body = req.body;
                    }

                    if(req.method !== "GET" && req.method !== "OPTIONS" && req.method !== "HEAD") {
                        const stream = req.file('file');
                        if(!stream.isNoop) {
                            request.stream = stream;
                        }
                        else {
                            //HACK: Skipper would throw error on timeout.
                            stream.fatalIncomingError = () => {};
                        }
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

                                if(resp.metadata.contentType) {
                                    res.setHeader('Content-Type', resp.metadata.contentType)
                                }

                                if(resp.metadata.headers) {
                                    const headerNames = Object.keys(resp.metadata.headers);
                                    for(let header of headerNames) {
                                        res.setHeader(header, resp.metadata.headers[header])
                                    }
                                }
                            }

                            if(resp instanceof ApiEdgeQueryStreamResponse) {
                                onFinished(res, () => destroy(res));

                                resp.stream.on('error', (err: Error) => {
                                    if (res.finished || res.headersSent)
                                        return;

                                    console.error(err.stack);

                                    res.status(500).send('Unable to read to provided stream.')
                                });

                                resp.stream.pipe(res)
                            }
                            else {
                                res.json(resp.data)
                            }
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