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
from datetime import datetime, timedelta

# Keep native thread pools tiny on low-memory instances.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv not installed, assume environment variables are set in the production environment
    pass

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "https://farmmate-three.vercel.app")

import hmac
import hashlib
import razorpay

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

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

    language = data.get('language', 'en')
    language_map = {
        'en': 'English', 'te': 'Telugu', 'ta': 'Tamil',
        'hi': 'Hindi', 'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali'
    }
    lang_name = language_map.get(language, 'English')

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

Suggest the TOP 5 most suitable crops to grow right now based on the locations past 3 to 4 months and next predicted 3-4 months weather data.
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

IMPORTANT: Respond in {lang_name} language only.
"""

    try:
        pythonresponse = client.models.generate_content(
            model="gemini-2.5-flash",
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

    language = data.get('language', 'en')
    language_map = {
        'en': 'English', 'te': 'Telugu', 'ta': 'Tamil',
        'hi': 'Hindi', 'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali'
    }
    lang_name = language_map.get(language, 'English')

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

IMPORTANT: Respond in {lang_name} language only.
"""


    try:
        pythonresponse = client.models.generate_content(
            model="gemini-2.5-flash",
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

@app.route('/weather-historical', methods=['GET'])
def get_weather_historical():
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Coordinates required"}), 400

    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180) # Past 6 months

        url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lng}&start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
        response = requests.get(url, timeout=10)
        data = response.json()

        if response.status_code != 200:
            return jsonify({"error": "Could not fetch historical data"}), 404

        daily = data.get('daily', {})
        temp_max = daily.get('temperature_2m_max', [])
        temp_min = daily.get('temperature_2m_min', [])
        precip = daily.get('precipitation_sum', [])

        valid_max = [t for t in temp_max if t is not None]
        valid_min = [t for t in temp_min if t is not None]
        valid_precip = [p for p in precip if p is not None]

        avg_max = sum(valid_max) / len(valid_max) if valid_max else 0
        avg_min = sum(valid_min) / len(valid_min) if valid_min else 0
        total_precip = sum(valid_precip) if valid_precip else 0

        return jsonify({
            "avg_max_temp": round(avg_max, 1),
            "avg_min_temp": round(avg_min, 1),
            "total_precipitation": round(total_precip, 1),
            "period": "Past 6 Months"
        })
    except Exception as e:
        print(f"Error fetching historical weather: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Load the model and class labels - route
@app.route('/detect-disease', methods=['POST'])
def detect_disease():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    language = request.form.get('language', 'en')
    language_map = {
        'en': 'English', 'te': 'Telugu', 'ta': 'Tamil',
        'hi': 'Hindi', 'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali'
    }
    lang_name = language_map.get(language, 'English')

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

    IMPORTANT: Respond in {lang_name} language only.
    """

    if client:
        try:
            pythonresponse = client.models.generate_content(
                model="gemini-2.5-flash",
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

@app.route('/create-order', methods=['POST'])
def create_order():
    if not razorpay_client:
        return jsonify({"error": "Razorpay not configured on backend"}), 500

    data = request.get_json() or {}
    plan = data.get('plan', 'pro')
    amount = data.get('amount', 999)  # amount in rupees
    offer_id = data.get('offer_id') or data.get('coupon')
    user_id = data.get('userId')

    # Convert to paise
    amount_paise = int(float(amount) * 100)

    try:
        order_payload = {
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "plan": str(plan),
                "userId": str(user_id) if user_id else ""
            }
        }
        if offer_id:
            order_payload["offer_id"] = str(offer_id).strip()
        else:
            # Try to auto-attach enabled offers from Razorpay account
            try:
                offers_res = razorpay_client.get('/offers', {})
                if isinstance(offers_res, dict) and "items" in offers_res:
                    active_offer_ids = [
                        o["id"] for o in offers_res["items"]
                        if o.get("status") == "enabled" or o.get("active") is True
                    ]
                    if active_offer_ids:
                        order_payload["offers"] = active_offer_ids
            except Exception as off_err:
                print("Notice: Could not auto-fetch Razorpay offers:", str(off_err))

        order = razorpay_client.order.create(order_payload)
        actual_amount = order.get("amount", amount_paise)

        return jsonify({
            "orderId": order["id"],
            "amount": actual_amount,
            "currency": "INR",
            "keyId": RAZORPAY_KEY_ID,
            "offerId": offer_id or None
        })
    except Exception as e:
        print("Razorpay order creation error:", str(e))
        return jsonify({"error": f"Could not create order: {str(e)}"}), 500

@app.route('/verify-payment', methods=['POST'])
def verify_payment():
    if not razorpay_client:
        return jsonify({"error": "Razorpay not configured on backend"}), 500

    data = request.get_json() or {}
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature = data.get('razorpay_signature')
    user_id = data.get('userId')
    plan = data.get('plan', 'pro')

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return jsonify({"error": "Missing payment fields"}), 400

    try:
        # Verify the signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        return jsonify({
            "success": True,
            "status": "success",
            "paymentId": razorpay_payment_id,
            "orderId": razorpay_order_id,
            "userId": user_id,
            "plan": plan
        })
    except razorpay.errors.SignatureVerificationError:
        return jsonify({"success": False, "error": "Signature mismatch"}), 400
    except Exception as e:
        print("Razorpay verify error:", str(e))
        return jsonify({"success": False, "error": "Payment verification failed"}), 500

# ----------------- AgriBot RAG Chatbot Routes -----------------
try:
    from rag_engine import rag_engine
except ImportError:
    from backend.rag_engine import rag_engine

@app.route('/api/chat', methods=['POST'])
def chat_with_agribot():
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    if not message:
        return jsonify({"error": "Message is required"}), 400

    language = data.get('language', 'en')
    conversation_history = data.get('conversationHistory', [])
    farm_context = data.get('farmContext', None)

    try:
        result = rag_engine.answer_query(
            query=message,
            language=language,
            conversation_history=conversation_history,
            farm_context=farm_context,
            client=client
        )
        return jsonify(result)
    except Exception as e:
        print("AgriBot chat error:", str(e))
        return jsonify({"error": "Failed to process farming query", "details": str(e)}), 500

@app.route('/api/chat/suggestions', methods=['GET'])
def get_chat_suggestions():
    lang = request.args.get('language', 'en')
    suggestions_by_lang = {
        'en': [
            "🌾 What is the fertilizer schedule for Paddy?",
            "🐛 How do I control stem borer organically?",
            "💰 How to register and apply for PM-KISAN ₹6,000?",
            "💧 What are the subsidies for Drip Irrigation?",
            "🍂 Why are my tomato leaves curling and yellowing?"
        ],
        'te': [
            "🌾 వరి పంటకు ఎరువుల మోతాదు మరియు సమయం ఏమిటి?",
            "🐛 కాండం తొలిచే పురుగును సేంద్రీయంగా ఎలా నివారించాలి?",
            "💰 పీఎం-కిసాన్ ₹6,000 పథకానికి ఎలా దరఖాస్తు చేయాలి?",
            "💧 బిందు సేద్యం (డ్రిప్) సబ్సిడీ వివరాలు ఏమిటి?",
            "🍂 టమాట ఆకులు ముడుచుకుపోయి పసుపు రంగులోకి ఎందుకు మారుతున్నాయి?"
        ],
        'hi': [
            "🌾 धान की फसल के लिए खाद व उर्वरक का सही समय क्या है?",
            "🐛 तना छेदक कीट की जैविक रोकथाम कैसे करें?",
            "💰 पीएम-किसान ₹6,000 योजना के लिए कैसे आवेदन करें?",
            "💧 ड्रिप सिंचाई पर कितनी सब्सिडी मिलती है?",
            "🍂 टमाटर की पत्तियां मुड़कर पीली क्यों हो रही हैं?"
        ],
        'ta': [
            "🌾 நெல் பயிருக்கான உர அட்டவணை என்ன?",
            "🐛 தண்டு துளைப்பானை இயற்கை முறையில் கட்டுப்படுத்துவது எப்படி?",
            "💰 பிஎம்-கிசான் ₹6,000 திட்டத்திற்கு எவ்வாறு விண்ணப்பிப்பது?",
            "💧 சொட்டு நீர் பாசன மானியம் பெறுவது எப்படி?",
            "🍂 தக்காளி இலைகள் சுருங்குவதை தடுப்பது எப்படி?"
        ],
        'kn': [
            "🌾 ಭತ್ತದ ಬೆಳೆಗೆ ಗೊಬ್ಬರ ಹಾಕುವ ವಿಧಾನ ಮತ್ತು ಪ್ರಮಾಣ ತಿಳಿಸಿ?",
            "🐛 ಕಾಂಡ ಕೊರೆಯುವ ಹುಳುವನ್ನು ಸಾವಯವವಾಗಿ ನಿಯಂತ್ರಿಸುವುದು ಹೇಗೆ?",
            "💰 ಪಿಎಂ-ಕಿಸಾನ್ ₹6,000 ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?",
            "💧 ಹನಿ ನೀರಾವರಿಗೆ ಎಷ್ಟು ಸಬ್ಸಿಡಿ ಸಿಗುತ್ತದೆ?",
            "🍂 ಟೊಮೆಟೊ ಎಲೆಗಳು ಮುದುರಿಕೊಳ್ಳುವುದನ್ನು ತಡೆಯುವುದು ಹೇಗೆ?"
        ],
        'ml': [
            "🌾 നെൽകൃഷിക്ക് ആവശ്യമായ വളപ്രയോഗ സമയം ഏതാണ്?",
            "🐛 തണ്ടുതുരപ്പൻ പുഴുവിനെ ജൈവരീതിയിൽ എങ്ങനെ നിയന്ത്രിക്കാം?",
            "💰 പിഎം-കിസാൻ ₹6,000 സഹായത്തിന് എങ്ങനെ അപേക്ഷിക്കാം?",
            "💧 തുള്ളി നന പദ്ധതിക്കുള്ള സബ്‌സിഡി വിവരങ്ങൾ എന്തെല്ലാം?",
            "🍂 തക്കാളിയുടെ ഇല ചുരുളുന്ന രോഗം എങ്ങനെ തടയാം?"
        ],
        'bn': [
            "🌾 ধান চাষের জন্য সার প্রয়োগের সঠিক সময়সূচী কী?",
            "🐛 ধানের মাজরা পোকা জৈব উপায়ে কীভাবে দমন করব?",
            "💰 পিএম-কিসান ₹৬,০০০ প্রকল্পের জন্য কীভাবে আবেদন করবেন?",
            "💧 ড্রিপ সেচ ব্যবস্থার জন্য কী ধরনের ভর্তুকি পাওয়া যায়?",
            "🍂 টমেটো গাছের পাতা কোঁকড়ানো রোগ কীভাবে রোধ করব?"
        ]
    }
    items = suggestions_by_lang.get(lang, suggestions_by_lang['en'])
    return jsonify({"suggestions": items})

if __name__ == '__main__':
    app.run(debug=True, port=5001)

