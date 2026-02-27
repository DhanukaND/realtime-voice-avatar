const { exec } = require("child_process");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/audio", express.static(__dirname, {
    setHeaders: (res) => {
        res.set("Cache-Control", "no-store");
    }
}));

app.get("/", (req, res) => {
    res.send("AI Server running");
});


// ================= AI + TTS =================
app.post("/api/ai", async (req, res) => {

    console.time("TOTAL API TIME");

    const userText = req.body.text;
    if (!userText) return res.json({ error: "no_text" });

    console.log("User:", userText);

    let aiReply = "";

    // ================= AI =================
    console.time("Groq response time");

    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are Nova, a friendly in-game assistant. Reply in one very short natural sentence."
                    },
                    {
                        role: "user",
                        content: userText
                    }
                ],
                temperature: 0.6,
                max_tokens: 40
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 0
            }
        );

        console.timeEnd("Groq response time");

        aiReply = response.data.choices[0].message.content.trim();
        if (!aiReply) aiReply = "Hello.";

        console.log("AI:", aiReply);

    } catch (err) {
        console.timeEnd("Groq response time");
        console.log("Groq error:", err.message);
        console.timeEnd("TOTAL API TIME");
        return res.status(500).json({ error: "AI failed" });
    }

    // ================= TTS =================
    console.time("TTS generation time");

    const fileName = "voice.mp3";
    const filePath = path.join(__dirname, fileName);

    const cleanText = aiReply
        .replace(/"/g, "")
        .replace(/\n/g, " ");

    const ttsCommand =
        `python -m edge_tts --voice en-US-JennyNeural --text "${cleanText}" --write-media "${filePath}"`;

    exec(ttsCommand, (err) => {

        console.timeEnd("TTS generation time");

        if (err) {
            console.error("TTS error:", err);
            console.timeEnd("TOTAL API TIME");
            return res.json({ reply: aiReply });
        }

        console.log("Voice generated");

        console.timeEnd("TOTAL API TIME");

        res.json({
            status: "ok",
            reply: aiReply,
            audio: `${req.protocol}://${req.get("host")}/audio/voice.mp3`
        });
    });

});


// ================= START SERVER =================
const PORT = 5000;

app.listen(PORT, async () => {
    console.log("Server running on port", PORT);
});