const { exec } = require('child_process');
const path = require('path');

const pythonScript = path.join(__dirname, 'ocr_service.py');
// 1x1 transparent dot
const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

console.log('Calling OCR...');
exec(`python "${pythonScript}" "${imageBase64}"`, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
    if (error) {
        console.error('EXEC ERROR:', error);
    } else {
        try {
            console.log('Parsed:', JSON.parse(stdout));
        } catch(e) {
            console.error('Parse error:', e);
        }
    }
});
