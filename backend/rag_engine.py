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
                # handle both single and list embedding returns
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

            # Save to cache
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

                # Compute cosine similarities
                q_norm = np.linalg.norm(q_vec)
                doc_norms = np.linalg.norm(self.embeddings, axis=1)
                doc_norms = np.where(doc_norms == 0, 1e-9, doc_norms)
                if q_norm > 0:
                    semantic_scores = np.dot(self.embeddings, q_vec) / (doc_norms * q_norm)
                    # Normalize to 0-1
                    min_s, max_s = np.min(semantic_scores), np.max(semantic_scores)
                    if max_s > min_s:
                        semantic_scores = (semantic_scores - min_s) / (max_s - min_s)
            except Exception as e:
                print(f"Notice: Semantic query embedding failed, relying on BM25: {e}")

        # Hybrid weight: 60% semantic, 40% lexical BM25
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
        Executes full RAG workflow:
        1. Contextual agricultural retrieval
        2. Prompt augmentation with retrieved evidence + farm context
        3. Multilingual Gemini generation with fallback
        """
        lang_name = LANGUAGE_NAMES.get(language, 'English')
        top_docs = self.retrieve(query, client=client, top_k=3)

        # Build context from retrieved chunks
        context_blocks = []
        sources = []
        for i, d in enumerate(top_docs, 1):
            context_blocks.append(f"--- Document {i}: {d.get('title')} (Source: {d.get('source')}) ---\n{d.get('content', '').strip()}")
            if d.get("source") and d.get("source") not in sources:
                sources.append(d.get("source"))

        retrieved_context_str = "\n\n".join(context_blocks)

        # Build farm context string if available
        farm_profile_str = ""
        if farm_context:
            profile_lines = []
            if farm_context.get("lands"):
                lands_info = [f"{l.get('name', 'Farm')} (Soil: {l.get('soilType', 'Unknown')}, Size: {l.get('size', '')} {l.get('unit', '')}, City: {l.get('city', '')})" for l in farm_context["lands"][:3]]
                profile_lines.append(f"- Farmer's Registered Lands: {'; '.join(lands_info)}")
            if farm_context.get("activeCrops"):
                crops_info = [f"{c.get('crop', '')} (Stage/Day: {c.get('day', 'Active')}, Started: {c.get('startDate', '')})" for c in farm_context["activeCrops"][:3]]
                profile_lines.append(f"- Currently Growing Crops: {'; '.join(crops_info)}")
            if farm_context.get("weather"):
                w = farm_context["weather"]
                profile_lines.append(f"- Current Local Weather: {w.get('temperature', '')}°C, {w.get('description', '')}, Humidity: {w.get('humidity', '')}%, City: {w.get('city', '')}")

            if profile_lines:
                farm_profile_str = "\nFARMER'S CURRENT PROFILE & CONTEXT:\n" + "\n".join(profile_lines) + "\n"

        # Format conversation history
        history_str = ""
        if conversation_history:
            recent_turns = conversation_history[-4:]
            formatted_turns = []
            for msg in recent_turns:
                role = "Farmer" if msg.get("role") == "user" else "AgriBot"
                text = msg.get("text", "").strip()
                if text:
                    formatted_turns.append(f"{role}: {text}")
            if formatted_turns:
                history_str = "\nRECENT CONVERSATION HISTORY:\n" + "\n".join(formatted_turns) + "\n"

        system_prompt = f"""
You are "FarmMate AgriBot" (కిసాన్ మిత్ర / किसान मित्र), a knowledgeable, empathetic, and friendly agricultural advisor for Indian farmers.
Your mission is to provide accurate, practical, and scientifically sound farming guidance.

OFFICIAL AGRICULTURAL KNOWLEDGE BASE RETRIEVED FOR THIS QUESTION:
{retrieved_context_str}
{farm_profile_str}
{history_str}
FARMER'S CURRENT QUESTION:
"{query}"

INSTRUCTIONS FOR YOUR ANSWER:
1. Ground your answer primarily in the provided Official Agricultural Knowledge Base above.
2. If the farmer's question relates to their specific lands, soil, or crops mentioned in their profile, personalize the advice directly for them.
3. Be clear, practical, and actionable:
   - Provide exact measurements and dosages (e.g., ml/L or g/L of water, kg/acre).
   - Mention both Organic / Natural remedies (Neem, Jeevamrutha, Biofertilizers) and Chemical treatments when applicable.
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


        # Fallback if Gemini client is unavailable or failed
        if top_docs and top_docs[0].get("relevance_score", 0) > 0.05:
            best = top_docs[0]
            fallback_text = (
                f"### {best.get('title')}\n\n"
                f"{best.get('content')}\n\n"
                f"📚 **Source**: {best.get('source')}\n\n"
                f"*(Note: Gemini live generation is in offline fallback mode. Please configure GEMINI_API_KEY in backend/.env for full conversational responses in {lang_name}.)*"
            )
        else:
            fallback_text = (
                f"I'm here to help with your farming questions regarding crops, fertilizers, pest control, weather, and government schemes like PM-KISAN.\n\n"
                f"Please ensure `GEMINI_API_KEY` is set in your backend `.env` file to enable full AI responses in {lang_name}."
            )

        return {
            "reply": fallback_text,
            "sources": sources or ["FarmMate Agricultural Knowledge Base"],
            "matchedDocs": [d.get("title") for d in top_docs],
            "status": "fallback"
        }

# Global singleton instance
rag_engine = AgriRAGEngine()
