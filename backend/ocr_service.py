import easyocr
import sys
import os
import json
import base64
from io import BytesIO
from PIL import Image

def analyze_print(image_data):
    try:
        # Initialize reader (this takes time on first run as it downloads models)
        reader = easyocr.Reader(['pt', 'en'])
        
        # Open image from base64
        img = Image.open(BytesIO(base64.b64decode(image_data)))
        
        # Save to temp file because easyocr works better with paths or numpy arrays
        temp_path = "temp_print.jpg"
        img.save(temp_path)
        
        # Read text
        results = reader.readtext(temp_path)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        full_text = " ".join([res[1] for res in results])
        print(f"DEBUG: Texto extraído: {full_text}", file=sys.stderr)
        
        # Logic to find price
        # Similar logic to what Gemini was doing, but manual
        # We look for "Pop" or "UberX" and the numbers near them
        
        final_price = 0
        
        # Simple heuristic: find numbers that look like currency (X.XX)
        # and are near keywords
        keywords = ["pop", "uberx", "99pop"]
        found_keywords = []
        for kw in keywords:
            if kw in full_text.lower():
                found_keywords.append(kw)
        
        # Extract all numbers from results
        prices = []
        import re
        for _, text, prob in results:
            # Match formats like 25,50 25.50 R$25,50
            match = re.search(r'(\d+[\.,]\d{2})', text)
            if match:
                val = float(match.group(1).replace(',', '.'))
                prices.append((val, text, prob))
        
        if prices:
            # Heuristic: The price is usually the one most prominent or near keywords
            # For now, let's take the first one that fits typical range (8-150)
            valid_prices = [p[0] for p in prices if 5 < p[0] < 500]
            if valid_prices:
                # If we found keywords, the price might be the one closest to it in the list
                final_price = valid_prices[0] # TODO: improve heuristic
                
        return final_price
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image data"}))
        sys.exit(1)
        
    img_b64 = sys.argv[1]
    # If it has data:image prefix, strip it
    if img_b64.startswith("data:"):
        img_b64 = img_b64.split(",")[1]
        
    price = analyze_print(img_b64)
    print(json.dumps({"price": price}))
