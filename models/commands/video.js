const axios = require("axios");
const yts = require("yt-search");

const baseApiUrl = async () => {
    const base = await axios.get(`https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`);
    return base.data.api;
};

(async () => {
    global.apis = {
        diptoApi: await baseApiUrl()
    };
})();

// Local stream fetch function
async function getStreamFromURL(url, pathName) {
    const response = await axios.get(url, { responseType: "stream" });
    response.data.path = pathName;
    return response.data;
}

function getVideoID(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

module.exports.config = {
    name: "video",
    version: "1.1.0",
    credits: "Shaan Khan", // Updated Creator Name
    hasPermssion: 0,
    cooldowns: 5,
    description: "YouTube video ko URL ya name se download karein",
    commandCategory: "media",
    usages: "[YouTube URL ya song ka naam]"
};

module.exports.run = async function({ api, args, event }) {
    try {
        let videoID, searchMsg;
        const input = args[0];

        // Check agar input Direct YouTube URL hai
        if (input && (input.includes("youtube.com") || input.includes("youtu.be"))) {
            videoID = getVideoID(input);
            if (!videoID) {
                return api.sendMessage("❌ Galat YouTube URL!", event.threadID, event.messageID);
            }
        } else {
            const query = args.join(" ");
            if (!query) return api.sendMessage("❌ Song ka naam ya YouTube link do!", event.threadID, event.messageID);

            searchMsg = await api.sendMessage(`🔍 Searching: "${query}"...`, event.threadID);
            const result = await yts(query);
            
            if (!result.videos || result.videos.length === 0) {
                return api.sendMessage("❌ Koi video nahi mili!", event.threadID, event.messageID);
            }

            // Fix: Random ki jagah ab ye pehla (best match) video select karega
            const selected = result.videos[0]; 
            videoID = selected.videoId;
        }

        // API Call to get download link
        const res = await axios.get(`${global.apis.diptoApi}/ytDl3?link=${videoID}&format=mp4`);
        const { title, quality, downloadLink } = res.data.data;

        if (searchMsg?.messageID) api.unsendMessage(searchMsg.messageID);

        // TinyURL for shorter link
        const shortLink = (await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(downloadLink)}`)).data;

        return api.sendMessage({
            body: `🎬 Title: ${title}\n📺 Quality: ${quality}\n📥 Download: ${shortLink}`,
            attachment: await getStreamFromURL(downloadLink, `${title}.mp4`)
        }, event.threadID, event.messageID);

    } catch (err) {
        console.error(err);
        return api.sendMessage("⚠️ Error: " + (err.message || "Kuch galat ho gaya! API down ho sakti hai."), event.threadID, event.messageID);
    }
};
