const axios = require("axios");
const yts = require("yt-search");

const baseApiUrl = async () => {
    try {
        const base = await axios.get(`https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`);
        return base.data.api;
    } catch (e) {
        return "https://api.diptoapi.workers.dev"; // Fallback URL agar github link fail ho jaye
    }
};

(async () => {
    global.apis = {
        diptoApi: await baseApiUrl()
    };
})();

async function getStreamFromURL(url, pathName) {
    const response = await axios.get(url, { responseType: "stream" });
    response.data.path = pathName;
    return response.data;
}

function getVideoID(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

module.exports.config = {
    name: "video",
    version: "1.2.0",
    credits: "Shaan Khan",
    hasPermssion: 0,
    cooldowns: 5,
    description: "YouTube video download karein",
    commandCategory: "media",
    usages: "[video name ya link]"
};

module.exports.run = async function({ api, args, event }) {
    try {
        let videoID, searchMsg;
        const input = args[0] || "";

        // 1. YouTube ID nikalna
        if (input.includes("youtube.com") || input.includes("youtu.be")) {
            videoID = getVideoID(input);
        } 
        
        if (!videoID) {
            const query = args.join(" ");
            if (!query) return api.sendMessage("❌ Song ka naam ya YouTube link likho!", event.threadID, event.messageID);

            searchMsg = await api.sendMessage(`🔍 Searching: "${query}"...`, event.threadID);
            const result = await yts(query);
            
            if (!result.videos || result.videos.length === 0) {
                if (searchMsg) api.unsendMessage(searchMsg.messageID);
                return api.sendMessage("❌ Koi video nahi mili!", event.threadID, event.messageID);
            }
            videoID = result.videos[0].videoId;
        }

        // 2. API se download link lena
        const apiUrl = `${global.apis.diptoApi}/ytDl3?link=${videoID}&format=mp4`;
        const res = await axios.get(apiUrl);

        // API Response Check (Fixing your error here)
        if (!res.data || !res.data.data || !res.data.data.downloadLink) {
            if (searchMsg) api.unsendMessage(searchMsg.messageID);
            return api.sendMessage("⚠️ API Error: Video data nahi mil saka. Shayad video badi hai ya API down hai.", event.threadID, event.messageID);
        }

        const { title, quality, downloadLink } = res.data.data;

        if (searchMsg) api.unsendMessage(searchMsg.messageID);

        // 3. TinyURL create karna
        let shortLink = "Link not available";
        try {
            const tiny = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(downloadLink)}`);
            shortLink = tiny.data;
        } catch (e) {
            shortLink = "Error shortening link";
        }

        // 4. File bhejna
        return api.sendMessage({
            body: `🎬 Title: ${title}\n📺 Quality: ${quality}\n📥 Link: ${shortLink}`,
            attachment: await getStreamFromURL(downloadLink, `video.mp4`)
        }, event.threadID, event.messageID);

    } catch (err) {
        console.error(err);
        return api.sendMessage(`⚠️ Error: ${err.message || "Kuch galat ho gaya!"}`, event.threadID, event.messageID);
    }
};
