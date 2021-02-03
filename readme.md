# api-provider-express
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fajuhos%2Fapi-provider-express.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fajuhos%2Fapi-provider-express?ref=badge_shield)


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

## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fajuhos%2Fapi-provider-express.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fajuhos%2Fapi-provider-express?ref=badge_large)