import {ExternalApiProvider,ApiEdgeQueryContext,ApiEdgeQueryResponse,ApiEdgeError} from "api-core";
const request = require('request-promise-native');

export class ExpressExternalProvider extends ExternalApiProvider {
    constructor(metadata: any = null) {
        super(metadata);
    }

    url: string;
    private metadataUrl: string;

    getEntry = async (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        const response = await request({
            uri: `${this.url}/${context.id}`,
            qs: { '.context': JSON.stringify(context.toJSON()) },
            json: true
        });
        return new ApiEdgeQueryResponse(response)
    };

    listEntries = async (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        const response = await request({
            uri: this.url,
            qs: { '.context': JSON.stringify(context.toJSON()) },
            json: true
        });
        return new ApiEdgeQueryResponse(response)
    };

    createEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        body.id = body.id || context.id;
        const response = await request({
            uri: this.url,
            method: 'POST',
            qs: { '.context': JSON.stringify(context.toJSON()) },
            body,
            json: true
        });
        return new ApiEdgeQueryResponse(response)
    };

    updateEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        body.id = body.id || context.id;
        const response = await request({
            uri: this.url,
            method: 'PUT',
            body,
            json: true,
            qs: { '.context': JSON.stringify(context.toJSON()) }
        });
        return new ApiEdgeQueryResponse(response)
    };

    patchEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        body.id = body.id || context.id;
        const response = await request({
            uri: this.url,
            method: 'PATCH',
            body,
            json: true,
            qs: { '.context': JSON.stringify(context.toJSON()) }
        });
        return new ApiEdgeQueryResponse(response)
    };

    removeEntry = async (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        body.id = body.id || context.id;
        const response = await request({
            uri: this.url,
            method: 'DELETE',
            body,
            json: true,
            qs: { '.context': JSON.stringify(context.toJSON()) }
        });
        return new ApiEdgeQueryResponse(response)
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
        return new ExpressExternalProvider(metadata)
    }

    static forURL(url: string) {
        const provider = new ExpressExternalProvider();
        provider.metadataUrl = url;
        return provider
    }
}