#!/usr/bin/env python3
"""Quick diagnostic to find which Bedrock models + regions actually work."""
import boto3
from botocore.config import Config

REGIONS = ["us-east-1", "ap-south-1", "us-west-2"]
MODELS = [
    "meta.llama3-8b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "amazon.titan-text-lite-v1",
    "amazon.titan-text-express-v1",
    "anthropic.claude-instant-v1",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "mistral.mistral-7b-instruct-v0:2",
]

PROMPT = "Say hello in one word."
config = Config(read_timeout=30, retries={'max_attempts': 0})

print("=" * 60)
print("BEDROCK DIAGNOSTIC TEST")
print("=" * 60)

# First, check what boto3 version we have
print(f"\nboto3 version: {boto3.__version__}")
import botocore
print(f"botocore version: {botocore.__version__}")

# Check if Converse API exists
client = boto3.client('bedrock-runtime', region_name='us-east-1', config=config)
has_converse = hasattr(client, 'converse')
print(f"Converse API available: {has_converse}")

if not has_converse:
    print("\n❌ CRITICAL: Your boto3 version is too old for the Converse API!")
    print("   The Converse API requires boto3 >= 1.34.116 (May 2024)")
    print("   You have boto3 == " + boto3.__version__)
    print("   Fix: Update requirements.txt to boto3>=1.35.0")
    exit(1)

print("\n" + "-" * 60)
print("Testing InvokeModel API (older, more compatible)...")
print("-" * 60)

import json

for region in REGIONS:
    for model_id in MODELS:
        try:
            bedrock = boto3.client('bedrock-runtime', region_name=region, config=config)
            
            # Use invoke_model instead of converse for broader compatibility
            if "titan" in model_id:
                body = json.dumps({"inputText": PROMPT, "textGenerationConfig": {"maxTokenCount": 10, "temperature": 0}})
                content_type = "application/json"
            elif "anthropic" in model_id:
                if "claude-3" in model_id:
                    body = json.dumps({"anthropic_version": "bedrock-2023-05-31", "max_tokens": 10, "messages": [{"role": "user", "content": PROMPT}]})
                else:
                    body = json.dumps({"prompt": f"\n\nHuman: {PROMPT}\n\nAssistant:", "max_tokens_to_sample": 10, "temperature": 0})
                content_type = "application/json"
            elif "meta" in model_id:
                body = json.dumps({"prompt": PROMPT, "max_gen_len": 10, "temperature": 0.01})
                content_type = "application/json"
            elif "mistral" in model_id:
                body = json.dumps({"prompt": f"<s>[INST] {PROMPT} [/INST]", "max_tokens": 10, "temperature": 0.01})
                content_type = "application/json"
            else:
                continue

            response = bedrock.invoke_model(
                modelId=model_id,
                body=body,
                contentType=content_type,
                accept="application/json"
            )
            result = json.loads(response['body'].read())
            print(f"  ✅ {region:12s} | {model_id:45s} | WORKS!")
        except Exception as e:
            err_msg = str(e)[:80]
            print(f"  ❌ {region:12s} | {model_id:45s} | {err_msg}")

print("\n" + "-" * 60)
print("Testing Converse API...")
print("-" * 60)

for region in REGIONS:
    for model_id in MODELS:
        try:
            bedrock = boto3.client('bedrock-runtime', region_name=region, config=config)
            response = bedrock.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": [{"text": PROMPT}]}],
                inferenceConfig={"maxTokens": 10, "temperature": 0.01}
            )
            text = response['output']['message']['content'][0]['text']
            print(f"  ✅ {region:12s} | {model_id:45s} | WORKS! Response: {text[:30]}")
        except Exception as e:
            err_msg = str(e)[:80]
            print(f"  ❌ {region:12s} | {model_id:45s} | {err_msg}")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
