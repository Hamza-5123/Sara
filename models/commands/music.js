const axios = require("axios");
const yts = require("yt-search");

// 🔐 Credits Lock Check
function checkCredits() {
    const correctCredits = "Shaan Khan"; // Updated Creator
    if (module.exports.config.credits !== correctCredits) {
        throw new Error("❌ Credits Locked By Shaan Khan");
    }
}

const baseApiUrl = async () => {
    try {
        const base = await axios.get(`https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`);
        return base.data.api;
    } catch (e) {
        return "https://api.diptoapi.com"; // Fallback URL
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
    const regex = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

module.exports.config = {
    name: "music",
    version: "1.1.0",
    credits: "Shaan Khan", // 🔐 LOCKED TO SHAAN KHAN
    hasPermssion: 0,
    cooldowns: 5,
    description: "YouTube video ko URL ya name se MP3 me download karein",
    commandCategory: "media",
    usages: "[YouTube URL ya song ka naam]"
};

module.exports.run = async function({ api, args, event }) {
    try {
        checkCredits(); 

        let videoID, searchMsg, titleInfo;
        const url = args[0];

        if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
            videoID = getVideoID(url);
            if (!videoID) {
                return api.sendMessage("❌ Galat YouTube URL!", event.threadID, event.messageID);
            }
        } else {
            const query = args.join(" ");
            if (!query) return api.sendMessage("❌ Song ka naam ya YouTube link do!", event.threadID, event.messageID);

            searchMsg = await api.sendMessage(`✅ Apki Request Jari Hai Please wait...: "${query}"...`, event.threadID);
            
            const result = await yts(query);
            if (!result.videos.length) return api.sendMessage("❌ Koi result nahi mila!", event.threadID);

            // Random hata kar pehla result select kiya gaya hai (Official/Top Result)
            const selected = result.videos[0]; 
            videoID = selected.videoId;
            titleInfo = selected.title;
        }

        const apiUrl = `${global.apis.diptoApi}/ytDl3?link=${videoID}&format=mp3`;
        const { data } = await axios.get(apiUrl);
        
        const downloadLink = data.downloadLink || data.data?.downloadLink;
        const title = titleInfo || data.title || data.data?.title || "audio";

        if (searchMsg?.messageID) api.unsendMessage(searchMsg.messageID);

        const shortLink = (await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(downloadLink)}`)).data;

        return api.sendMessage({
            body: `🎵 Title: ${title}\n👤 Credits: Shaan Khan\n📥 Download: ${shortLink}`,
            attachment: await getStreamFromURL(downloadLink, `${title}.mp3`)
        }, event.threadID, event.messageID);

    } catch (err) {
        console.error(err);
        return api.sendMessage("⚠️ Error: " + (err.message || "Server busy hai, baad mein try karein!"), event.threadID, event.messageID);
    }
};
