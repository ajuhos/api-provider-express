import {
    ApiEdgeDefinition, ApiEdgeQueryContext, ApiRequestPath, ApiEdgeError,
    OneToOneRelation, ApiEdgeQueryFilterType
} from "api-core";

function extractWhereClauseParts(key: string): string[] {
    let parts: string[] = [];

    while(key.length) {
        if(key[0] !== '[') {
            throw new ApiEdgeError(400, `Invalid Where Clause`);
        }

        const endOfPart = key.indexOf(']');
        if(endOfPart < 2) {
            throw new ApiEdgeError(400, `Invalid Where Clause`);
        }

        parts.push(key.substring(1, endOfPart));
        key = key.substring(endOfPart + 1);
    }

    return parts
}

function processWhereClause(clause: any, context: ApiEdgeQueryContext, edge: ApiEdgeDefinition) {
    const clauseEntries = Object.keys(clause);
    if(!clauseEntries.length) throw new ApiEdgeError(400, `Invalid Where Clause`);

    clauseEntries.forEach((key) => {
        if (edge.schema.fields.indexOf(key) == -1) {
            throw new ApiEdgeError(400, `Invalid Field: ${key}`);
        }

        const operator = Object.keys(clause[key])[0];
        if(!operator) throw new ApiEdgeError(400, `Invalid Where Clause`);

        const value = clause[key][operator];

        switch (operator) {
            case 'eq':
                context.filter(key, ApiEdgeQueryFilterType.Equals, value);
                break;
            case 'ne':
                context.filter(key, ApiEdgeQueryFilterType.NotEquals, value);
                break;
            case 'gt':
                context.filter(key, ApiEdgeQueryFilterType.GreaterThan, value);
                break;
            case 'gte':
                context.filter(key, ApiEdgeQueryFilterType.GreaterThanOrEquals, value);
                break;
            case 'lt':
                context.filter(key, ApiEdgeQueryFilterType.LowerThan, value);
                break;
            case 'lte':
                context.filter(key, ApiEdgeQueryFilterType.LowerThanOrEquals, value);
                break;
            case 'like':
                context.filter(key, ApiEdgeQueryFilterType.Similar, value);
                break;
            default:
                throw new ApiEdgeError(400, `Invalid Filter Operator: ${operator}`);
        }
    })
}

export class ApiQueryStringParser {

    static defaultLimit: number = 10;
    static excludedKeys = [ "sort", "embed", "fields", "skip", "limit", "page" ];

    static parse(query: any, path: ApiRequestPath): ApiEdgeQueryContext {
        let context = new ApiEdgeQueryContext(),
            lastSegment = path.segments[path.segments.length-1];

        if(!lastSegment) {
            throw new ApiEdgeError(400, "Invalid Query Parameters");
        }

        const edge = lastSegment.edge,
            oneToOneRelations = edge.relations.filter(r => r instanceof OneToOneRelation),
                oneToOneRelationNames = oneToOneRelations.map(r => r.name);

        if (query.fields) {
            query.fields.split(',').forEach((field: string) => {
                if(edge.schema.fields.indexOf(field) == -1) {
                    throw new ApiEdgeError(400, `Invalid Field: ${field}`);
                }

                context.field(field)
            })
        }

        if (query.embed) {
            query.embed.split(',').forEach((field: string) => {
                const relationId = oneToOneRelationNames.indexOf(field);

                if(relationId == -1) {
                    throw new ApiEdgeError(400, `Invalid Related Field: ${field}`);
                }

                context.populate(oneToOneRelations[relationId])
            })
        }

        if(query.sort) {
            query.sort.split(',').forEach((s: string) => {
                const field = s.substring(s[0] == '-' ? 1 : 0),
                    direction = s[0] !== '-';

                if(edge.schema.fields.indexOf(field) == -1) {
                    throw new ApiEdgeError(400, `Invalid Field: ${field}`);
                }

                context.sort(field, direction);
            })
        }


        let limit = +query.limit,
            skip = +query.skip,
            page = +query.page;

        if(limit === limit ||
            skip === skip ||
            page === page) {
            limit = limit || ApiQueryStringParser.defaultLimit;
            if(page) skip = (page-1) * limit;
            else skip = skip || 0;

            context.paginate(skip, limit);
        }

        Object.keys(query).forEach(key => {
            if(ApiQueryStringParser.excludedKeys.indexOf(key) == -1) {
                const value = query[key];

                if(key.substring(0, 5) == "where") {
                    key = key.substring(5);

                    if(key) {
                        const parts = extractWhereClauseParts(key);
                        if (parts.length == 1) {
                            key = parts[0];

                            if (edge.schema.fields.indexOf(key) == -1) {
                                throw new ApiEdgeError(400, `Invalid Field: ${key}`);
                            }

                            context.filter(key, ApiEdgeQueryFilterType.Equals, value)
                        }
                        else if (parts.length == 2) {
                            key = parts[1];

                            if (edge.schema.fields.indexOf(key) == -1) {
                                throw new ApiEdgeError(400, `Invalid Field: ${key}`);
                            }

                            switch (parts[0]) {
                                case 'eq':
                                    context.filter(key, ApiEdgeQueryFilterType.Equals, value);
                                    break;
                                case 'ne':
                                    context.filter(key, ApiEdgeQueryFilterType.NotEquals, value);
                                    break;
                                case 'gt':
                                    context.filter(key, ApiEdgeQueryFilterType.GreaterThan, value);
                                    break;
                                case 'gte':
                                    context.filter(key, ApiEdgeQueryFilterType.GreaterThanOrEquals, value);
                                    break;
                                case 'lt':
                                    context.filter(key, ApiEdgeQueryFilterType.LowerThan, value);
                                    break;
                                case 'lte':
                                    context.filter(key, ApiEdgeQueryFilterType.LowerThanOrEquals, value);
                                    break;
                                default:
                                    throw new ApiEdgeError(400, `Invalid Filter Operator: ${parts[0]}`);
                            }
                        }
                    }
                    else {
                        processWhereClause(value, context, edge)
                    }
                }
                else {
                    if(edge.schema.fields.indexOf(key) == -1) {
                        throw new ApiEdgeError(400, `Invalid Field: ${key}`);
                    }

                    context.filter(key, ApiEdgeQueryFilterType.Equals, value)
                }
            }
        });

        return context
    }

}
