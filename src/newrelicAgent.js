const NRQL_BASE_URL = 'https://api.newrelic.com/graphql',
    POST_METHOD = 'post';

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

module.exports = {
    fetchNRQLResponse
}
