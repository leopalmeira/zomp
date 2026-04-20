const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        const genAI = new GoogleGenerativeAI('AIzaSyD2oe_LrRvjC2cq8k3lhtsQG_UTzV5gR6Q');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // 1px transparent base64 image
        const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

        const prompt = 'Return the number 10';
        
        const imagePart = {
          inlineData: {
            data: base64,
            mimeType: "image/jpeg"
          }
        };

        console.log("Generating...");
        const result = await model.generateContent([prompt, imagePart]);
        console.log("Result:", result.response.text());
    } catch (e) {
        console.error("FAILED:", e);
    }
}
test();
