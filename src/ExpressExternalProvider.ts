import {
    ExternalApiProvider,
    ApiEdgeQueryContext,
    ApiEdgeQueryResponse,
    ApiEdgeError,
    ApiQueryScope,
    ApiRequestType,
    Api
} from "api-core";
import {URLSearchParams} from "url";

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
            const result = await fetch(`${this.url}/${context.id}` + new URLSearchParams({
                '.context': JSON.stringify(context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(context.identity)
            }));
            const response = await result.json();
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    listEntries = async (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        try {
            const result = await fetch(this.url + new URLSearchParams({
                '.context': JSON.stringify(context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(context.identity)
            }));
            const total = result.headers.get("x-total-count");
            const response = await result.json();
            return new ApiEdgeQueryResponse(response, total ? { pagination: { total }} : undefined);
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    createEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const result = await fetch(this.url + new URLSearchParams({
                '.context': JSON.stringify(context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(context.identity)
            }), {
                method: 'POST',
                body
            });
            const response = await result.json();
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    updateEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const result = await fetch(this.url + new URLSearchParams({
                '.context': JSON.stringify(context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(context.identity)
            }), {
                method: 'PUT',
                body
            });
            const response = await result.json();
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    patchEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const result = await fetch(this.url + new URLSearchParams({
                '.context': JSON.stringify(context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(context.identity)
            }), {
                method: 'PATCH',
                body
            });
            const response = await result.json();
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    removeEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        try {
            body.id = body.id || context.id;
            const result = await fetch(this.url + new URLSearchParams({
                '.context': JSON.stringify(context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(context.identity)
            }), {
                method: 'DELETE',
                body
            });
            const response = await result.json();
            return new ApiEdgeQueryResponse(response)
        }
        catch({ response }) {
            throw new ApiEdgeError(response.statusCode, response.statusMessage)
        }
    };

    callMethod = async (scope: ApiQueryScope): Promise<ApiEdgeQueryResponse> => {
        try {
            const result = await fetch(`${this.url}/${scope.context.id}/${scope.context.method}` + new URLSearchParams({
                '.context': JSON.stringify(scope.context.toJSON()),
                ...ExpressExternalProvider.identityToQueryString(scope.identity)
            }),{
                method: requestTypeToVerb(scope.request.type),
                body: scope.body
            });
            const contentType = result.headers.get('content-type') || '';
            const response = await result.json() as any;
            return new ApiEdgeQueryResponse(contentType.lastIndexOf('application/json',0) == 0 ? response.toString() : response, { contentType })
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
            const result = await fetch(this.metadataUrl);
            this.metadata = await result.json()
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
