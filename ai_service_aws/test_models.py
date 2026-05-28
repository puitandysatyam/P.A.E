import os
import random
from inference import MLEngine

def run_tests():
    print("=============================================")
    print("  P.A.E - OFFLINE ML ENGINE VALIDATION TEST  ")
    print("=============================================\n")
    
    try:
        engine = MLEngine()
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load ML Engine. Make sure weights are in model_weights/.\nError: {e}")
        return

    # 1. DistilBERT Categorization Test Cases
    # We will test 10 realistic Indian bank narrations to see if it predicts correctly
    categorization_tests = [
        ("UPI/ZOMATO/food delivery/pay", "Food"),
        ("AMZN Mktp US Amzn.com/bill", "Shopping"),
        ("NETFLIX.COM Amsterdam", "Subscriptions"),
        ("UBER INDIA SYSTEMS P L", "Travel"),
        ("SALARY CREDITED FOR MAY 2026", "Salary"),
        ("ZERODHA BROKING LTD", "Investment"),
        ("BESCOM ELECTRICITY BILL", "Utilities"),
        ("SWIGGY INSTAMART", "Food"),
        ("FLIPKART INTERNET PVT", "Shopping"),
        ("MAKE MY TRIP INDIA PVT", "Travel")
    ]
    
    print("\n--- DISTILBERT CATEGORIZATION ACCURACY TEST ---")
    correct_cats = 0
    for text, expected in categorization_tests:
        result = engine.categorize_transaction(text)
        predicted = result["predictedCategory"]
        conf = result["confidenceScore"]
        
        match = "✅" if predicted == expected else "❌"
        if predicted == expected:
            correct_cats += 1
            
        print(f"{match} Text: '{text[:25]:<25}' | Expected: {expected:<13} | Predicted: {predicted:<13} | Conf: {conf:.2f}")
        
    print(f"\nCategorization Accuracy: {correct_cats}/{len(categorization_tests)} ({(correct_cats/len(categorization_tests))*100}%)\n")


    # 2. VAE Anomaly Detection Test Cases
    # Format: (Amount, Time_of_Day, Sketchiness, Expected_Anomaly)
    anomaly_tests = [
        (250.0, 14.0, 0.0, False),    # Normal afternoon lunch
        (1500.0, 18.0, 0.0, False),   # Normal evening shopping
        (250000.0, 14.0, 0.0, True),  # Massive amount (guardrail triggers)
        (3500.0, 3.0, 0.8, True),     # 3 AM transfer to highly sketchy merchant
        (450.0, 9.0, 0.0, False),     # Normal morning coffee
        (18500.0, 2.0, 0.9, True),    # Huge amount at 2 AM with sketchy name
        (120.0, 13.0, 0.0, False),    # Normal small expense
        (85000.0, 4.0, 0.6, True),    # 4 AM massive wire transfer
    ]
    
    print("--- VAE ANOMALY DETECTION TEST ---")
    correct_anomalies = 0
    for amt, time_of_day, sketch, expected in anomaly_tests:
        # Run inference
        is_flagged = engine.detect_anomaly(amount=amt, time_of_day=time_of_day, merchant_sketchiness_score=sketch)
        
        match = "✅" if is_flagged == expected else "❌"
        if is_flagged == expected:
            correct_anomalies += 1
            
        print(f"{match} Amt: ₹{amt:<8} | Time: {time_of_day:>4.1f} | Sketch: {sketch:.1f} | Flagged: {str(is_flagged):<5} | Expected: {str(expected):<5}")
        
    print(f"\nAnomaly Detection Accuracy: {correct_anomalies}/{len(anomaly_tests)} ({(correct_anomalies/len(anomaly_tests))*100}%)\n")
    print("=============================================")
    print("TEST SUITE COMPLETE")

if __name__ == "__main__":
    run_tests()
