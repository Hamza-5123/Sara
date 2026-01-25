const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");

module.exports.config = {
  name: "music",
  version: "4.7.0",
  hasPermssion: 0,
  credits: "Shaan Khan",
  description: "Download Song/Video from YouTube with Shaan Khan Style",
  commandCategory: "media",
  usages: "[song name] or [song name video]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "yt-search": "",
    "path": ""
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ");

  if (!query) {
    return api.sendMessage("❌ Please provide a song name.", threadID, messageID);
  }

  const wantVideo = query.toLowerCase().endsWith(" video");
  const searchTerm = wantVideo ? query.replace(/ video$/i, "").trim() : query.trim();

  // Your requested searching message
  api.sendMessage(`✅ Apki Request Jari Hai Please wait...`, threadID, messageID);

  try {
    const searchResults = await yts(searchTerm);
    if (!searchResults.videos.length) {
      return api.sendMessage("❌ No results found.", threadID, messageID);
    }

    const video = searchResults.videos[0];
    const videoUrl = video.url;
    const title = video.title;

    const apiType = wantVideo ? 'ytv' : 'yta';
    const apiUrl = `https://api.betabotz.eu.org/api/download/${apiType}?url=${encodeURIComponent(videoUrl)}&apikey=lulu`;

    const res = await axios.get(apiUrl);
    
    if (res.data.status !== true) {
      return api.sendMessage("❌ Download link generate nahi ho saka.", threadID, messageID);
    }

    const downloadUrl = wantVideo ? res.data.result.video : res.data.result.mp3;
    const format = wantVideo ? "mp4" : "mp3";
    const cachePath = path.join(__dirname, "cache", `${Date.now()}.${format}`);

    await fs.ensureDir(path.join(__dirname, "cache"));

    const fileStream = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    await fs.writeFile(cachePath, Buffer.from(fileStream.data));

    // Final response with your custom text
    await api.sendMessage({
      body: `🎶 𝑻𝒊𝒕𝒍𝒆: ${title}\n»»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««\n🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉 ${format.toUpperCase()}`,
      attachment: fs.createReadStream(cachePath)
    }, threadID, () => {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    }, messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Server Busy ya file bohot bari hai!", threadID, messageID);
  }
};
