# newrelic-to-postman

An Express app to convert New Relic transactions to Open API definition or Postman collection.

🔗 **Here's the [blueprint collection](https://postman.postman.co/workspace/New-Relic-to-Postman~b1fa1e78-7d3e-4740-90a7-a758c223dc9c/collection/6186519-84509309-1661-4adb-8b51-38ddb8761ebf)**.

## Local Development

> Use Node 14 or above.

1. Install dependencies

```
npm install
```

2. Provide New Relic's user API key in the `config.json`.

```json
{
    "newrelicAccountId": 2665918,
    "newrelicUserApiKey": "XXXXXX", // replace this with your key
    "newrelicNrqlUrl": "https://api.newrelic.com/graphql"
}
```

3. Run the following command to start the server

```
npm start
```

4. Hit `htttp://localhost:3000/transactions/:appId`. Replace `appId` with the service ID from New Relic, e.g. http://localhost:3000/transactions/1032549101

> NOTE: Use `develop` branch for development.

## Directory

- The collection is created under `assets/collection` folder.
- The Open API schema is created under `assets/schema` folder.

## Example service Ids

- 964198481 : version-control-service: production
- 1032549101 : publishing-service: production
- 889348647 : watch-service: production
- 872206312: Integrations Platform service

> **NOTE:** Demo import flow with the watch service

**Here's the [blueprint collection](https://postman.postman.co/workspace/New-Relic-to-Postman~b1fa1e78-7d3e-4740-90a7-a758c223dc9c/collection/6186519-84509309-1661-4adb-8b51-38ddb8761ebf)**.
