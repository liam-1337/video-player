const express = require('express');
const cors = require('cors');
const path = require('path'); // Added for path manipulation
const { searchE621, searchRule34 } = require('./externalApiControllers');
const { register, login } = require('./authController'); // Import auth controllers
const { initializeDatabase } = require('./models'); // Import database initializer

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// API routes (should be before static serving and catch-all)
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/e621/search', searchE621);
app.get('/api/rule34/search', searchRule34);

// Serve static files from the React app
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
