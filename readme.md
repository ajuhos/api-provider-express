# api-provider-ellipse

API provider for building api-core base APIs consumable 
via HTTP using the Ellipse framework.

## Installation

```
npm install api-provider-ellipse
```

## Usage
```javascript
const Ellipse = require('ellipse'),
      EllipseApiRouter  = require('api-provider-ellipse').EllipseApiRouter;

const API = new Api(...);

const app = new Ellipse(),
      router = new EllipseApiRouter(API);
      
router.apply(app);
app.listen(8080);
```