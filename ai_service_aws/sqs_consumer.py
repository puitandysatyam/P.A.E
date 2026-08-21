import os
import time
import boto3

import json
import re
import uuid
from collections import defaultdict
from dotenv import load_dotenv
from database import db_helper

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
        "ola": ("Ola", "Travel"),
        "bajaj finserv": ("Bajaj Finserv", "EMI"),
        "bajaj finance": ("Bajaj Finance", "EMI"),
        "cred": ("CRED", "Bill Payment"),
        "paytm": ("Paytm", "Bill Payment"),
        "phonepe": ("PhonePe", "Bill Payment"),
        "gpay": ("Google Pay", "Bill Payment"),
        "google pay": ("Google Pay", "Bill Payment"),
    }
    
    for key, val in brands.items():
        if key in text_lower:
            return val[0], val[1]
            
    # 2. UPI Logic (Advanced Parsing)
    if text.startswith("UPI/") or "UPI" in text or "upi" in text_lower:
        # Many UPI Txns are formatted like: UPI/DR/RefNo/MerchantName/Bank/...
        parts = text.split("/")
        if len(parts) >= 4:
            merchant = parts[3].strip()
            # If the extracted merchant matches any known brand
            for key, val in brands.items():
                if key in merchant.lower():
                    return val[0], val[1]
            cat = "UPI Received" if txn_type == "CREDIT" else "UPI Sent"
            return merchant.title(), cat
            
        # Extract VPA if present as fallback
        vpa_match = re.search(r'[\w\.-]+@[\w\.-]+', text)
        vpa = vpa_match.group(0) if vpa_match else "Unknown UPI"
        
        # Determine direction
        cat = "UPI Received" if txn_type == "CREDIT" else "UPI Sent"
        return vpa, cat
        
    # 3. Basic fallback
    if "NEFT" in text or "IMPS" in text:
        parts = text.split("-")
        if len(parts) > 2:
            return parts[2][:15].strip().title(), None
    elif "/" in text:
        return text.split("/")[0][:15].strip().title(), None
    return text[:20].strip().title(), None

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
                modelId="meta.llama3-8b-instruct-v1:0",
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

    # 2. First Pass: Deterministic Classification & Feature Extraction
    for i, txn in enumerate(transactions):
        text = txn.get("rawNarration", "")
        date_str = txn.get("date", "")
        amount = float(txn.get("amount", 0.0))
        txn_type = txn.get("type", "DEBIT")
        
        merchant_name, hardcoded_cat = extract_merchant(text, txn_type)
        sketchiness = calculate_sketchiness(merchant_name)
        
        predicted_category = "Pending"
        confidence = 1.0
        source = "Deterministic Engine"
        is_anomaly = False
        
        if hardcoded_cat:
            predicted_category = hardcoded_cat
        else:
            confused_txns.append({'index': i, 'text': text, 'amount': amount, 'sketchiness': sketchiness})
        
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
                    if not hardcoded_cat:
                        predicted_category = "Routine Habit"
                    
            # 3. Fallback: Known Subscription or Ends in 9
            elif not is_recurring and merchant_count == 1:
                amount_ends_in_9 = str(int(amount)).endswith("9")
                if predicted_category == "Subscription" or amount_ends_in_9:
                    is_recurring = True
                    if not hardcoded_cat:
                        predicted_category = "Subscription"
            
        txn["merchantName"] = merchant_name
        txn["mlData"] = {
            "predictedCategory": predicted_category,
            "confidenceScore": confidence,
            "isAnomaly": is_anomaly,
            "isRecurring": is_recurring,
            "source": source
        }

    # 3. Batch LLM Categorization & Anomaly Detection via AWS Bedrock
    if confused_txns:
        print(f"Batching {len(confused_txns)} transactions to AWS Bedrock for categorization and anomaly detection...")
        prompt = "You are a financial AI. Categorize the following transactions into strictly one of these categories: [Food, Shopping, Travel, Salary, Utilities, Subscriptions, Investment, Others]. Also detect if the transaction is an anomaly based on its text, amount, and sketchiness. Return ONLY a valid JSON array of objects with keys 'index', 'category', and 'isAnomaly' (boolean). Do not wrap in markdown or give any explanations.\n\nTransactions:\n"
        for c in confused_txns:
            # If the deterministic engine already flagged it as a Routine Habit/Subscription during the loop, we already know the category, but we still need anomaly detection.
            current_cat = transactions[c['index']]["mlData"]["predictedCategory"]
            if current_cat in ["Routine Habit", "Subscription"]:
                prompt += f"Index: {c['index']} | Text: {c['text']} | Amount: {c['amount']} | Sketchiness: {c['sketchiness']} (Note: Pre-categorized as {current_cat}, just verify anomaly)\n"
            else:
                prompt += f"Index: {c['index']} | Text: {c['text']} | Amount: {c['amount']} | Sketchiness: {c['sketchiness']}\n"
            
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
                    is_anomaly = res.get('isAnomaly', False)
                    if idx is not None:
                        current_cat = transactions[idx]["mlData"]["predictedCategory"]
                        # Do not override category if it was determined as Routine Habit / Subscription deterministically
                        if current_cat not in ["Routine Habit", "Subscription"] and cat:
                            transactions[idx]["mlData"]["predictedCategory"] = cat
                        transactions[idx]["mlData"]["isAnomaly"] = bool(is_anomaly)
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
        prompt = f"You are a professional, empathetic, and highly analytical financial advisor for a premium FinTech app. Your client has a total monthly income of {total_income} and total expenses of {total_expense}. Their highest spending category is '{highest_cat}'. Write a 2-3 sentence personalized financial recommendation that is encouraging, insightful, and professional. Do not use markdown, and ensure the tone is suitable for a professional banking application. Strictly format all currency values as Indian Rupees (INR) using the ₹ symbol, adhering to the Indian numbering system (e.g., ₹1,50,000 instead of ₹150,000)."
        
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
