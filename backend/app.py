from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from google import genai
import json
import re
import numpy as np
import os
import tempfile
import threading

# Keep native thread pools tiny on low-memory instances.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "https://farmmate-three.vercel.app")

app = Flask(__name__)
# Allow production frontend + local dev.
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:5173",
            FRONTEND_ORIGIN
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("Gemini client ready")
else:
    print("No GEMINI_API_KEY - Gemini disabled (cure gen fallback used)")

import requests as req_lib

# Auto-download model from Google Drive if not present
MODEL_PATH = "leaf_disease_resnet50_final.h5"
LABELS_PATH = "disease_classes.json"
GDRIVE_FILE_ID = "1akPRuBqAgXyJQ2u9OqtNS-zS8in3NWGX"  # paste your file ID here
disease_model = None
label_map = None
model_lock = threading.Lock()
tf = None
keras_image = None
model_load_error = None

def ensure_tf_runtime_loaded():
    global tf, keras_image
    if tf is not None and keras_image is not None:
        return

    import tensorflow as tf_module
    from tensorflow.keras.preprocessing import image as image_module

    tf = tf_module
    keras_image = image_module

    try:
        # Render starter instances are CPU-only; avoid GPU probing overhead.
        tf.config.set_visible_devices([], "GPU")
    except Exception:
        pass

    try:
        # Keep TensorFlow thread count minimal for lower memory footprint.
        tf.config.threading.set_inter_op_parallelism_threads(1)
        tf.config.threading.set_intra_op_parallelism_threads(1)
    except Exception:
        pass

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("Downloading model from Google Drive...")
        url = f"https://drive.google.com/uc?export=download&id={GDRIVE_FILE_ID}"
        session = req_lib.Session()
        response = session.get(url, stream=True)
        
        # Handle Google Drive large file warning
        for key, value in response.cookies.items():
            if key.startswith("download_warning"):
                url = f"https://drive.google.com/uc?export=download&confirm={value}&id={GDRIVE_FILE_ID}"
                response = session.get(url, stream=True)
                break
        
        with open(MODEL_PATH, "wb") as f:
            for chunk in response.iter_content(chunk_size=32768):
                if chunk:
                    f.write(chunk)
        print("Model downloaded successfully!")

def ensure_disease_assets_loaded():
    global disease_model, label_map, model_load_error
    if disease_model is not None and label_map is not None:
        return

    with model_lock:
        if disease_model is not None and label_map is not None:
            return

        try:
            if not os.path.exists(LABELS_PATH):
                raise FileNotFoundError(f"Missing labels file: {LABELS_PATH}")

            with open(LABELS_PATH, "r") as f:
                label_map = json.load(f)

            ensure_tf_runtime_loaded()
            download_model()
            disease_model = tf.keras.models.load_model(
                MODEL_PATH,
                compile=False,
                custom_objects={"InputLayer": tf.keras.layers.InputLayer}
            )
            model_load_error = None
            print("Disease model loaded successfully!")
        except Exception as e:
            model_load_error = str(e)
            raise

# Default soil nutrient values based on soil type
SOIL_DEFAULTS = {
    "Black Soil":    {"N": 80, "P": 48, "K": 40, "ph": 7.2},
    "Red Soil":      {"N": 50, "P": 30, "K": 35, "ph": 6.2},
    "Alluvial Soil": {"N": 90, "P": 55, "K": 50, "ph": 7.0},
    "Sandy Soil":    {"N": 30, "P": 20, "K": 25, "ph": 6.0},
    "Clayey Soil":   {"N": 70, "P": 45, "K": 60, "ph": 6.8},
    "Laterite Soil": {"N": 40, "P": 25, "K": 30, "ph": 5.5},
    "Loamy Soil":    {"N": 85, "P": 50, "K": 45, "ph": 6.8},
    "Silty Soil":    {"N": 75, "P": 42, "K": 40, "ph": 6.5},
    "Peaty Soil":    {"N": 95, "P": 35, "K": 30, "ph": 5.0},
    "Chalky Soil":   {"N": 45, "P": 28, "K": 35, "ph": 8.0},
}

@app.route('/')
def home():
    return {"message": "FarmMate backend is running!"}

@app.route('/weather-coords', methods=['GET'])
def get_weather_by_coords():
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Coordinates are required"}), 400

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    data = response.json()

    if response.status_code != 200:
        return jsonify({"error": "Could not fetch weather"}), 404

    return jsonify({
        "city": data.get("name", "Your Location"),
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "description": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"]
    })

@app.route('/soil-defaults', methods=['GET'])
def get_soil_defaults():
    soil_type = request.args.get('soil_type')
    defaults = SOIL_DEFAULTS.get(soil_type, SOIL_DEFAULTS["Loamy Soil"])
    return jsonify(defaults)

@app.route('/recommend-crops', methods=['POST'])
def recommend_crops():
    data = request.get_json()

    land_name    = data.get('landName', 'the farm')
    soil_type    = data.get('soilType', 'Loamy Soil')
    temperature  = data.get('temperature', 25)
    humidity     = data.get('humidity', 70)
    rainfall     = data.get('rainfall', 150)
    N            = data.get('N', 80)
    P            = data.get('P', 40)
    K            = data.get('K', 40)
    ph           = data.get('ph', 6.5)
    location     = data.get('city', 'India')

    prompt = f"""
You are an expert Indian agricultural advisor.

A farmer has the following land and conditions:
- Location: {location}
- Soil Type: {soil_type}
- Temperature: {temperature}°C
- Humidity: {humidity}%
- Estimated Rainfall: {rainfall}mm
- Nitrogen (N): {N}
- Phosphorus (P): {P}
- Potassium (K): {K}
- Soil pH: {ph}

Suggest the TOP 5 most suitable crops to grow right now.
For each crop provide:
1. Crop name
2. Match percentage (how suitable it is, 0-100)
3. Total days from sowing to harvest
4. One line reason why it suits these conditions
5. One key farming tip for this specific soil and weather

Respond ONLY in this exact JSON format, no extra text:
{{
  "crops": [
    {{
      "name": "Rice",
      "match": 95,
      "days": 120,
      "reason": "Ideal for high humidity and warm temperature",
      "tip": "Maintain 5cm water level during vegetative stage"
    }}
  ]
}}
"""

    try:
        pythonresponse = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        response = pythonresponse
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        result = json.loads(text)
        return jsonify(result)
    except Exception as e:
        print("Gemini error:", str(e))
        return jsonify({"error": "Could not get recommendations"}), 500


@app.route('/generate-timeline', methods=['POST'])
def generate_timeline():
    data = request.get_json()

    crop        = data.get('crop')
    start_date  = data.get('startDate')
    soil_type   = data.get('soilType')
    temperature = data.get('temperature')
    humidity    = data.get('humidity')
    location    = data.get('city', 'India')
    land_name   = data.get('landName', 'the farm')
    land_size   = data.get('landSize', '')
    land_unit   = data.get('landUnit', '')

    pythonprompt = f"""
You are an expert Indian agricultural advisor.

Generate a complete farming timeline for:
- Crop: {crop}
- Start Date: {start_date}
- Location: {location}
- Land: {land_name} ({land_size} {land_unit})
- Soil Type: {soil_type}
- Temperature: {temperature}°C
- Humidity: {humidity}%

Create a detailed farming schedule with all important tasks.
Include these task types: sowing, watering, fertilizing, weeding,
pest_control, monitoring, harvesting.

Respond ONLY in this exact JSON format, no extra text:
{{
  "crop": "Rice",
  "totalDays": 120,
  "harvestDate": "YYYY-MM-DD",
  "summary": "One paragraph about growing this crop",
  "expectedYield": {{
    "min": 2.0,
    "max": 3.5,
    "unit": "tonnes per acre",
    "notes": "Yield depends on water availability and pest control"
  }},
  "tasks": [
    {{
      "id": "1",
      "date": "YYYY-MM-DD",
      "day": 1,
      "title": "Soil preparation",
      "description": "Detailed description of what to do",
      "type": "sowing",
      "priority": "high",
      "weatherSensitive": true
    }}
  ]
}}
"""


    try:
        pythonresponse = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=pythonprompt
        )
        response = pythonresponse
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        result = json.loads(text)
        return jsonify(result)
    except Exception as e:
        print("Gemini error:", str(e))
        return jsonify({"error": "Could not generate timeline"}), 500

@app.route('/weather-forecast', methods=['GET'])
def get_forecast():
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Coordinates required"}), 400

    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}&units=metric&cnt=56"
    response = requests.get(url)
    data = response.json()

    if response.status_code != 200:
        return jsonify({"error": "Could not fetch forecast"}), 404

    # Group by day
    days = {}
    for item in data.get("list", []):
        date = item["dt_txt"].split(" ")[0]
        if date not in days:
            days[date] = {
                "date": date,
                "max_temp": item["main"]["temp_max"],
                "min_temp": item["main"]["temp_min"],
                "day_condition": item["weather"][0]["description"],
                "humidity": item["main"]["humidity"],
                "wind_speed": item["wind"]["speed"],
                "precipitation_chance": int(item.get("pop", 0) * 100),
            }
        else:
            days[date]["max_temp"] = max(days[date]["max_temp"], item["main"]["temp_max"])
            days[date]["min_temp"] = min(days[date]["min_temp"], item["main"]["temp_min"])

    return jsonify(list(days.values())[:7])

# Load the model and class labels - route
@app.route('/detect-disease', methods=['POST'])
def detect_disease():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']

    try:
        ensure_disease_assets_loaded()
    except Exception as e:
        print(f"Disease model unavailable: {e}")
        return jsonify({
            "error": "Disease model is unavailable on the server. Please try again in a moment."
        }), 503

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    img_path = temp_file.name
    temp_file.close()

    try:
        file.save(img_path)

        # 1. Preprocess & Predict using your ResNet50 model
        img = keras_image.load_img(img_path, target_size=(224, 224))
        img_array = keras_image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.resnet50.preprocess_input(img_array)

        predictions = disease_model.predict(img_array, verbose=0)
        result_index = np.argmax(predictions)
        disease_name = label_map.get(str(result_index), "Unknown Disease")
        confidence = float(np.max(predictions))
    finally:
        if os.path.exists(img_path):
            os.remove(img_path)

    # 2. Ask Gemini for the Cure
    cure_prompt = f"""
    You are an expert Agri-Scientist. A farmer's crop has been diagnosed with: {disease_name}.
    
    Provide a detailed treatment plan including:
    1. Cause: Why did this happen?
    2. Organic Cure: Natural/Home remedies.
    3. Chemical Cure: Specific pesticides and the exact percentage/dosage to use.
    4. Timing: When to apply the treatment.
    5. Prevention: How to stop it from coming back.
    also respond in a way that a farmer can easily understand and implement.
    Respond ONLY in this JSON format:
    {{
      "cause": "...",
      "organic": "...",
      "chemical": "...",
      "dosage": "...",
      "prevention": "..."
    }}
    """

    if client:
        try:
            pythonresponse = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=cure_prompt
            )
            response = pythonresponse
            text = response.text.strip()
            text = re.sub(r'```json|```', '', text).strip()
            cure_data = json.loads(text)
        except Exception as e:
            print("Gemini Cure Error:", str(e))
            cure_data = {"error": "Cure information currently unavailable."}
    else:
        cure_data = {
            "cause": "Common fungal/bacterial infection from humidity or poor air circulation",
            "organic": "Neem oil spray (5ml/liter water) weekly or garlic-chilli extract.",
            "chemical": "Mancozeb or Copper Oxychloride (2g/liter)",
            "dosage": "Apply early morning, repeat after 7 days. Use mask.",
            "prevention": "Improve air circulation, avoid overhead watering, remove infected leaves."
        }

    return jsonify({
        "disease": disease_name,
        "confidence": round(confidence * 100, 2),
        "treatment": cure_data
    })

@app.route('/health/disease', methods=['GET'])
def disease_health():
    return jsonify({
        "modelLoaded": disease_model is not None,
        "labelsLoaded": label_map is not None,
        "modelFileExists": os.path.exists(MODEL_PATH),
        "labelsFileExists": os.path.exists(LABELS_PATH),
        "lastLoadError": model_load_error
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
