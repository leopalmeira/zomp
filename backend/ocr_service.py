import easyocr
import sys
import os
import json
import base64
from io import BytesIO
from PIL import Image

def analyze_print(image_data):
    try:
        # Initialize reader silenciando o download e logs
        # gpu=False garante CPU se não houver placa, evitando logs de aviso
        reader = easyocr.Reader(['pt', 'en'], gpu=False, verbose=False)
        
        # Se image_data for um caminho de arquivo existente
        if os.path.exists(image_data):
            img = Image.open(image_data)
        else:
            # Se for base64 (fallback ou direto)
            clean_b64 = image_data
            if clean_b64.startswith("data:"):
                clean_b64 = clean_b64.split(",")[1]
            img_bytes = base64.b64decode(clean_b64)
            img = Image.open(BytesIO(img_bytes))
        
        # Converte para RGB (necessário para salvar como JPEG caso seja RGBA/PNG)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save to temp file because easyocr works better with paths or numpy arrays
        temp_path = os.path.join(os.path.dirname(__file__), "temp_process.jpg")
        img.save(temp_path, format='JPEG', quality=90)
        
        # Read text
        results = reader.readtext(temp_path)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        full_text = " ".join([res[1] for res in results])
        print(f"DEBUG: Texto extraído: {full_text}", file=sys.stderr)
        
        # Logic to find price
        final_price = 0
        
        # Heuristic search
        prices = []
        import re
        for _, text, prob in results:
            # Match formats like 25,50 25.50 R$25,50
            match = re.search(r'(\d+[\.,]\d{2})', text)
            if match:
                val_str = match.group(1).replace(',', '.')
                try:
                    val = float(val_str)
                    prices.append((val, text, prob))
                except: continue
        
        if prices:
            # Pega o que parecer mais com preço de app de transporte (Uber/99 variam entre 8 a 150 em geral)
            valid_prices = [p[0] for p in prices if 5 < p[0] < 500]
            if valid_prices:
                final_price = valid_prices[0]
                
        return final_price
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image data or path"}))
        sys.exit(1)
        
    input_data = sys.argv[1]
    price = analyze_print(input_data)
    print(json.dumps({"price": price}))
