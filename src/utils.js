const EXCLUDED_HEADERS = ['host']; // Exclude these headers in OpenAPI spec params

function hasPathParams(routePath) {
    return routePath.split('/').some(segment => segment.startsWith(':'));
}

function getServers(hosts) {
    const filteredHosts = Array.from(hosts).filter((host) => {
        // If the host is an IP address, exclude it
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


function extractPathParamNames(route) {
    const pathParams = [];
    const params = route
        .split('/')
        .filter(segment => segment.startsWith(':'))
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

module.exports = {
    hasPathParams,
    extractPathParamNames,
    extractRoutePaths,
    getServers,
    getHeadersFromTransaction
};
