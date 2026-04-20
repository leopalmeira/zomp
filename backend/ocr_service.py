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
        reader = easyocr.Reader(['pt', 'en'], gpu=False, verbose=False)
        
        # Se image_data for um caminho de arquivo existente
        if os.path.exists(image_data):
            img = Image.open(image_data)
        else:
            # Se for base64
            clean_b64 = image_data
            if clean_b64.startswith("data:"):
                clean_b64 = clean_b64.split(",")[1]
            img_bytes = base64.b64decode(clean_b64)
            img = Image.open(BytesIO(img_bytes))
        
        # Converte para RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        temp_path = os.path.join(os.path.dirname(__file__), "temp_process.jpg")
        img.save(temp_path, format='JPEG', quality=90)
        
        # Read text with bounding boxes
        results = reader.readtext(temp_path)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        full_text = " ".join([res[1] for res in results]).upper()
        print(f"DEBUG: Texto extraído: {full_text}", file=sys.stderr)
        
        # Check if it's Pop or UberX
        is_valid_category = any(cat in full_text for cat in ["POP", "99POP", "UBERX", "UBER X"])
        
        if not is_valid_category:
            print("DEBUG: Categoria Pop/UberX não encontrada no print.", file=sys.stderr)
            # Se não achar a categoria, vamos tentar achar o preço mais provável mesmo assim
            # Mas o ideal seria retornar 0 se formos rigorosos. 
            # Vou manter a busca por preço como fallback mas avisar no log.
        
        prices = []
        import re
        
        # Regex para preços: R$ 25,50 ou 25,50
        price_pattern = re.compile(r'(\d+[\.,]\d{2})')
        
        # Vamos tentar associar preços a categorias
        # Categorias de interesse
        target_cats = ["POP", "99POP", "UBERX", "UBER X"]
        
        for i, (bbox, text, prob) in enumerate(results):
            text_up = text.upper()
            
            # Se achamos uma categoria, o preço geralmente está no mesmo bloco ou no próximo/anterior
            found_cat = any(cat in text_up for cat in target_cats)
            
            if found_cat:
                # Procura preço nas vizinhanças (mesmo índice, anterior ou próximo)
                for j in range(max(0, i-2), min(len(results), i+3)):
                    near_text = results[j][1]
                    match = price_pattern.search(near_text)
                    if match:
                        val_str = match.group(1).replace(',', '.')
                        try:
                            val = float(val_str)
                            if 5 < val < 500:
                                return val # Encontrou preço perto da categoria!
                        except: continue

        # Fallback: Se não achou perto da categoria, pega o primeiro preço maior que 5
        for _, text, prob in results:
            match = price_pattern.search(text)
            if match:
                val_str = match.group(1).replace(',', '.')
                try:
                    val = float(val_str)
                    if 5 < val < 500:
                        prices.append(val)
                except: continue
        
        if prices:
            return prices[0]
                
        return 0
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
