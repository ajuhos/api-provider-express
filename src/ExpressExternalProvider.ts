import {
    ExternalApiProvider,
    ApiEdgeQueryContext,
    ApiEdgeQueryResponse,
    ApiEdgeError,
    ApiQueryScope,
    ApiRequestType,
    Api
} from "api-core";

const request = require('request-promise-native');

function requestTypeToVerb(type: ApiRequestType) {
    switch(type) {
        case ApiRequestType.Read:
            return 'GET';
        case ApiRequestType.Create:
            return 'POST';
        case ApiRequestType.Update:
            return 'PUT';
        case ApiRequestType.Patch:
            return 'PATCH';
        case ApiRequestType.Delete:
            return 'DELETE';
    }
}

export class ExpressExternalProvider extends ExternalApiProvider {
    constructor(metadata: any = null, api: Api) {
        super(metadata, api);
    }

    url: string;
    private metadataUrl: string;

    static identityToQueryString: (identity: any) => any = (identity) => ({ identity: JSON.stringify(identity) });

    getEntry = async (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        try {
            const response = await request({
                uri: `${this.url}/${context.id}`,
                qs: {
                    '.context': JSON.stringify(context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(context.identity)
                },
                json: true
            });
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    listEntries = async (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        try {
            const response = await request({
                uri: this.url,
                qs: {
                    '.context': JSON.stringify(context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(context.identity)
                },
                json: true,
                resolveWithFullResponse: true
            });
            const total = response.headers["x-total-count"];
            return new ApiEdgeQueryResponse(response.body, total ? { pagination: { total }} : undefined);
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    createEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const response = await request({
                uri: this.url,
                method: 'POST',
                qs: {
                    '.context': JSON.stringify(context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(context.identity)
                },
                body,
                json: true
            });
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    updateEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const response = await request({
                uri: this.url,
                method: 'PUT',
                body,
                json: true,
                qs: {
                    '.context': JSON.stringify(context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(context.identity)
                }
            });
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    patchEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const response = await request({
                uri: this.url,
                method: 'PATCH',
                body,
                json: true,
                qs: {
                    '.context': JSON.stringify(context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(context.identity)
                }
            });
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    removeEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const response = await request({
                uri: this.url,
                method: 'DELETE',
                body,
                json: true,
                qs: {
                    '.context': JSON.stringify(context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(context.identity)
                }
            });
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };


    callMethod = async (scope: ApiQueryScope): Promise<ApiEdgeQueryResponse> => {
        try {
            const response = await request({
                uri: this.url,
                method: requestTypeToVerb(scope.request.type),
                body: scope.body,
                json: true,
                qs: {
                    '.context': JSON.stringify(scope.context.toJSON()),
                    ...ExpressExternalProvider.identityToQueryString(scope.identity)
                }
            });
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };


    exists = async (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        throw new ApiEdgeError(500,'Not Supported')
    };

    async prepare(): Promise<void> {
        if(!this.metadata) {
            this.metadata = await request({ uri: this.metadataUrl, json: true });
        }
        this.url = this.metadata.url
    }

    static for(metadata: any) {
        return new ExpressExternalProvider(metadata, null as any as Api) // TODO ha majd hasznaljuk, valahogy kell szerezni egy Api-t
    }

    static forURL(url: string) {
        const provider = new ExpressExternalProvider(null, null as any as Api); // TODO ha majd hasznaljuk, valahogy kell szerezni egy Api-t
        provider.metadataUrl = url;
        return provider
    }
}
