const { TuskDrift } = require("@use-tusk/drift-node-sdk");

TuskDrift.initialize({
  apiKey: "tusk-9b03ffcacb285a6e3ca4ba8e883ba4ce",
  env: "local",
  logLevel: "debug",
});

// Note: If we have app.get stuff before we await TuskDrift, it fails to start

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. GET /api/status - Endpoint that returns JSON
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Express Sample Server',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// 2. GET /api/random-user - Endpoint that makes an external request
app.get('/api/random-user', async (req, res) => {
  try {
    const response = await axios.get('https://randomuser.me/api/');
    const userData = response.data.results[0];

    res.json({
      name: `${userData.name.first} ${userData.name.last}`,
      email: userData.email,
      location: `${userData.location.city}, ${userData.location.country}`,
      picture: userData.picture.thumbnail
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch random user',
      message: error.message
    });
  }
});

// 3. GET /api/weather-activity - Endpoint with business logic and multiple API calls
app.get('/api/weather-activity', async (req, res) => {
  try {
    // First API call: Get user's location from IP
    const locationResponse = await axios.get('http://ip-api.com/json/');
    const { city, lat, lon, country } = locationResponse.data;

    // Business logic: Determine activity based on location
    const isCoastal = Math.abs(lon) > 50 || Math.abs(lat) < 30;

    // Second API call: Get weather for the location
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const weather = weatherResponse.data.current_weather;

    // Business logic: Recommend activity based on weather
    let recommendedActivity = 'Play a board game';
    if (weather.temperature > 40) {
      recommendedActivity = 'Too hot - stay indoors';
    } else if (weather.temperature > 20 && weather.windspeed < 20) {
      recommendedActivity = isCoastal ? 'Beach day!' : 'Perfect for hiking!';
    } else if (weather.temperature < 10) {
      recommendedActivity = 'Hot chocolate weather';
    } else if (weather.windspeed > 30) {
      recommendedActivity = 'Too windy - indoor activities recommended';
    } else {
      recommendedActivity = 'Nice day for a walk';
    }

    // Third API call: Get a random activity suggestion
    const activityResponse = await axios.get('https://bored-api.appbrewery.com/random');
    const alternativeActivity = activityResponse.data;

    res.json({
      location: {
        city,
        country,
        coordinates: { lat, lon },
        isCoastal
      },
      weather: {
        temperature: weather.temperature,
        windspeed: weather.windspeed,
        weathercode: weather.weathercode,
        time: weather.time
      },
      recommendations: {
        weatherBased: recommendedActivity,
        alternative: {
          activity: alternativeActivity.activity,
          type: alternativeActivity.type,
          participants: alternativeActivity.participants
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get weather activity recommendation',
      message: error.message
    });
  }
});

// 4. GET /api/post/:id - Get post with comments
app.get('/api/post/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch post and comments in parallel
    const [postResponse, commentsResponse] = await Promise.all([
      axios.get(`https://jsonplaceholder.typicode.com/posts/${id}`),
      axios.get(`https://jsonplaceholder.typicode.com/posts/${id}/comments`)
    ]);

    res.json({
      post: postResponse.data,
      comments: commentsResponse.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post data' });
  }
});

// 5. POST /api/create-post - Create a post
app.post('/api/create-post', async (req, res) => {
  const postTitle = req.body?.title;
  const postBody = req.body?.body;
  const response = await axios.post('https://jsonplaceholder.typicode.com/posts', { title: postTitle, body: postBody });

  const readableId = `${response.data.id}-${response.data.title?.toLowerCase().replace(/ /g, '-')}`;
  res.json({
    id: response.data.id,
    readableId: readableId,
    title: response.data.title,
    body: response.data.body
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});


const main = async () => {  
  // Start server
  app.listen(PORT, () => {
    // Mark app as ready after server is listening
    TuskDrift.markAppAsReady();
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('  GET /api/status           - Returns server status JSON');
    console.log('  GET /api/random-user      - Fetches random user from external API');
    console.log('  GET /api/weather-activity - Multiple API calls with business logic');
    console.log('  GET /api/post/:id         - Get post with comments');
    console.log('  POST /api/create-post     - Creates a post with JSONPlaceholder');
    console.log('  GET /health               - Health check endpoint');
  });
};

main();