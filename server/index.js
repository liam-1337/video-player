const express = require('express');
const cors = require('cors');
const { searchE621, searchRule34 } = require('./externalApiControllers');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/e621/search', searchE621);
app.get('/api/rule34/search', searchRule34);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
