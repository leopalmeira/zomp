const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI('AIzaSyD2oe_LrRvjC2cq8k3lhtsQG_UTzV5gR6Q');
        // This is a guess on how to list models via SDK, or just use fetch
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD2oe_LrRvjC2cq8k3lhtsQG_UTzV5gR6Q`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("FAILED:", e);
    }
}
listModels();
