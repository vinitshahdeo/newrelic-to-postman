const {
    extractPathParamNames,
    extractRoutePaths,
    getServers,
    hasPathParams
} = require('./utils'),
    Converter = require('openapi-to-postmanv2');

// Function to generate OpenAPI spec from transaction data
function generateOpenAPISpec(data) {
    // Initialize routes object
    const routes = {},
        hosts = new Set();

    let apiName = 'Auto generated API',
        domain = 'Postman';

    // Loop through transaction data to generate routes
    data.forEach(transaction => {
        const name = transaction['name'];
        const method = transaction['request.method'].toLowerCase();
        const status = transaction['http.statusCode'];
        apiName = transaction.appName;
        domain = transaction['tags.Domain'],
            hosts.add(transaction['request.headers.host']);

        const route = extractRoutePaths([{
            name,
            httpMethod: method
        }])[0];

        if (routes[route]) {
            // Check if method already exists for route
            if (!routes[route][method]) {
                routes[route][method] = {
                    summary: `A ${method.toUpperCase()} operation in ${apiName} API`,
                    responses: {}
                };
            }
        } else {
            routes[route] = {
                [method]: {
                    summary: `A ${method.toUpperCase()} operation in ${apiName} API`,
                    responses: {}
                }
            };
        }

        if (hasPathParams(route)) {
            routes[route]['parameters'] = extractPathParamNames(route);
        }

        // Add response for route and method
        routes[route][method].responses[status] = {
            description: `Response for ${status} response code`
        };
    });

    // Generate OpenAPI spec from routes
    const openapiSpec = {
        openapi: '3.0.0',
        info: {
            title: apiName,
            version: '1.0.0',
            description: `Endpoints hosted by ${apiName} service on New Relic.`,
            contact: {
                name: `${domain} squad`,
                email: `${domain}@postman.com`,
                url: `https://postman.slack.com/${domain}`
            }
        },
        servers: getServers(hosts),
        paths: routes
    };

    return openapiSpec;
}

function generatePostmanCollection(data, cb) {
    const spec = generateOpenAPISpec(data), // generate spec first
        config = {
            type: 'json',
            data: spec
        },
        options = {
            schemaFaker: true,
            requestNameSource: 'fallback',
            indentCharacter: ' '
        };

    Converter.convert(config, options, (err, conversionResult) => {
        if (!conversionResult.result) {
            return cb({
                error: `Could not convert, ${conversionResult.reason}`
            });
        }
        else {
            return cb(null, conversionResult.output[0].data);
        }
    });
}

module.exports = {
    generateOpenAPISpec,
    generatePostmanCollection
};
