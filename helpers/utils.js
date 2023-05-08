const EXCLUDED_HEADERS = ['host']; // Exclude these headers in OpenAPI spec params

function hasPathParams(routePath) {
    return routePath.split('/').some(segment => segment.startsWith('{') && segment.endsWith('}'));
}

function getServers(hosts) {
    const filteredHosts = Array.from(hosts).filter((host) => {
        // If the host is an IP address, exclude it
        // @todo: exclude port as well
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
            return false;
        }
        return true;
    });

    const servers = [];

    filteredHosts.forEach((host) => {
        servers.push({
            url: host,
        });
    });

    return servers;
}

function getFileFormat (fileName) {
    if (!fileName) throw new Error('Empty file name is not allowed');

    if (fileName.endsWith('.json')) return 'json';
    
    return 'yaml';
}

function getPathParams(path) {
    const pathParams = path.match(/{(\w+)}/g) || [];

    return pathParams.map((param) => {
        return {
            name: param.slice(1, -1), in: 'path', required: true, type: 'string'
        }
    });
}

function extractPathParamNames(route) {
    const pathParams = [];
    const params = route
        .split('/')
        .filter(segment => segment.startsWith('{') && segment.endsWith('}'))
        .map(segment => segment.slice(1));

    params.forEach((param) => {
        pathParams.push({
            name: param, in: 'path', required: true, type: 'string'
        })
    });

    return pathParams;
}

function getHeadersFromTransaction(transactionData) {
    const headersRegex = /^request\.headers\.(.*)$/,
        headers = [];

    Object.keys(transactionData).forEach(key => {
        const header = headersRegex.exec(key) && headersRegex.exec(key)[1];
        if (header && !EXCLUDED_HEADERS.includes(header)) {
            // exclude host as it's added to the servers info

            const headerObj = {
                name: header,
                in: 'header',
                description: 'A header observed in New Relic traffic',
                required: true,
                type: 'string'
            }

            headers.push(headerObj);
        }
    });

    return headers;
}


function extractRoutePaths(data) {
    return data.map(transaction => {
        const name = transaction.name;
        const method = transaction.httpMethod || '';

        if (name.startsWith('WebTransaction/Custom') && method) {
            const route = name.substring('WebTransaction/Custom/'.length).split(' ')[1];
            return route ? `/${route.split('/').slice(1).join('/')}` : '/';
        }

        if (name.startsWith('WebTransaction/Expressjs') && method) {
            const route = name.substring('WebTransaction/Expressjs/'.length).split(' ')[1];
            return route ? `/${route.split('/').slice(1).join('/')}` : '/';
        }

        return name;
    });
}

/**
 * Converts a New Relic path to an OpenAPI path by replacing placeholders with path parameters.
 * :param -> {param}
 *
 * Example: GET /users/:id is converted to GET /users/{id}
 *
 * @param {string} path - The New Relic path to convert.
 * @returns {string} The corresponding OpenAPI path.
 */
function convertPath(path) {
    if (!path) return path;

    return path.replace(/:(\w+)/g, '{$1}');
}

module.exports = {
    hasPathParams,
    extractPathParamNames,
    extractRoutePaths,
    getServers,
    getHeadersFromTransaction,
    convertPath,
    getPathParams,
    getFileFormat
};
