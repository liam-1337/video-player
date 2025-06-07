const axios = require('axios');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001/api';
let serverProcess;

function setupDummyMedia() {
  const mediaBaseDir = path.join(__dirname, 'media_library');
  const videosDir = path.join(mediaBaseDir, 'videos');
  const musicDir = path.join(mediaBaseDir, 'music');
  const imagesDir = path.join(mediaBaseDir, 'images');

  if (!fs.existsSync(mediaBaseDir)) fs.mkdirSync(mediaBaseDir, { recursive: true });
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  fs.writeFileSync(path.join(videosDir, 'movie1.mp4'), ''); // 0-byte file
  fs.writeFileSync(path.join(videosDir, 'series_ep1.mkv'), 'some data'); // Non-empty file
  fs.writeFileSync(path.join(musicDir, 'song1.mp3'), '');
  fs.writeFileSync(path.join(musicDir, 'album_track2.flac'), '');
  fs.writeFileSync(path.join(imagesDir, 'photo1.jpg'), '');
  console.log('[SmokeTest] Dummy media library structure verified/created.');
}

async function waitForServer(url, retries = 15, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get(url, { timeout: 500 });
      console.log('[SmokeTest] Server is responsive.');
      return true;
    } catch (error) {
      console.log(`[SmokeTest] Server not responsive yet (attempt ${i + 1}/${retries}). Waiting ${delay}ms... (${error.code || error.message})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  console.error('[SmokeTest] Server did not become responsive after multiple attempts.');
  return false;
}

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  function log(message) { console.log(`[SmokeTest] ${message}`); }
  function pass(testName) { log(`PASS: ${testName}`); testsPassed++; }
  function fail(testName, error) { log(`FAIL: ${testName} - ${error}`); testsFailed++; }

  try {
    log('Setting up dummy media files...');
    setupDummyMedia();

    log('Starting server for smoke test...');
    serverProcess = exec('node index.js');
    serverProcess.stdout.on('data', (data) => console.log(`[Server STDOUT]: ${data.toString()}`));
    serverProcess.stderr.on('data', (data) => console.error(`[Server STDERR]: ${data.toString()}`));

    log('Waiting for server to become responsive...');
    const serverReady = await waitForServer(`${API_BASE_URL}/health`);
    if (!serverReady) {
      throw new Error('Server failed to start or respond to health check.');
    }
    pass('Server Responsiveness & Health Check');

    let mediaItems = [];
    try {
      const response = await axios.get(`${API_BASE_URL}/media`);
      if (response.status === 200 && Array.isArray(response.data)) {
        if (response.data.length >= 5) {
             pass('Get Media List (found expected number of items)');
             mediaItems = response.data;
        } else {
             fail('Get Media List', `Expected >= 5 media items, got ${response.data.length}. Data: ${JSON.stringify(response.data)}`);
        }
      } else {
        fail('Get Media List', `Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
      }
    } catch (e) {
      fail('Get Media List', e.message);
    }

    const movieItemForTest = mediaItems.find(item => item.name === 'movie1.mp4');
    const seriesItemForTest = mediaItems.find(item => item.name === 'series_ep1.mkv'); // item.name is like 'series_ep1.mkv'
                                                                                      // item.path is like 'videos/series_ep1.mkv'
    if (movieItemForTest && movieItemForTest.path) {
        const movieRelativePath = movieItemForTest.path; // This should be 'videos/movie1.mp4' or similar
        const encodedMovieRelativePath = encodeURIComponent(movieRelativePath);
        log(`Testing /api/media/file/${encodedMovieRelativePath}`);
        try {
            const response = await axios.get(`${API_BASE_URL}/media/file/${encodedMovieRelativePath}`);
            if (response.status === 200 && response.data.name === movieItemForTest.name) {
                 pass(`Get Media File Details (${movieItemForTest.name})`);
            } else {
              fail(`Get Media File Details (${movieItemForTest.name})`, `Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
            }
        } catch (e) {
            fail(`Get Media File Details (${movieItemForTest.name})`, e.message);
        }

        log(`Testing stream for 0-byte file /api/stream/${encodedMovieRelativePath} (NO Range header)`);
        try {
          const response = await axios.get(`${API_BASE_URL}/stream/${encodedMovieRelativePath}`);
          if (response.status === 200 && response.headers['content-length'] === '0') {
             pass(`Stream 0-byte Media (${movieItemForTest.name} - 200 OK, Content-Length: 0, no Range)`);
          } else {
            fail(`Stream 0-byte Media (${movieItemForTest.name} - no Range)`, `Expected 200 & CL:0, Got Status: ${response.status}, Headers: ${JSON.stringify(response.headers)}`);
          }
        } catch (e) {
            fail(`Stream 0-byte Media (${movieItemForTest.name} - no Range)`, e.message);
        }
    } else {
        fail('Setup for movie1.mp4 tests', 'movie1.mp4 (or its path) not found in media list.');
    }

    if (seriesItemForTest && seriesItemForTest.path) {
        const seriesRelativePath = seriesItemForTest.path; // This should be 'videos/series_ep1.mkv'
        const encodedSeriesRelativePath = encodeURIComponent(seriesRelativePath);
        log(`Testing stream for non-empty file /api/stream/${encodedSeriesRelativePath}`);
        try {
          const response = await axios.get(`${API_BASE_URL}/stream/${encodedSeriesRelativePath}`, {
            headers: { 'Range': 'bytes=0-4' }, // series_ep1.mkv has "some data" (9 bytes)
          });
          // For "some data" (9 bytes), range 0-4 should give Content-Length 5 and Content-Range bytes 0-4/9
          if (response.status === 206 && response.headers['content-length'] === '5' && response.headers['content-range'] === 'bytes 0-4/9') {
             pass(`Stream Non-Empty Media (${seriesItemForTest.name} - Range 0-4)`);
          } else {
            fail(`Stream Non-Empty Media (${seriesItemForTest.name} - Range 0-4)`, `Expected 206 & CL:5 & CR:bytes 0-4/9, Got Status: ${response.status}, Headers: ${JSON.stringify(response.headers)}`);
          }
        } catch (e) {
            fail(`Stream Non-Empty Media (${seriesItemForTest.name} - Range 0-4)`, e.message);
        }
    } else {
        fail('Setup for series_ep1.mkv tests', 'series_ep1.mkv (or its path) not found in media list.');
    }

  } catch (mainError) {
    log(`Main error during smoke test: ${mainError.message}`);
    testsFailed++;
  } finally {
    log(`Smoke Test Summary: ${testsPassed} passed, ${testsFailed} failed.`);
    if (serverProcess) {
      log('Stopping server...');
      const killed = serverProcess.kill();
      log(`Server process killed: ${killed}`);
    }
    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
