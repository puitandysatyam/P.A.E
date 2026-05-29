import os
import time
import boto3
import requests
import json
import re
import uuid
from collections import defaultdict
from dotenv import load_dotenv
from database import db_helper
from inference import ml_engine
from botocore.config import Config

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "dummy_key")

# AWS SQS Setup
AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
QUEUE_NAME = 'analyze-statement-queue'
sqs = boto3.client('sqs', region_name=AWS_REGION)

def get_queue_url():
    try:
        response = sqs.get_queue_url(QueueName=QUEUE_NAME)
        return response['QueueUrl']
    except sqs.exceptions.QueueDoesNotExist:
        # Create queue if it doesn't exist (helpful for local/hackathon testing)
        response = sqs.create_queue(QueueName=QUEUE_NAME)
        print(f"Created SQS Queue: {QUEUE_NAME}")
        return response['QueueUrl']

QUEUE_URL = get_queue_url()

def calculate_sketchiness(merchant_string):
    merchant_string = str(merchant_string)
    if len(merchant_string) == 0: return 0.0
    non_alpha_count = sum(1 for char in merchant_string if not char.isalpha())
    return round(non_alpha_count / len(merchant_string), 2)

def extract_merchant(text, txn_type="DEBIT"):
    text = text.strip()
    text_lower = text.lower()
    
    # 1. Hardcoded Deterministic Brands
    brands = {
        "netflix": ("Netflix", "Subscription"),
        "spotify": ("Spotify", "Subscription"),
        "amazon prime": ("Amazon Prime", "Subscription"),
        "hotstar": ("Hotstar", "Subscription"),
        "swiggy": ("Swiggy", "Food"),
        "zomato": ("Zomato", "Food"),
        "groww": ("Groww", "Investment"),
        "zerodha": ("Zerodha", "Investment"),
        "upstox": ("Upstox", "Investment"),
        "amazon": ("Amazon", "Shopping"),
        "flipkart": ("Flipkart", "Shopping"),
        "myntra": ("Myntra", "Shopping"),
        "blinkit": ("Blinkit", "Food"),
        "zepto": ("Zepto", "Food"),
        "uber": ("Uber", "Travel"),
        "ola": ("Ola", "Travel")
    }
    
    for key, val in brands.items():
        if key in text_lower:
            return val[0], val[1]
            
    # 2. UPI Logic
    if text.startswith("UPI/") or "UPI" in text or "upi" in text_lower:
        # Extract VPA if present
        vpa_match = re.search(r'[\w\.-]+@[\w\.-]+', text)
        vpa = vpa_match.group(0) if vpa_match else "Unknown UPI"
        
        # Determine direction
        cat = "UPI Received" if txn_type == "CREDIT" else "UPI Sent"
        return vpa, cat
        
    # 3. Basic fallback
    if "NEFT" in text or "IMPS" in text:
        parts = text.split("-")
        if len(parts) > 2:
            return parts[2][:15].strip(), None
    elif "/" in text:
        return text.split("/")[0][:15].strip(), None
    return text[:15].strip(), None

def process_statement(doc_id: str):
    print(f"Processing Document ID: {doc_id}")
    doc = db_helper.get_document(doc_id)
    
    if not doc:
        print(f"Error: Document {doc_id} not found in DynamoDB.")
        return False

    transactions = doc.get("transactions", [])
    raw_text = doc.get("rawText", None)
    
    # 1. If we have rawText but no transactions, we need to extract transactions via Bedrock LLM first
    if raw_text and not transactions:
        print(f"Extracting transactions from raw PDF text via Bedrock for {doc_id}...")
        prompt = "You are a financial data extraction AI. Extract all bank transactions from the following raw text extracted from a PDF bank statement. " + \
                 "Return ONLY a strict JSON array of objects. Do not wrap it in markdown block quotes. Each object must have exactly these keys: " + \
                 "'date' (String, YYYY-MM-DD), 'rawNarration' (String), 'amount' (Number), 'type' (String, strictly 'CREDIT' or 'DEBIT'). " + \
                 "If it is an expense/withdrawal, it is a DEBIT. If it is an income/deposit, it is a CREDIT. " + \
                 "Do not include any explanation or extra text.\n\nRAW PDF TEXT:\n" + raw_text

        try:
            config = Config(read_timeout=300, retries={'max_attempts': 1})
            bedrock = boto3.client('bedrock-runtime', region_name=AWS_REGION, config=config)
            response = bedrock.converse(
                modelId="google.gemma-3-27b-it",
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"temperature": 0.0}
            )
            extracted_text = response['output']['message']['content'][0]['text'].strip()
            
            # Clean JSON wrapping
            extracted_text = re.sub(r"^```json\s*", "", extracted_text)
            extracted_text = re.sub(r"\s*```$", "", extracted_text)
            extracted_text = extracted_text.strip()
            
            transactions = json.loads(extracted_text)
            
            # Ensure required fields and generate UUIDs
            for t in transactions:
                t['txnId'] = str(uuid.uuid4())
                t['amount'] = float(t.get('amount', 0.0))
                t['rawNarration'] = t.get('rawNarration', '')
                t['date'] = t.get('date', '')
                t['type'] = t.get('type', 'DEBIT')
                
            print(f"Successfully extracted {len(transactions)} transactions.")
        except Exception as e:
            print(f"Error extracting transactions via Bedrock: {e}")
            return False
    total_income = 0.0
    total_expense = 0.0
    total_recurring_expense = 0.0
    anomalies_count = 0
    category_totals = {}
    
    # 1. Pre-computation for velocities and routine analysis
    merchant_dates = defaultdict(list)
    merchant_amounts = defaultdict(list)
    date_amounts = defaultdict(list)
    amount_txns = defaultdict(list)
    
    for txn in transactions:
        text = txn.get("rawNarration", "")
        txn_type = txn.get("type", "DEBIT")
        merchant_name, _ = extract_merchant(text, txn_type)
        date_str = txn.get("date", "")
        # DynamoDB uses Decimal for floats, convert to float
        amount = float(txn.get("amount", 0.0))
        
        merchant_dates[merchant_name].append(date_str)
        merchant_amounts[merchant_name].append(amount)
        if amount > 1000 and amount % 1000 == 0:
            date_amounts[date_str].append(amount)
        if txn_type == "DEBIT" and amount > 0:
            amount_txns[amount].append(text)

    confused_txns = []

    # 2. First Pass: DistilBERT Classification & Feature Extraction
    for i, txn in enumerate(transactions):
        text = txn.get("rawNarration", "")
        date_str = txn.get("date", "")
        amount = float(txn.get("amount", 0.0))
        txn_type = txn.get("type", "DEBIT")
        
        merchant_name, hardcoded_cat = extract_merchant(text, txn_type)
        
        # 3. Anomaly Detection
        sketchiness = calculate_sketchiness(merchant_name)
        velocity = len(date_amounts.get(date_str, []))
        if txn_type == "CREDIT":
            is_anomaly = False
        else:
            # We don't have exact time_of_day from standard bank PDFs, so we omit it and use the default
            is_anomaly = ml_engine.detect_anomaly(amount, merchant_sketchiness_score=sketchiness)
        
        # Categorization
        if hardcoded_cat:
            predicted_category = hardcoded_cat
            confidence = 1.0
            top2_distance = 1.0
            source = "Deterministic Engine"
        else:
            cat_result = ml_engine.categorize_transaction(text)
            predicted_category = cat_result["predictedCategory"]
            confidence = cat_result.get("confidenceScore", 1.0)
            top2_distance = cat_result.get("top2Distance", 1.0)
            source = "DistilBERT"
            # User request: Always override DistilBERT because its accuracy is low on Indian Txns
            confused_txns.append({'index': i, 'text': text})
        
        # Subscription vs Routine Spend Analysis
        is_recurring = False
        merchant_count = len(merchant_dates[merchant_name])
        amounts_list = merchant_amounts[merchant_name]
        
        if txn_type == "DEBIT":
            # 1. Exact amount match + Text similarity (e.g. Txn ID patterns)
            if len(amount_txns[amount]) >= 2:
                texts = amount_txns[amount]
                # If the first 5 characters match, they likely share an ID or Merchant Code
                first_chars = [t[:5].lower() for t in texts]
                if first_chars.count(text[:5].lower()) >= 2:
                    is_recurring = True
                    if not hardcoded_cat:
                        predicted_category = "Subscription"

            # 2. Frequent Merchant (Routine Habit)
            if not is_recurring and merchant_count > 3:
                variance = max(amounts_list) - min(amounts_list)
                avg_amount = sum(amounts_list) / merchant_count
                if avg_amount > 0 and (variance / avg_amount) < 0.20:
                    is_recurring = True
                    predicted_category = "Routine Habit"
                    
            # 3. Fallback: Known Subscription or Ends in 9
            elif not is_recurring and merchant_count == 1:
                amount_ends_in_9 = str(int(amount)).endswith("9")
                if predicted_category == "Subscription" or amount_ends_in_9:
                    is_recurring = True
                    predicted_category = "Subscription"
            
        txn["mlData"] = {
            "predictedCategory": predicted_category,
            "confidenceScore": confidence,
            "isAnomaly": is_anomaly,
            "isRecurring": is_recurring,
            "source": source
        }

    # 3. Batch LLM Categorization via AWS Bedrock
    if confused_txns:
        print(f"Batching {len(confused_txns)} transactions to AWS Bedrock to override DistilBERT...")
        prompt = "Categorize the following transactions into strictly one of these categories: [Food, Shopping, Travel, Salary, Utilities, Subscriptions, Investment, Others]. Return ONLY a valid JSON array of objects with keys 'index' and 'category'. Do not wrap in markdown or give any explanations.\n\nTransactions:\n"
        for c in confused_txns:
            # If the deterministic engine already flagged it as a Routine Habit/Subscription during the loop, skip sending it to Bedrock to save tokens
            current_cat = transactions[c['index']]["mlData"]["predictedCategory"]
            if current_cat in ["Routine Habit", "Subscription"]:
                transactions[c['index']]["mlData"]["source"] = "Deterministic Engine"
                transactions[c['index']]["mlData"]["confidenceScore"] = 0.95
                continue
            prompt += f"Index: {c['index']} | Text: {c['text']}\n"
            
        # Only call bedrock if there are still items in the prompt after filtering routines
        if "Index:" in prompt:
            try:
                config = Config(read_timeout=300, retries={'max_attempts': 1})
                bedrock = boto3.client('bedrock-runtime', region_name=AWS_REGION, config=config)
                response = bedrock.converse(
                    modelId="meta.llama3-8b-instruct-v1:0",
                    messages=[{"role": "user", "content": [{"text": prompt}]}],
                    inferenceConfig={"temperature": 0.0}
                )
                
                llm_text = response['output']['message']['content'][0]['text'].strip()
                
                # Manual regex to handle markdown in python
                llm_text = re.sub(r"^```json\s*", "", llm_text)
                llm_text = re.sub(r"\s*```$", "", llm_text)
                llm_text = llm_text.strip()
                
                llm_results = json.loads(llm_text)
                for res in llm_results:
                    idx = res.get('index')
                    cat = res.get('category')
                    if idx is not None and cat:
                        transactions[idx]["mlData"]["predictedCategory"] = cat
                        transactions[idx]["mlData"]["confidenceScore"] = 0.99
                        transactions[idx]["mlData"]["source"] = "AWS_Bedrock"
            except Exception as e:
                print(f"AWS Bedrock Batch Categorization exception: {e}")
                # Fallback mapping if Bedrock fails
                for c in confused_txns:
                    idx = c['index']
                    if transactions[idx]["mlData"]["predictedCategory"] == "Pending":
                        transactions[idx]["mlData"]["predictedCategory"] = "Others"
                        transactions[idx]["mlData"]["source"] = "Fallback"

    # 4. Final Aggregation
    for txn in transactions:
        amount = float(txn.get("amount", 0.0))
        txn_type = txn.get("type", "DEBIT")
        predicted_category = txn["mlData"]["predictedCategory"]
        is_recurring = txn["mlData"]["isRecurring"]
        is_anomaly = txn["mlData"]["isAnomaly"]
        
        # Fix formatting for DynamoDB (Cannot store float, but can store python float directly via boto3 as it converts to Decimal)
        # We will keep it as python float/int, boto3 handles it.
        
        if txn_type == "CREDIT":
            total_income += amount
        else:
            total_expense += amount
            category_totals[predicted_category] = category_totals.get(predicted_category, 0) + amount
            if is_recurring:
                total_recurring_expense += amount
        
        if is_anomaly:
            anomalies_count += 1

    highest_cat = max(category_totals, key=category_totals.get) if category_totals else "None"
    
    if total_income == 0 and total_expense > 0:
        health_status = "CRITICAL"
    elif total_expense > total_income:
        health_status = "CRITICAL"
    elif total_expense > (total_income * 0.8):
        health_status = "WARNING"
    else:
        health_status = "GOOD"
    
    summary_metrics = {
        "totalIncome": int(total_income), # Use int to avoid DynamoDB decimal conversion issues if minor precision lost
        "totalExpense": int(total_expense),
        "totalRecurringExpense": int(total_recurring_expense),
        "anomaliesCount": anomalies_count,
        "financialHealth": health_status,
        "highestCategory": highest_cat,
        "categoryBreakdown": {k: int(v) for k, v in category_totals.items()},
        "predictedBurnRate": int(total_recurring_expense),
        "predictedDiscretionaryIncome": int(max(0, total_income - total_recurring_expense))
    }

    # Fix transaction amounts for DynamoDB (Convert float to int for safety in JSON structure)
    for txn in transactions:
        txn['amount'] = int(float(txn['amount']))
        txn['mlData']['confidenceScore'] = str(txn['mlData']['confidenceScore']) # Keep float precision as string

    # 4.5 Targeted Affiliate Ads (Server-Driven UI)
    ad_payload = None
    food_shopping_spend = category_totals.get("Food", 0) + category_totals.get("Shopping", 0)
    
    if total_expense > 140000 or category_totals.get("Rent", 0) > 15000:
        # High Transfers / Rent Scenario (Triggers for March test statement due to 85k anomaly)
        ad_payload = {
            "title": "Get rewarded for large transfers & rent",
            "description": "Pay rent or make large transfers via credit card and get up to 2% cashback instantly.",
            "cta": "Pay via CRED",
            "link": "https://cred.club"
        }
    elif total_income > (total_expense * 1.4) and total_income > 50000:
        # High Idle Cash Scenario (Triggers for Jan/Feb test statements)
        ad_payload = {
            "title": "Make your idle cash work for you",
            "description": f"You have over ₹{int(total_income - total_expense):,} sitting idle. Invest in Index Funds today.",
            "cta": "Invest with Groww",
            "link": "https://groww.in"
        }
    elif food_shopping_spend > 5000:
        # High Spender Scenario (Fallback for test statements if random generation pushes expenses high)
        ad_payload = {
            "title": "Stop leaving money on the table",
            "description": f"You spent over ₹{int(food_shopping_spend):,} on Food & Shopping. Get 10% cashback.",
            "cta": "Apply for Swiggy HDFC",
            "link": "https://hdfcbank.com/swiggy"
        }
    else:
        # Generic Fallback Ad
        ad_payload = {
            "title": "Upgrade your financial life",
            "description": "Unlock premium insights, advanced budgeting tools, and more.",
            "cta": "Upgrade to PR² Pro",
            "link": "#upgrade"
        }

    # 5. Generate AI Financial Advice instantly before saving COMPLETED status
    ai_summary = "AI Advisor is currently analyzing your data. Please check back later."
    try:
        bedrock = boto3.client('bedrock-runtime', region_name=AWS_REGION)
        prompt = f"You are a professional, empathetic, and highly analytical financial advisor for a premium FinTech app. Your client has a total monthly income of ₹{total_income:,.2f} and total expenses of ₹{total_expense:,.2f}. Their highest spending category is '{highest_cat}'. Write a 2-3 sentence personalized financial recommendation that is encouraging, insightful, and professional. Do not use markdown, and ensure the tone is suitable for a professional banking application."
        
        response = bedrock.converse(
            modelId="google.gemma-3-27b-it",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"temperature": 0.5}
        )
        ai_summary = response['output']['message']['content'][0]['text'].strip()
        print("Generated AI Financial Advice.")
    except Exception as e:
        print(f"Error generating AI summary: {e}")

    success = db_helper.update_document_results(doc_id, transactions, summary_metrics, ai_summary, ad_payload)
    if success:
        print(f"Successfully processed and updated DynamoDB for {doc_id}")
        return True
    else:
        print(f"Failed to update DynamoDB for {doc_id}")
        return False

def start_consumer():
    print(f"Starting AWS SQS Consumer on {QUEUE_URL}...")
    
    while True:
        try:
            # Long polling for 20 seconds
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20
            )
            
            messages = response.get('Messages', [])
            for message in messages:
                doc_id = message['Body']
                receipt_handle = message['ReceiptHandle']
                
                print(f"Received message for docId: {doc_id}")
                success = process_statement(doc_id)
                
                if success:
                    # Delete message from queue
                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=receipt_handle
                    )
                    print("Deleted message from queue.")
                    
        except Exception as e:
            print(f"Error polling SQS: {e}")
            time.sleep(5)

if __name__ == "__main__":
    start_consumer()
