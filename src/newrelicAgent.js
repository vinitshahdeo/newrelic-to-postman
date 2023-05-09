const NRQL_BASE_URL = 'https://api.newrelic.com/graphql',
    POST_METHOD = 'post',
    MAX_LIMIT_ROUTES = 300, // Max 300 unique routes to avoid rate limits
    MAX_TRANSACTIONS = 10,
    DURATION = 1; // Duration for NRQL in hours

/**
 * Remove all \r or \n to transform query for request body
 *
 * @param {string} query NRQL query
 * @returns {string} NRQL query without \r or \n
 */
function _sanitize_query(query) {
    if (!query) return query;

    return query.replace(/(?:\r\n|\r|\n)/g, " ");
}

function parseNrqlResponse (nrqlResponse) {
    // @todo add proper safe checks later
    return nrqlResponse.data?.actor?.account?.nrql?.results;
}

/**
 * Make API call to endpoint.
 * @param {string} method - Either get or post based request type
 * @param {object} data - Data to send to endpoint
 * @param {string} endpoint - Endpoint to make request
 * @param {string} headers - headers
 * @returns {object} - Response in dictionary format
 */
async function makeApiCall({ method, data, endpoint, headers }) {
    const fetch = require('node-fetch');

    let requestOptions = {
        method: method,
        headers: headers,
        redirect: 'follow'
    };

    if (method == POST_METHOD) {
        requestOptions['body'] = data;
    }

    let response = await fetch(endpoint, requestOptions)
        .then((response) => {
            if (response.status === 400) {
                return {
                    'error': true,
                    'message': `Unable to fetch ${endpoint} due to bad request.`
                };
            }

            if (response.status != 200) {
                console.error(`Error while making API Call ${JSON.stringify(response)} ${(response.status)}`);
                throw (`Error while making API Call: ${JSON.stringify(response)}`);
            }
            return response.json();
        }).then(result => result)
        .catch(error => { throw (`Error in req ${error}`) });

    return response;
}

/**
 * Fetches paginated list of services from New Relic API using the provided config.
 * API Documentation: https://api.newrelic.com/docs/#/Applications/get_applications_json
 *
 * @returns {Promise<Array>} - Array of New Relic services.
 */
async function fetchNRQLResponse(options) {
    let query = `
        query {
            actor {
                account( id: ${options.accountId}) {
                    name
                    nrql(query: "
                        SELECT
                            *
                        FROM
                            Transaction
                        WHERE 
                            appId = ${options.appId}
                        AND 
                            http.statusCode is not NULL
                        AND 
                            request.method is not NULL
                        LIMIT MAX"
                    ) {
                        results
                    }
                }
                user {
                    name
                    id
                }
            }
        }`;

    // Removing all \r or \n to transform query for request body
    query = _sanitize_query(query);

    let data = JSON.stringify({ "query": query });

    let response = await makeApiCall({
        method: POST_METHOD,
        data: data,
        endpoint: NRQL_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': options.apiKey
        }
    });

    return response;
}

/**
 * Get unique routes of given service on New Relic
 *
 * @returns {Promise<Array>} - Array of routes
 */
async function getUniqueRoutes(options) {
    let query = `
        query {
            actor {
                account( id: ${options.accountId}) {
                    name
                    nrql(query: "
                        SELECT
                            uniques(name)
                        FROM
                            Transaction
                        WHERE 
                            appId = ${options.appId}
                        AND 
                            transactionType = 'Web'
                        AND 
                            http.statusCode is not NULL
                        AND 
                            request.method is not NULL
                        SINCE 
                            ${DURATION} hours ago
                        LIMIT ${MAX_LIMIT_ROUTES}"
                    ) {
                        results
                    }
                }
                user {
                    name
                    id
                }
            }
        }`;

    // Removing all \r or \n to transform query for request body
    query = _sanitize_query(query);

    const data = JSON.stringify({ "query": query }),
        nrqlResponse = await makeApiCall({
            method: POST_METHOD,
            data: data,
            endpoint: NRQL_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': options.apiKey
            }
        }),
        parsedResults = parseNrqlResponse(nrqlResponse),
        uniqueRoutes = parsedResults[0]['uniques.name'];

    return uniqueRoutes;
}

/**
 * Get unique status codes
 *
 * @returns {Promise<Array>} - Array of status codes
 */
async function getUniqueStatusCodes(options) {
    // @todo:  Handle older NR agents as well (response.status)
    let query = `
        query {
            actor {
                account( id: ${options.accountId}) {
                    name
                    nrql(query: "
                        SELECT
                            uniques(http.statusCode)
                        FROM
                            Transaction
                        WHERE 
                            appId = ${options.appId}
                        AND
                            name = ${options.name}
                        AND 
                            transactionType = 'Web'
                        AND 
                            http.statusCode is not NULL
                        AND 
                            request.method is not NULL
                        SINCE 
                            ${DURATION} hours ago
                        LIMIT MAX"
                    ) {
                        results
                    }
                }
                user {
                    name
                    id
                }
            }
        }`;

    // Removing all \r or \n to transform query for request body
    query = _sanitize_query(query);

    const data = JSON.stringify({ "query": query }),
        nrqlResponse = await makeApiCall({
            method: POST_METHOD,
            data: data,
            endpoint: NRQL_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': options.apiKey
            }
        }),
        parsedResults = parseNrqlResponse(nrqlResponse),
        uniqueStatusCodes = parsedResults[0]['uniques.http.statusCode'];

    return uniqueStatusCodes;
}

/**
 * Get unique routes
 *
 * @returns {Promise<Array>} - Array of routes
 */
async function getRouteTransactions(options) {
    // @todo:  Handle older NR agents as well (response.status)
    let query = `
        query {
            actor {
                account( id: ${options.accountId}) {
                    name
                    nrql(query: "
                        SELECT
                            *
                        FROM
                            Transaction
                        WHERE 
                            appId = ${options.appId}
                        AND
                            name = '${options.name}'
                        AND 
                            transactionType = 'Web'
                        AND 
                            http.statusCode is not NULL
                        AND 
                            request.method is not NULL
                        SINCE 
                            ${DURATION} hours ago
                        LIMIT ${MAX_TRANSACTIONS}"
                    ) {
                        results
                    }
                }
                user {
                    name
                    id
                }
            }
        }`;

    // Removing all \r or \n to transform query for request body
    query = _sanitize_query(query);

    const data = JSON.stringify({ "query": query }),
        nrqlResponse = await makeApiCall({
            method: POST_METHOD,
            data: data,
            endpoint: NRQL_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': options.apiKey
            }
        });


    return parseNrqlResponse(nrqlResponse);
}

/**
 * Get unique routes
 *
 * @returns {Promise<Array>} - Array of New Relic services.
 */
async function getAllTransactions(options) {
    const uniqueRoutes = await getUniqueRoutes(options),
        allTransactions = [];

    for (const route of uniqueRoutes) {
        const transactions = await getRouteTransactions(Object.assign({
            name: route
        }, options));

        Array.isArray(transactions) && allTransactions.push(...transactions);
    }

    return allTransactions;
}

module.exports = {
    fetchNRQLResponse,
    getUniqueRoutes,
    getUniqueStatusCodes,
    getAllTransactions
}
