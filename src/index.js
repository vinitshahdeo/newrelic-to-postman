const express = require('express'),
    fs = require('fs'),
    newrelicAgent = require('./newrelicAgent'),
    postmanSdk = require('./postmanSdk'),
    { merge, diff } = require('./openapi'),
    YAML = require('yaml'),
    bodyParser = require('body-parser'),
    config = require('../config.json'),
    {
        generateOpenAPISpec,
        generatePostmanCollection
    } = require('./specGenerator'),
    POSTMAN_COLLECTION = 'postman-collection',
    ROOT_FILE = {
        collection: 'assets/collection',
        schema: 'assets/schema'
    },
    {getFileFormat} = require('../helpers/utils'),
    { transpile } = require('postman2openapi'),
    app = express();

app.use(bodyParser.json());

app.get('/knockknock', (req, res) => {
    res.send({
        health: 'ok'
    });
});

// Define route to get transaction data for a given app ID
app.get('/transactions/:appId', (req, res) => {
    const appId = req.params.appId,
        type = req.query.type;

    if (!appId) {
        return res.status(400).send({
            error: 'Please provide a valid New Relic App ID.'
        });
    }

    newrelicAgent.fetchNRQLResponse({
        appId,
        apiKey: config['newrelicUserApiKey'],
        accountId: config['newrelicAccountId']
    }).then((response) => {
        const nrqlResponse = response.data?.actor?.account?.nrql?.results;

        if (type === POSTMAN_COLLECTION) {
            generatePostmanCollection(nrqlResponse, (err, collection) => {
                if (err) throw err;

                // Write collection to file
                fs.writeFile(`${ROOT_FILE['collection']}/${collection.info.name}.json`, JSON.stringify(collection, null, 4), async (err) => {
                    if (err) throw err;

                    console.info('Postman collection file saved!');

                    const workspaceId = config["postmanWorkspaceId"],
                        response = await postmanSdk.createCollection({ collection }, workspaceId)

                    res.send({
                        id: response?.collection?.id,
                        content: collection,
                    });
                });
            });
        } else {
            const openApi = generateOpenAPISpec(nrqlResponse);

            // Write OpenAPI spec to file
            fs.writeFile(`${ROOT_FILE['schema']}/${openApi.info.title}.json`, JSON.stringify(openApi, null, 4), (err) => {
                if (err) throw err;

                console.info('OpenAPI spec file saved!');
                res.send(openApi);
            });
        }


    }).catch((err) => {
        console.error(err);
        res.status(500).send('Error getting transaction data from New Relic');
    });
});

// Define route to get transaction data for a given app ID
app.get('/nr-transactions/:appId', (req, res) => {
    const appId = req.params.appId,
        type = req.query.type,
        apiId = req.query.apiId;

    if (!appId) {
        return res.status(400).send({
            error: 'Please provide a valid New Relic App ID.'
        });
    }

    newrelicAgent.getAllTransactions({
        appId,
        apiKey: config['newrelicUserApiKey'],
        accountId: config['newrelicAccountId']
    }).then((response) => {
        if (type === POSTMAN_COLLECTION) {
            generatePostmanCollection(response, (err, collection) => {
                if (err) throw err;

                // Write collection to file
                fs.writeFile(`${ROOT_FILE['collection']}/${collection.info.name}.json`, JSON.stringify(collection, null, 4), async (err) => {
                    if (err) throw err;

                    console.info('Postman collection file saved!');

                    const response = await postmanSdk.createAPIExclusiveCollection(collection, apiId);

                    res.send({
                        id: response?.id,
                        content: collection,
                    });
                });
            });
        } else {
            const openApi = generateOpenAPISpec(response);

            // Write OpenAPI spec to file
            fs.writeFile(`${ROOT_FILE['schema']}/${openApi.info.title}.json`, JSON.stringify(openApi, null, 4), (err) => {
                if (err) throw err;

                console.info('OpenAPI spec file saved!');
                res.send(openApi);
            });
        }


    }).catch((err) => {
        console.error(err);
        res.status(500).send('Error getting transaction data from New Relic');
    });
});

// Sync transactions from the New Relic to Postman
app.post('/sync/:apiId', (req, res) => {
    const apiId = req.params.apiId,
        collectionId = req.body.collectionId;

    if (!apiId) {
        return res.status(400).send({
            error: 'Please provide API Id.'
        });
    }

    let format = 'json', // default format is JSON 
        fileName = 'index.json',
        newrelicSchema,
        postmanSchema,
        schemaId;
        

    postmanSdk.getCollection(collectionId)
        .then((collectionResponse) => {
            const collectionData = collectionResponse.collection;
            /**
             * This is the schema generated using collection which is created with the NR transactions
             */
            newrelicSchema = transpile(collectionData);

            return postmanSdk.getApi(apiId);
        })
        .then((api) => {
            schemaId = api?.schemas[0]?.id;
            return postmanSdk.getSchema(apiId, schemaId);
        })
        .then((schema) => {
            fileName = schema?.files?.data[0]?.name;
            format = getFileFormat(fileName);
    
            return postmanSdk.getBundledSchema(apiId, schemaId);
        })
        .then((data) => {
            postmanSchema = JSON.parse(data.content || {});

            let mergedSchema = merge(postmanSchema, newrelicSchema),
                doc = new YAML.Document(); // For yaml conversion

            if (format === 'yaml') {
                doc.contents = mergedSchema;
                mergedSchema = doc.toString();
            }
            
            // @todo: Get file name of schema before updating it
            // edge case: multi-file schema / git-linked APIs
            return postmanSdk.updateSchema(apiId, schemaId, fileName, mergedSchema, format);
        })
        .then((response) => {
            return res.send({
                sync: true,
                details: response
            });
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send(err && err.toString() || 'Error while syncing endpoints from New Relic to Postman');
        });
});

/**
 * Diff b/w an API and a collection.
 * Returns the patch which will be merged during sync
 */
app.get('/diff', (req, res) => {
    const apiId = req.query.apiId,
        collectionId = req.query.collectionId;

    if (!apiId || !collectionId) {
        return res.status(400).send({
            error: 'Please provide both API Id and Collection Id.'
        });
    }

    let newrelicSchema,
        schemaId;

    postmanSdk.getCollection(collectionId)
        .then((collectionResponse) => {
            const collectionData = collectionResponse.collection;
            /**
             * This is the schema generated using collection which is created with the NR transactions
             */
            newrelicSchema = transpile(collectionData);

            return postmanSdk.getApi(apiId);
        })
        .then((api) => {
            schemaId = api?.schemas[0]?.id;
            return postmanSdk.getBundledSchema(apiId, schemaId);
        })
        .then((data) => {
            const schemaContent = data.content,
                postmanSchema = JSON.parse(schemaContent),
                diffSchema = diff(postmanSchema, newrelicSchema)

            fs.writeFile('assets/diff/diff.json', JSON.stringify(diffSchema, null, 4), (err) => {
                if (err) throw err;
                
                console.log('Saved the diff inside assets/diff folder');

                return res.send({
                    diff: diffSchema
                });
            });
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send(err && err.toString() || 'Error while syncing endpoints from New Relic to Postman');
        });
});

app.listen(3000, () => console.log('Server running on port 3000'));
