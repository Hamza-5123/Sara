const axios = require("axios");
const yts = require("yt-search");

// 🔐 Credits Lock Check
function checkCredits() {
    const correctCredits = "Shaan Khan"; 
    if (module.exports.config.credits !== correctCredits) {
        throw new Error("❌ Credits Locked By Shaan Khan");
    }
}

const baseApiUrl = async () => {
    const base = await axios.get(`https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`);
    return base.data.api;
};

async function getStreamFromURL(url, pathName) {
    const response = await axios.get(url, { responseType: "stream" });
    response.data.path = pathName;
    return response.data;
}

module.exports.config = {
    name: "music", 
    version: "1.2.4",
    credits: "Shaan Khan", 
    hasPermssion: 0,
    cooldowns: 5,
    description: "YouTube official audio downloader with API status check",
    commandCategory: "media",
    usages: "[Song name or URL]"
};

module.exports.run = async function({ api, args, event }) {
    const { threadID, messageID } = event;
    let searchMsg;

    try {
        checkCredits(); 
        const query = args.join(" ");
        if (!query) return api.sendMessage("❌ Song ka naam likho!", threadID, messageID);

        searchMsg = await api.sendMessage(`⏳ Processing: "${query}"...`, threadID);

        // API Base URL fetching
        const apiBase = await baseApiUrl();
        
        // Searching Video
        const result = await yts(query);
        if (!result.videos.length) {
            return api.sendMessage("❌ YouTube par kuch nahi mila!", threadID, messageID);
        }
        
        const video = result.videos[0];
        const videoID = video.videoId;

        // API Call to get download link
        const res = await axios.get(`${apiBase}/ytDl3?link=${videoID}&format=mp3`);
        
        if (!res.data || !res.data.data || !res.data.data.downloadLink) {
            throw new Error("API ne download link nahi diya.");
        }

        const downloadLink = res.data.data.downloadLink;
        const title = res.data.data.title || video.title;

        // Unsend searching message
        if (searchMsg?.messageID) api.unsendMessage(searchMsg.messageID);

        // Sending Audio File
        await api.sendMessage({
            body: `🎵 Title: ${title}\n\n✅ File bheji ja rahi hai...`,
            attachment: await getStreamFromURL(downloadLink, `${title}.mp3`)
        }, threadID, messageID);

    } catch (err) {
        console.error(err);
        if (searchMsg?.messageID) api.unsendMessage(searchMsg.messageID);
        
        // Specific error for large files
        if (err.response && err.response.status === 413 || err.message.includes("large")) {
            return api.sendMessage("⚠️ File 25MB se badi hai, Facebook allow nahi kar raha!", threadID, messageID);
        }
        
        return api.sendMessage(`❌ API Error: Gaana dhoondne ya bhejne mein masla hua hai.`, threadID, messageID);
    }
};
