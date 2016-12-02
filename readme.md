# api-provider-express

API provider for building api-core based APIs consumable 
via HTTP using the Express framework.

## Installation

```
npm install api-provider-express
```

## Usage
```javascript
const express = require('express'),
      ExpressApiRouter  = require('api-provider-express').ExpressApiRouter;

const API = new Api(...);

const app = express(),
      router = new ExpressApiRouter(API);
      
router.apply(app);
app.listen(8080);
```