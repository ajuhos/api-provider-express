"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_core_1 = require("api-core");
const ApiQueryStringParser_1 = require("./ApiQueryStringParser");
class ExpressApiRouter {
    constructor(apis) {
        this.apply = (app) => {
            app.all('/v:version/*', (req, res, next) => {
                let index = this.apiVersions.indexOf(req.params.version);
                if (index == -1) {
                    req.error = new api_core_1.ApiEdgeError(400, "Unsupported API version");
                    next();
                }
                else {
                    req.api = this.apis[index];
                    req.apiPath = req.path.replace(`/v${req.api.version}/`, '');
                    next();
                }
            });
            app.all('/*', (req, res, next) => {
                if (!req.api) {
                    req.api = this.defaultApi;
                    req.apiPath = req.path.replace('/', '');
                }
                next();
            });
            app.use((req, res, next) => {
                if (req.error || !req.api)
                    next();
                else {
                    try {
                        let request = req.api.parseRequest(req.apiPath.split('/'));
                        if (!request.path.segments.length) {
                            req.error = new api_core_1.ApiEdgeError(404, 'Not Found');
                            return next();
                        }
                        request.context = ApiQueryStringParser_1.ApiQueryStringParser.parse(req.query, request.path);
                        if (req.body) {
                            request.body = req.body;
                        }
                        switch (req.method) {
                            case "GET":
                                request.type = api_core_1.ApiRequestType.Read;
                                break;
                            case "POST":
                                request.type = api_core_1.ApiRequestType.Create;
                                break;
                            case "PUT":
                                request.type = api_core_1.ApiRequestType.Update;
                                break;
                            case "PATCH":
                                request.type = api_core_1.ApiRequestType.Patch;
                                break;
                            case "DELETE":
                                request.type = api_core_1.ApiRequestType.Delete;
                                break;
                        }
                        let query = req.api.buildQuery(request);
                        query.request = request;
                        query.execute(req.user)
                            .then((resp) => {
                            if (resp.metadata) {
                                if (resp.metadata.pagination) {
                                    const total = resp.metadata.pagination.total || 0, limit = +req.query.limit || ApiQueryStringParser_1.ApiQueryStringParser.defaultLimit;
                                    res.setHeader('X-Total-Count', req.query.page ? Math.ceil(total / limit) : total);
                                }
                            }
                            res.json(resp.data);
                        })
                            .catch((e) => {
                            req.error = e;
                            next();
                        });
                    }
                    catch (e) {
                        req.error = e;
                        next();
                    }
                }
            });
            app.use((req, res) => {
                let e = req.error;
                if (e instanceof api_core_1.ApiEdgeError) {
                    res.status(e.status).send(e.message);
                }
                else {
                    res.status(500).send("Internal Server Error");
                }
            });
        };
        this.apis = apis;
        this.defaultApi = apis[0];
        this.apiVersions = apis.map(api => api.version);
    }
}
exports.ExpressApiRouter = ExpressApiRouter;
//# sourceMappingURL=ExpressApiRouter.js.map