# NewRelic to Postman

A go-to tool to import New Relic transactions and convert them into OpenAPI definitions or Postman collections, bridging live traffic data with executable APIs for streamlined debugging.

[![GitHub license](https://img.shields.io/github/license/vinitshahdeo/newrelic-to-postman.svg?style=flat&logo=github)](https://github.com/vinitshahdeo/newrelic-to-postman/blob/master/LICENSE) [![GitHub Sponsor](https://img.shields.io/badge/Sponsor-@vinitshahdeo-30363D?style=flat&logo=GitHub-Sponsors&logoColor=#EA4AA)](https://github.com/sponsors/vinitshahdeo)
   

> 🔗 **Here's the [blueprint collection](https://postman.postman.co/workspace/New-Relic-to-Postman~b1fa1e78-7d3e-4740-90a7-a758c223dc9c/collection/6186519-84509309-1661-4adb-8b51-38ddb8761ebf)**.

## Overview

This tool imports New Relic transaction data and converts it into usable formats for API documentation, testing, and debugging, such as OpenAPI definitions and Postman collections. By bridging live traffic data with executable APIs, it simplifies the debugging process and allows you to instantly test and inspect New Relic transactions in Postman or other compatible environments.

## Features
- **Real-time Data Sync**: Converts live traffic data from New Relic transactions into usable API definitions or collections.
- **OpenAPI Support**: Automatically generates OpenAPI definitions for seamless API documentation.
- **Postman Collection Export**: Creates Postman collections for quick API testing and debugging.
- **Debugging Made Easy**: Streamline troubleshooting by leveraging actual traffic data in your API testing environment.

## Prerequisites

Ensure you have **Node.js 14** or later installed for compatibility.

## Local Development

1. Install dependencies

```
npm install
```

2. Provide New Relic's user API key in the `config.json`.

```json
{
    "newrelicAccountId": 2665918,
    "newrelicUserApiKey": "XXXXXX", // Replace this with your key
    "newrelicNrqlUrl": "https://api.newrelic.com/graphql",
    "postmanApiKey": "XXXXXXX" // Replace this with your Postman API Key
}
```

3. Run the following command to start the server

```
npm start
```

4. Hit `htttp://localhost:3000/transactions/:appId`. Replace `appId` with the service ID from New Relic, e.g. http://localhost:3000/transactions/1032549101

> [!NOTE]
> Use `develop` branch for development.

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
