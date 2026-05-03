from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import google.generativeai as genai
import json
import re
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
import os

app = Flask(__name__)
CORS(app)

OPENWEATHER_API_KEY = "REPLACED_KEY"
GEMINI_API_KEY = "REPLACED_KEY"

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-3-flash-preview")

# Load the model and class labels
model_path = "leaf_disease_resnet50_final.h5"
with open("disease_classes.json", "r") as f:
    label_map = json.load(f)

disease_model = tf.keras.models.load_model(model_path)

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
        response = model.generate_content(prompt)
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
        response = model.generate_content(pythonprompt)
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
    img_path = "temp_image.jpg"
    file.save(img_path)

    # 1. Preprocess & Predict using your ResNet50 Model
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.resnet50.preprocess_input(img_array)

    predictions = disease_model.predict(img_array)
    result_index = np.argmax(predictions)
    disease_name = label_map.get(str(result_index), "Unknown Disease")
    confidence = float(np.max(predictions))

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

    try:
        response = model.generate_content(cure_prompt)
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        cure_data = json.loads(text)
    except Exception as e:
        print("Gemini Cure Error:", str(e))
        cure_data = {"error": "Cure information currently unavailable."}

    os.remove(img_path) 

    return jsonify({
        "disease": disease_name,
        "confidence": round(confidence * 100, 2),
        "treatment": cure_data
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
