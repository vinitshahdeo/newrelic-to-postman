const _ = require("lodash"),
    hash = require("object-hash"),
    { uuid } = require('uuidv4'),
    EXCLUDED_HEADERS = ['host']; // Exclude these headers in OpenAPI spec params

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
                name: _.startCase(header).split(' ').join('-'),
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


function getHashFromRequestMeta (requestMeta) {
    const requestUrlHost = requestMeta?.url?.host[0],
        requestUrlPath = _.join(_.filter(requestMeta?.url?.path, (path) => !_.isNull(path)), '/'),
        requestUrl = `${requestUrlHost}/${requestUrlPath}`,
        requestMethod = requestMeta?.method;

    return hash({
        requestUrl,
        requestMethod
    });
}

function generateCollectionHash (collection) {
    const requestHashWithMeta = {},
        pathList = [{
            type: 'collection',
            id: collection?.info?.uid,
            index: 0
        }];

    function generateCollectionHashRecursively (item, requestHashWithMeta, pathList) {
        // Currently, we are traversing list of nested folders or requests
        if (Array.isArray(item)) {
            item.map((element, index) => generateCollectionHashRecursively(element, requestHashWithMeta, _.concat(pathList, {
                    type: 'item-group',
                    id: element?.uid,
                    index
                })));
        }

        if (!item || !_.isObject(item)) {
            return;
        }

        // At this point, we are inside collection/folder object
        if ('item' in item && item?.item) {
            generateCollectionHashRecursively(item.item, requestHashWithMeta, _.concat([], pathList));
        }

        // At this point, we are inside item object -> request
        if (!('item' in item) && ('id' in item)) {
            // At this point in code, we have the access to request meta
            // Update the type to item instead of item-group
            const lastIndex = pathList.length - 1;
            pathList[lastIndex].type = 'item';

            if (_.split(item?.request?.url?.raw, '?')[0]) {
                requestHashWithMeta[getHashFromRequestMeta(item?.request)] = {
                    headers: item?.request?.header,
                    path: pathList
                };
            }
        }
    }

    generateCollectionHashRecursively(collection, requestHashWithMeta, _.concat([], pathList));

    return requestHashWithMeta;
}

function getPatch (action, itemData, pathList) {
    itemData = _.omit(itemData, ['id', 'uid']);

    let lastIndex = pathList.length - 1,
        id = pathList[lastIndex].id,
        entity = pathList[lastIndex].type,
        identifier = pathList[lastIndex].id.split('-').slice(1).join('-');

    const itemPatch = {
            actions: [
                action
            ],
            data: itemData,
            entity,
            id,
            identifier,
            path: pathList
        };

    return itemPatch;
}

function generatePatchPayload (originalCollectionHash, externalCollection, originalCollectionId) {
    const currentPathList = [{
            type: 'collection',
            id: externalCollection?.info?.uid,
            index: 0
        }],
        patchList = [];

    function traverseCollection (item, originalCollectionHash, currentPathList) {
        // Currently, we are traversing list of nested folders or requests
        if (Array.isArray(item)) {
            item.map((element, index) => {
                traverseCollection(element, originalCollectionHash, _.concat(currentPathList, [{
                    type: 'item',
                    id: element?.uid,
                    index
                }]));
            });
        }

        if (!item || !_.isObject(item)) {
            return;
        }

        // At this point, we are inside collection/folder object
        if ('item' in item && item?.item) {
            traverseCollection(item.item, originalCollectionHash, _.concat([], currentPathList));
        }

        // At this point, we are inside item object -> request
        if (!('item' in item) && ('id' in item)) {
            // At this point in code, we have the access to request meta
            const externalRequestHashId = getHashFromRequestMeta(item?.request),
                userId = originalCollectionId.split('-')[0];

            if (!(externalRequestHashId in originalCollectionHash)) {
                // Generate the patch for new requests
                console.info('Adding a new request');

                const newRequestPath = [{
                        type: 'collection',
                        id: originalCollectionId,
                        index: 0
                    }, {
                        type: 'item',
                        id: `${userId}-${uuid()}`,
                        index: 0
                    }],
                    newRequestPatch = getPatch('create', _.assign({}, _.omit(item, ['response'])), newRequestPath);

                patchList.push(newRequestPatch);

                // Create response patch for new requests
                const responses = item?.response;

                _.each(responses, (response, index) => {
                    const newResponsePath = _.concat(newRequestPath, {
                            type: 'response',
                            id: `${userId}-${uuid()}`,
                            index
                        }),
                        responsePatch = getPatch('create', response, newResponsePath);

                    // patchList.push(responsePatch);
                });
            }
            else {
                console.info('Updating existing request');
                // Generate the patch for headers

                const originalPathList = originalCollectionHash[externalRequestHashId]?.path,
                    originalHeaders = originalCollectionHash[externalRequestHashId]?.headers,
                    newHeaders = item?.request?.header,
                    finalHeaders = _.unionWith(originalHeaders, newHeaders, _.isEqual),
                    finalHeaderData = {
                        request: {
                            header: finalHeaders
                        }
                    };

                if (!_.isEqual(originalHeaders, finalHeaders)) {
                    const updateHeadersPatch = getPatch('update', finalHeaderData, _.assign([], originalPathList));

                    patchList.push(updateHeadersPatch);
                }

                // Generate the patch for responses
                const responses = item?.response;

                _.each(responses, (response, index) => {
                    const newResponsePath = _.concat(originalPathList, {
                            type: 'response',
                            id: `${userId}-${uuid()}`,
                            index
                        }),
                        responsePatch = getPatch('create', response, newResponsePath);

                    patchList.push(responsePatch);
                });
            }
        }
    }

    traverseCollection(externalCollection, originalCollectionHash, _.concat([], currentPathList));

    return patchList;
}

function getPatchPayload (originalCollection, newCollection) {
    const originalCollectionHash = generateCollectionHash(originalCollection),
        patchList = generatePatchPayload(originalCollectionHash, newCollection, originalCollection?.info?.uid);

    return {
        "entity": {
            "version": "2.1.0"
        },
        "patches": patchList
    };
}

module.exports = {
    hasPathParams,
    extractPathParamNames,
    extractRoutePaths,
    getServers,
    getHeadersFromTransaction,
    convertPath,
    getPathParams,
    getFileFormat,
    getPatchPayload
};
