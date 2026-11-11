"""
RAG (Retrieval-Augmented Generation) Engine for FarmMate.
Combines agricultural knowledge retrieval (BM25 + Semantic Vector Similarity)
with Gemini 2.5 Flash for grounded, multilingual farming advice.
"""

import os
import json
import math
import re
import numpy as np

LANGUAGE_NAMES = {
    'en': 'English',
    'te': 'Telugu (తెలుగు)',
    'ta': 'Tamil (தமிழ்)',
    'hi': 'Hindi (हिन्दी)',
    'kn': 'Kannada (ಕನ್ನಡ)',
    'ml': 'Malayalam (മലയാളം)',
    'bn': 'Bengali (বাংলা)'
}

STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "is", "are", "was", "were", "what", "how", "when", "why", "which", "who",
    "can", "could", "should", "would", "do", "does", "did", "my", "your", "our",
    "it", "this", "that", "these", "those", "i", "we", "you", "they", "me"
}

def tokenize(text):
    if not text:
        return []
    words = re.findall(r'[a-zA-Z0-9_\-]+', text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]

def resolve_personal_query(query, farm_context, language='en'):
    """
    Directly answers personal profile and farm questions (lands, crops, soil, profile)
    using the verified live user data from Firestore with 100% accuracy.
    """
    if not farm_context:
        return None

    q_low = query.lower().strip()
    lands = farm_context.get("lands", []) or []
    crops = farm_context.get("activeCrops", []) or []
    profile = farm_context.get("profile", {}) or {}
    farmer_name = profile.get("name") or "Farmer"

    # 1. Lands query (count, list, location, size)
    is_lands_query = bool(
        re.search(r'\b(how many|count of|number of|list|show|what are|tell me|where are|view)\s+.*?(lands?|farms?|acres?|bhoomi|bhoomulu|khet)', q_low)
        or re.search(r'\b(my|our)\s+(lands?|farms?|khet|bhoomulu)\b', q_low)
        or re.search(r'\b(mere khet|naa bhoomulu|na bhoomi|enni bhoomulu|kitne khet|khet kitne|nilangal|bhoomulu enni)\b', q_low)
        or q_low in ["lands", "my land", "my farm", "lands count", "how many lands do i have", "how many lands", "how many lands do i have?"]
    )

    if is_lands_query:
        total = len(lands)
        if language == 'te':
            if total == 0:
                return (
                    f"నమస్కారం {farmer_name} గారు! మీ KRISHMITRA ఖాతాలో ప్రస్తుతం నమోదు చేయబడిన భూములు ఏవీ లేవు.\n\n"
                    f"కొత్త భూమిని జోడించడానికి 'My Lands' పేజీకి వెళ్లి మీ భూమి వివరాలు నమోదు చేసుకోండి."
                )
            items = []
            for i, l in enumerate(lands, 1):
                size_str = f"{l.get('landSize', '')} {l.get('landUnit', 'ఎకరాలు')}".strip()
                loc_str = l.get('city', 'భారతదేశం')
                weather_str = f" ({l.get('temperature')}°C, {l.get('description')})" if l.get('temperature') is not None else ""
                items.append(f"{i}. 🌾 **{l.get('landName', 'భూమి')}**\n   - **విస్తీర్ణం**: {size_str}\n   - **నేల రకం**: {l.get('soilType', 'తెలియదు')}\n   - **ప్రదేశం**: {loc_str}{weather_str}")
            return f"నమస్కారం {farmer_name} గారు! మీ వద్ద మొత్తం **{total} భూములు** నమోదై ఉన్నాయి:\n\n" + "\n\n".join(items)

        elif language == 'hi':
            if total == 0:
                return (
                    f"नमस्ते {farmer_name} जी! आपके KRISHMITRA प्रोफाइल में अभी कोई खेत पंजीकृत नहीं है।\n\n"
                    f"नया खेत जोड़ने के लिए 'My Lands' पेज पर जाएं।"
                )
            items = []
            for i, l in enumerate(lands, 1):
                size_str = f"{l.get('landSize', '')} {l.get('landUnit', 'एकड़')}".strip()
                loc_str = l.get('city', 'भारत')
                weather_str = f" ({l.get('temperature')}°C, {l.get('description')})" if l.get('temperature') is not None else ""
                items.append(f"{i}. 🌾 **{l.get('landName', 'खेत')}**\n   - **क्षेत्रफल**: {size_str}\n   - **मिट्टी का प्रकार**: {l.get('soilType', 'अज्ञात')}\n   - **स्थान**: {loc_str}{weather_str}")
            return f"नमस्ते {farmer_name} जी! आपके पास कुल **{total} पंजीकृत खेत** हैं:\n\n" + "\n\n".join(items)

        else: # English & others
            if total == 0:
                return (
                    f"Hello {farmer_name}! You currently do not have any registered lands in your KRISHMITRA profile.\n\n"
                    f"You can add a new land anytime by navigating to the **My Lands** page!"
                )
            items = []
            for i, l in enumerate(lands, 1):
                size_str = f"{l.get('landSize', '')} {l.get('landUnit', 'acres')}".strip()
                loc_str = l.get('city', 'Location not specified')
                weather_str = f" ({l.get('temperature')}°C, {l.get('description')})" if l.get('temperature') is not None else ""
                items.append(f"{i}. 🌾 **{l.get('landName', 'Farm')}**\n   - **Size**: {size_str}\n   - **Soil Type**: {l.get('soilType', 'Not specified')}\n   - **Location**: {loc_str}{weather_str}")
            return f"Hello {farmer_name}! You currently have **{total} registered land{'s' if total != 1 else ''}** in your KRISHMITRA profile:\n\n" + "\n\n".join(items)

    # 2. Crops query (active crops, present crops)
    is_crops_query = bool(
        re.search(r'\b(what|present|current|active|my|which)\s+.*crops?\b|crops?\s+(am i growing|do i have|list|details|growing)', q_low)
        or re.search(r'\b(what crop|what crops|crops am i growing|what am i growing|my crop|my crops|growing right now|which crop|crops do i have)\b', q_low)
        or re.search(r'\b(naa pantalu|panta details|mere fasal|fasal kaun si|koun si fasal|active pantalu)\b', q_low)
        or q_low in ["crops", "my crops", "present crops", "active crops", "what crops do i have"]
    )


    if is_crops_query:
        total = len(crops)
        if language == 'te':
            if total == 0:
                return (
                    f"నమస్కారం {farmer_name} గారు! మీ వద్ద ప్రస్తుతం ఎటువంటి యాక్టివ్ పంటలు లేవు.\n\n"
                    f"నూతన పంటను ప్లాన్ చేయడానికి 'Crop Recommendation' పేజీని సందర్శించండి!"
                )
            items = []
            for i, c in enumerate(crops, 1):
                land_info = f" ({c.get('landName')})" if c.get('landName') else ""
                next_t = f"\n   - **తదుపరి పని**: {c.get('nextTask')}" if c.get('nextTask') else ""
                items.append(f"{i}. 🌿 **{c.get('crop')}**{land_info}\n   - **ప్రారంభ తేదీ**: {c.get('startDate', 'తేదీ లేదు')}\n   - **కోత తేదీ**: {c.get('harvestDate', 'తేదీ లేదు')}{next_t}")
            return f"నమస్కారం {farmer_name} గారు! మీరు ప్రస్తుతం **{total} పంటలు** సాగు చేస్తున్నారు:\n\n" + "\n\n".join(items)

        elif language == 'hi':
            if total == 0:
                return (
                    f"नमस्ते {farmer_name} जी! आपके पास अभी कोई सक्रिय फसल नहीं है।\n\n"
                    f"नई फसल की योजना बनाने के लिए 'Crop Recommendation' पर जाएं!"
                )
            items = []
            for i, c in enumerate(crops, 1):
                land_info = f" ({c.get('landName')})" if c.get('landName') else ""
                next_t = f"\n   - **अगला कार्य**: {c.get('nextTask')}" if c.get('nextTask') else ""
                items.append(f"{i}. 🌿 **{c.get('crop')}**{land_info}\n   - **बुवाई तिथि**: {c.get('startDate', 'उपलब्ध नहीं')}\n   - **कटाई तिथि**: {c.get('harvestDate', 'उपलब्ध नहीं')}{next_t}")
            return f"नमस्ते {farmer_name} जी! आप वर्तमान में **{total} फसलें** उगा रहे हैं:\n\n" + "\n\n".join(items)

        else: # English
            if total == 0:
                return (
                    f"Hello {farmer_name}! You do not have any active crop timelines at the moment.\n\n"
                    f"You can generate a timeline and plan your next crop in the **Crop Recommendation** section!"
                )
            items = []
            for i, c in enumerate(crops, 1):
                land_info = f" on {c.get('landName')}" if c.get('landName') else ""
                next_t = f"\n   - **Next Task**: {c.get('nextTask')}" if c.get('nextTask') else ""
                items.append(f"{i}. 🌿 **{c.get('crop')}**{land_info}\n   - **Sown**: {c.get('startDate', 'N/A')}\n   - **Expected Harvest**: {c.get('harvestDate', 'N/A')}{next_t}")
            return f"Hello {farmer_name}! You are currently growing **{total} active crop{'s' if total != 1 else ''}**:\n\n" + "\n\n".join(items)

    # 3. Soil query
    is_soil_query = bool(
        re.search(r'\b(my soil|what is my soil|what soil|soil of my|soil type of my)\b', q_low)
        or re.search(r'\b(naa nela|nela r剝am|meri mitti|mitti kaisi hai)\b', q_low)
    )

    if is_soil_query:
        if not lands:
            return f"Hello {farmer_name}! You haven't added any lands yet. Once you add your land in 'My Lands', your soil type will appear here."
        items = [f"• **{l.get('landName', 'Farm')}**: {l.get('soilType', 'Not specified')} ({l.get('city', '')})" for l in lands]
        return f"Hello {farmer_name}! Here is the soil type for your registered land(s):\n\n" + "\n".join(items)

    # 4. Profile query
    is_profile_query = bool(
        re.search(r'\b(my profile|who am i|my details|my account|about me|show profile)\b', q_low)
        or re.search(r'\b(naa profile|meri profile)\b', q_low)
    )

    if is_profile_query:
        plan = profile.get("plan", "Free").capitalize()
        state = profile.get("state", "Not specified")
        district = profile.get("district", "Not specified")
        return (
            f"👤 **KRISHMITRA Farmer Profile**\n\n"
            f"- **Name**: {farmer_name}\n"
            f"- **Email**: {profile.get('email', 'N/A')}\n"
            f"- **Location**: {district}, {state}\n"
            f"- **Subscription Plan**: {plan}\n"
            f"- **Registered Lands**: {len(lands)}\n"
            f"- **Active Crops**: {len(crops)}"
        )

    return None

class AgriRAGEngine:
    def __init__(self, knowledge_file=None, cache_file=None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.knowledge_file = knowledge_file or os.path.join(base_dir, "knowledge", "agri_knowledge.json")
        self.cache_file = cache_file or os.path.join(base_dir, "knowledge", "embeddings_cache.json")
        self.documents = []
        self.doc_tokens = []
        self.doc_lengths = []
        self.avg_doc_len = 0
        self.idf = {}
        self.embeddings = None # numpy array of shape (N, D)
        self.doc_id_to_index = {}
        
        self.load_knowledge_base()
        self.build_bm25_index()

    def load_knowledge_base(self):
        if not os.path.exists(self.knowledge_file):
            print(f"Warning: Knowledge base not found at {self.knowledge_file}")
            self.documents = []
            return
        
        with open(self.knowledge_file, "r", encoding="utf-8") as f:
            self.documents = json.load(f)
        
        for i, doc in enumerate(self.documents):
            self.doc_id_to_index[doc["id"]] = i
        print(f"AgriRAGEngine: Loaded {len(self.documents)} knowledge documents.")

    def build_bm25_index(self):
        self.doc_tokens = []
        self.doc_lengths = []
        total_tokens = 0
        df = {}
        N = len(self.documents)
        if N == 0:
            return

        for doc in self.documents:
            # Combine title, keywords, and content for rich lexical retrieval
            full_text = f"{doc.get('title', '')} {' '.join(doc.get('keywords', []))} {doc.get('content', '')}"
            tokens = tokenize(full_text)
            self.doc_tokens.append(tokens)
            l = len(tokens)
            self.doc_lengths.append(l)
            total_tokens += l

            # Track unique terms for document frequency (DF)
            for t in set(tokens):
                df[t] = df.get(t, 0) + 1

        self.avg_doc_len = total_tokens / N if N > 0 else 1

        # Calculate BM25 IDF: ln((N - df + 0.5) / (df + 0.5) + 1)
        self.idf = {}
        for term, freq in df.items():
            self.idf[term] = math.log(((N - freq + 0.5) / (freq + 0.5)) + 1.0)

    def compute_bm25_scores(self, query, k1=1.5, b=0.75):
        q_tokens = tokenize(query)
        N = len(self.documents)
        scores = np.zeros(N)
        if not q_tokens or N == 0:
            return scores

        for term in q_tokens:
            if term not in self.idf:
                continue
            idf_val = self.idf[term]
            for i, tokens in enumerate(self.doc_tokens):
                tf = tokens.count(term)
                if tf > 0:
                    L = self.doc_lengths[i] / self.avg_doc_len
                    num = tf * (k1 + 1)
                    denom = tf + k1 * (1 - b + b * L)
                    scores[i] += idf_val * (num / denom)
        
        return scores

    def ensure_embeddings(self, client):
        """Precomputes or loads embeddings using Gemini text-embedding-004."""
        if self.embeddings is not None and len(self.embeddings) == len(self.documents):
            return True
        if client is None or not self.documents:
            return False

        # Check local cache first
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                cached_ids = [d["id"] for d in self.documents]
                if all(doc_id in cached_data for doc_id in cached_ids):
                    emb_list = [cached_data[doc_id] for doc_id in cached_ids]
                    self.embeddings = np.array(emb_list, dtype=np.float32)
                    print(f"Loaded {len(self.embeddings)} embeddings from cache.")
                    return True
            except Exception as e:
                print(f"Notice: Could not load embeddings cache: {e}")

        # Compute embeddings via Gemini
        print("Computing embeddings via Gemini text-embedding-004...")
        try:
            cache_to_save = {}
            emb_list = []
            for doc in self.documents:
                text_to_embed = f"{doc.get('title', '')}: {doc.get('content', '')}"
                res = client.models.embed_content(
                    model="text-embedding-004",
                    contents=text_to_embed
                )
                values = getattr(res, "embedding", None)
                if values is None and hasattr(res, "embeddings") and res.embeddings:
                    values = getattr(res.embeddings[0], "values", None)
                elif hasattr(values, "values"):
                    values = values.values
                if values is None:
                    values = res.embedding
                
                vec = list(values)
                emb_list.append(vec)
                cache_to_save[doc["id"]] = vec

            self.embeddings = np.array(emb_list, dtype=np.float32)

            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(cache_to_save, f)
            print(f"Embeddings successfully computed and cached at {self.cache_file}.")
            return True
        except Exception as e:
            print(f"Could not compute Gemini embeddings: {e}")
            return False

    def retrieve(self, query, client=None, top_k=3):
        if not self.documents:
            return []

        bm25_scores = self.compute_bm25_scores(query)
        max_bm25 = np.max(bm25_scores) if len(bm25_scores) > 0 and np.max(bm25_scores) > 0 else 1.0
        norm_bm25 = bm25_scores / max_bm25 if max_bm25 > 0 else bm25_scores

        semantic_scores = np.zeros(len(self.documents))
        has_embeddings = self.ensure_embeddings(client)

        if has_embeddings and client is not None:
            try:
                res = client.models.embed_content(
                    model="text-embedding-004",
                    contents=query
                )
                values = getattr(res, "embedding", None)
                if values is None and hasattr(res, "embeddings") and res.embeddings:
                    values = getattr(res.embeddings[0], "values", None)
                elif hasattr(values, "values"):
                    values = values.values
                if values is None:
                    values = res.embedding
                q_vec = np.array(list(values), dtype=np.float32)

                q_norm = np.linalg.norm(q_vec)
                doc_norms = np.linalg.norm(self.embeddings, axis=1)
                doc_norms = np.where(doc_norms == 0, 1e-9, doc_norms)
                if q_norm > 0:
                    semantic_scores = np.dot(self.embeddings, q_vec) / (doc_norms * q_norm)
                    min_s, max_s = np.min(semantic_scores), np.max(semantic_scores)
                    if max_s > min_s:
                        semantic_scores = (semantic_scores - min_s) / (max_s - min_s)
            except Exception as e:
                print(f"Notice: Semantic query embedding failed, relying on BM25: {e}")

        if has_embeddings and np.max(semantic_scores) > 0:
            final_scores = 0.60 * semantic_scores + 0.40 * norm_bm25
        else:
            final_scores = norm_bm25

        ranked_indices = np.argsort(final_scores)[::-1][:top_k]
        
        results = []
        for idx in ranked_indices:
            doc_copy = dict(self.documents[idx])
            doc_copy["relevance_score"] = float(round(final_scores[idx], 4))
            results.append(doc_copy)

        return results

    def answer_query(self, query, language="en", conversation_history=None, farm_context=None, client=None):
        """
        Executes full RAG workflow with KRISHMITRA intelligence:
        1. Checks personal farmer profile & land intents directly
        2. Contextual agricultural knowledge retrieval
        3. Multilingual Gemini generation grounded in user lands and agronomy
        """
        # Step 1: Direct Personal Intent Handling (Lands, Crops, Soil, Profile)
        personal_reply = resolve_personal_query(query, farm_context, language=language)
        if personal_reply:
            return {
                "reply": personal_reply,
                "sources": ["FarmMate Verified Farmer Profile"],
                "matchedDocs": ["Personal Lands & Profile"],
                "status": "success",
                "isPersonal": True
            }

        lang_name = LANGUAGE_NAMES.get(language, 'English')
        top_docs = self.retrieve(query, client=client, top_k=3)

        context_blocks = []
        sources = []
        for i, d in enumerate(top_docs, 1):
            context_blocks.append(f"--- Document {i}: {d.get('title')} (Source: {d.get('source')}) ---\n{d.get('content', '').strip()}")
            if d.get("source") and d.get("source") not in sources:
                sources.append(d.get("source"))

        retrieved_context_str = "\n\n".join(context_blocks)

        # Build detailed personal profile string
        farm_profile_str = ""
        if farm_context:
            profile_lines = []
            prof = farm_context.get("profile", {})
            farmer_name = prof.get("name") or "Farmer"
            profile_lines.append(f"- Farmer Name: {farmer_name}")
            if prof.get("district") or prof.get("state"):
                profile_lines.append(f"- Location: {prof.get('district', '')}, {prof.get('state', '')}")
            if prof.get("plan"):
                profile_lines.append(f"- Account Plan: {prof.get('plan')}")

            lands = farm_context.get("lands", [])
            if lands:
                lands_info = [f"'{l.get('landName', 'Farm')}' ({l.get('landSize', '')} {l.get('landUnit', 'acres')}, Soil: {l.get('soilType', 'Unknown')}, City: {l.get('city', '')})" for l in lands]
                profile_lines.append(f"- Registered Lands ({len(lands)} total): {'; '.join(lands_info)}")
            else:
                profile_lines.append("- Registered Lands: None added yet")

            crops = farm_context.get("activeCrops", [])
            if crops:
                crops_info = [f"'{c.get('crop', '')}' on '{c.get('landName', '')}' (Sown: {c.get('startDate', '')}, Harvest: {c.get('harvestDate', '')})" for c in crops]
                profile_lines.append(f"- Active Crops ({len(crops)} total): {'; '.join(crops_info)}")
            else:
                profile_lines.append("- Active Crops: None active")

            farm_profile_str = "\nVERIFIED CURRENT FARMER PROFILE (REAL-TIME DATA):\n" + "\n".join(profile_lines) + "\n"

        history_str = ""
        if conversation_history:
            recent_turns = conversation_history[-4:]
            formatted_turns = []
            for msg in recent_turns:
                role = "Farmer" if msg.get("role") == "user" else "KRISHMITRA"
                text = msg.get("text", "").strip()
                if text:
                    formatted_turns.append(f"{role}: {text}")
            if formatted_turns:
                history_str = "\nRECENT CONVERSATION HISTORY:\n" + "\n".join(formatted_turns) + "\n"

        system_prompt = f"""
You are "KRISHMITRA" (క్రిష్‌మిత్ర / कृषिमित्र), the official, empathetic, and expert AI agricultural advisor of FarmMate for Indian farmers.
Your mission is to provide accurate, practical, and personalized farming guidance.

{farm_profile_str}

OFFICIAL AGRICULTURAL KNOWLEDGE BASE RETRIEVED FOR THIS QUESTION:
{retrieved_context_str}
{history_str}
FARMER'S CURRENT QUESTION:
"{query}"

INSTRUCTIONS FOR YOUR ANSWER:
1. Always address the farmer respectfully by name if available.
2. Ground your advice in the farmer's personal registered lands, soil types, and active crops when applicable.
3. Be clear, practical, and actionable:
   - Provide exact measurements and dosages (e.g., ml/L or g/L of water, kg/acre).
   - Mention both Organic / Natural remedies and Chemical treatments when applicable.
   - Mention application timing (e.g., early morning or late evening).
4. Structure the response cleanly with bullet points and bold section headers. Keep tone warm and respectful.
5. At the bottom of your response, list the cited sources under a "📚 Sources & Guidelines:" heading.
6. CRITICAL LANGUAGE REQUIREMENT: You MUST write your complete response in {lang_name} language only.
"""


        if client:
            last_err = None
            for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=system_prompt
                    )
                    reply_text = response.text.strip()
                    return {
                        "reply": reply_text,
                        "sources": sources,
                        "matchedDocs": [d.get("title") for d in top_docs],
                        "model": model_name,
                        "status": "success"
                    }
                except Exception as e:
                    last_err = str(e)
                    print(f"Gemini API model {model_name} failed: {e}")

            print(f"All Gemini models failed: {last_err}")


        # Fallback to direct knowledge retrieval if Gemini API has quota/billing limits or network error
        if top_docs and top_docs[0].get("relevance_score", 0) > 0.05:
            best = top_docs[0]
            fallback_text = (
                f"### {best.get('title')}\n\n"
                f"{best.get('content').strip()}\n\n"
                f"📚 **Source**: {best.get('source')}"
            )
        else:
            fallback_text = (
                f"I'm here to help with your farming questions regarding crops, fertilizers, pest control, weather, and government schemes like PM-KISAN.\n\n"
                f"Please feel free to ask about specific crops (Paddy, Wheat, Cotton, Maize, Vegetables), fertilizers, pest management, or government schemes!"
            )


        return {
            "reply": fallback_text,
            "sources": sources or ["FarmMate Agricultural Knowledge Base"],
            "matchedDocs": [d.get("title") for d in top_docs],
            "status": "fallback"
        }

# Global singleton instance
rag_engine = AgriRAGEngine()
