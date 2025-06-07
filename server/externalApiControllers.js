const axios = require('axios');

async function searchE621(req, res) {
  const { tags } = req.query;
  if (!tags) {
    return res.status(400).json({ error: "Missing 'tags' query parameter" });
  }

  const apiUrl = `https://e621.net/posts.json?tags=${encodeURIComponent(tags)}`;
  // Replace 'YourUsernameForE621' with the actual username if available,
  // otherwise, a generic one will be used.
  const userAgent = `MyProject/1.0 (by YourUsernameForE621)`;

  try {
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': userAgent },
    });

    const transformedData = response.data.posts.map(post => ({
      id: post.id,
      file_url: post.file.url,
      tags: post.tags.general || [], // Ensure tags is an array
      score: post.score.total,
      preview_url: post.preview.url,
      source_api: 'e621'
    }));

    res.json(transformedData);
  } catch (error) {
    console.error("Error fetching from e621 API:", error.message);
    if (error.response) {
      // Forward e621's error status and data if available
      res.status(error.response.status).json({
        message: "Error fetching data from e621",
        e621_error: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(503).json({ message: "No response received from e621 API" });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ message: "Internal server error while fetching from e621" });
    }
  }
}

async function searchRule34(req, res) {
  const { tags } = req.query;
  if (!tags) {
    return res.status(400).json({ error: "Missing 'tags' query parameter" });
  }

  const apiUrl = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tags)}`;

  try {
    const response = await axios.get(apiUrl);

    // Rule34 API might return an empty response for no results, or an array.
    // It also sometimes returns a 200 OK with an object like {"message": "Not found", "success": false}
    if (!response.data || (response.data.success === false && response.data.message === "Not found")) {
        return res.json([]);
    }

    // Ensure response.data is an array before mapping
    const posts = Array.isArray(response.data) ? response.data : [];

    const transformedData = posts.map(post => ({
      id: post.id,
      file_url: post.file_url,
      tags: post.tags ? post.tags.split(" ").filter(tag => tag.trim() !== '') : [], // Split tags string into an array
      score: post.score,
      preview_url: post.preview_url,
      source_api: 'rule34'
    }));

    res.json(transformedData);
  } catch (error) {
    console.error("Error fetching from Rule34 API:", error.message);
    if (error.response) {
      res.status(error.response.status).json({
        message: "Error fetching data from Rule34",
        rule34_error: error.response.data
      });
    } else if (error.request) {
      res.status(503).json({ message: "No response received from Rule34 API" });
    } else {
      res.status(500).json({ message: "Internal server error while fetching from Rule34" });
    }
  }
}

module.exports = {
  searchE621,
  searchRule34,
};
