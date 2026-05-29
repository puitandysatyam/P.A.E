import os
import pickle
import numpy as np
import tensorflow as tf
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import sys

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model_weights")

# Add train_files to path so we can import the VAE architecture
sys.path.append(os.path.join(os.path.dirname(__file__), "train_files"))
from vae_model import build_encoder, build_decoder, VAE

class MLEngine:
    def __init__(self):
        self.distilbert_model = None
        self.tokenizer = None
        self.autoencoder_model = None
        self.scaler = None
        
        self._load_artifacts()

    def _load_artifacts(self):
        print("Initializing ML Engine...")
        
        # 1. Load FULL Fine-Tuned DistilBERT Model (kept for presentation purposes)
        distilbert_path = os.path.join(MODEL_DIR, "distilbert_categorization_model")
        if not os.path.exists(distilbert_path):
            print(f"Warning: Missing DistilBERT Model at {distilbert_path}")
        else:
            self.tokenizer = AutoTokenizer.from_pretrained(distilbert_path)
            self.distilbert_model = AutoModelForSequenceClassification.from_pretrained(distilbert_path)
            self.distilbert_model.eval()
            print("Successfully loaded FULL Fine-Tuned DistilBERT Model.")

        # Map the 10 HuggingFace categories to our UI's 8 categories
        self.category_mapper = {
            "Food & Dining": "Food",
            "Shopping & Retail": "Shopping",
            "Transportation": "Travel",
            "Income": "Salary",
            "Utilities & Services": "Utilities",
            "Entertainment & Recreation": "Subscriptions",
            "Financial Services": "Investment",
            "Healthcare & Medical": "Shopping",
            "Charity & Donations": "Shopping",
            "Government & Legal": "Utilities"
        }

        # 2. Load VAE Anomaly Engine
        vae_encoder_path = os.path.join(MODEL_DIR, "vae_encoder.weights.h5")
        vae_decoder_path = os.path.join(MODEL_DIR, "vae_decoder.weights.h5")
        scaler_path = os.path.join(MODEL_DIR, "vae_scaler.pkl")
        
        if not os.path.exists(vae_encoder_path) or not os.path.exists(vae_decoder_path):
            raise FileNotFoundError(f"Missing VAE Model Weights! Ensure vae_encoder.weights.h5 and vae_decoder.weights.h5 are in {MODEL_DIR}")

        input_dimensions = 3 # Amount, Time_of_Day, Sketchiness
        encoder = build_encoder(input_dim=input_dimensions)
        decoder = build_decoder(latent_dim=2, original_dim=input_dimensions)
        self.autoencoder_model = VAE(encoder, decoder)
        
        self.autoencoder_model.encoder.load_weights(vae_encoder_path)
        self.autoencoder_model.decoder.load_weights(vae_decoder_path)
        
        with open(scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
            
        print("Successfully loaded VAE Model for Anomaly Detection.")
        print("MLEngine fully initialized and ready for production!")

    def categorize_transaction(self, text: str) -> dict:
        if not self.tokenizer or not self.distilbert_model:
            return {"predictedCategory": "Pending", "confidenceScore": 0.0, "top2Distance": 0.0}

        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=32)
        
        with torch.no_grad():
            outputs = self.distilbert_model(**inputs)
            
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]
        
        top_probs, top_indices = torch.topk(probs, 2)
        top_prob = top_probs[0].item()
        second_prob = top_probs[1].item() if len(probs) > 1 else 0.0
        
        max_idx = top_indices[0].item()
        raw_category = self.distilbert_model.config.id2label[max_idx]
        mapped_category = self.category_mapper.get(raw_category, "Shopping") # Default fallback
        
        return {
            "predictedCategory": mapped_category,
            "confidenceScore": float(top_prob),
            "top2Distance": float(top_prob - second_prob)
        }

    def detect_anomaly(self, amount: float, time_of_day: float = 14.0, merchant_sketchiness_score: float = 0.0) -> bool:
        expected_features = self.scaler.n_features_in_
        features = np.zeros((1, expected_features))
            
        # VAE trained on [Amount, Time_of_Day, Sketchiness]
        features[0, 0] = amount 
        features[0, 1] = time_of_day
        features[0, 2] = merchant_sketchiness_score
            
        scaled_features = self.scaler.transform(features)
        
        # VAE inference uses probabilistic sampling via the encoder
        z_mean, z_log_var, z = self.autoencoder_model.encoder.predict(scaled_features, verbose=0)
        reconstructed = self.autoencoder_model.decoder.predict(z_mean, verbose=0) 
        
        mse = np.mean(np.power(scaled_features - reconstructed, 2))
        
        threshold = 0.50 
        ml_is_anomaly = bool(mse > threshold)
        
        # --- HYBRID HEURISTIC GUARDRAILS ---
        if amount < 500:
            ml_is_anomaly = False
            
        if amount >= 100000:
            ml_is_anomaly = True
            
        elif amount > 10000 and merchant_sketchiness_score < 0.25:
            ml_is_anomaly = False
            
        elif amount > 10000 and merchant_sketchiness_score >= 0.25:
            ml_is_anomaly = True

        print(f"[VAE ENGINE] Amount: {amount} | Time: {time_of_day} | Sketchiness: {merchant_sketchiness_score} | MSE: {mse:.6f} | Anomaly: {ml_is_anomaly}")
        
        return ml_is_anomaly

ml_engine = MLEngine()
