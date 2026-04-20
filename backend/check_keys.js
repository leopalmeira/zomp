const keys = [
  'AIzaSyBScCwMr_u5J1qY_UY4Oh5NJWUVhaYb7tQ',
  'AIzaSyAxbSUXe7SBLuaOpoAR3HJUt4_-_Cgg7Hw',
  'AIzaSyBvltEPOCOyoAAlDeYQCUtojBdl1EgMkSk',
  'AIzaSyCrEMCgqejdb-1zYRJ_JjAnehjLylOgEDY'
];

async function checkKeys() {
    for (const key of keys) {
        console.log(`Checking key: ${key.substring(0, 10)}...`);
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await res.json();
            if (data.error) {
                console.log(`Error: ${data.error.message}`);
            } else {
                console.log(`Key ${key.substring(0, 10)} works!`);
                console.log(`Models available: ${data.models.length}`);
            }
        } catch (e) {
            console.error("FAILED:", e);
        }
        console.log("-------------------");
    }
}
checkKeys();
