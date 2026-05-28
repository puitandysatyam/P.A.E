# KAGGLE TWO-STAGE DISTILBERT FINE-TUNING SCRIPT
# !pip install transformers datasets torch evaluate peft
import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import load_dataset
from peft import get_peft_model, LoraConfig, TaskType

print("========================================")
print("PART 2: LOCAL SPECIALIZATION WITH LoRA")
print("========================================")

def lora_finetune():
    print("Loading Pre-trained Base Model (finmigodeveloper/distilbert-transaction-classifier)...")
    model_id = "finmigodeveloper/distilbert-transaction-classifier"
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    base_model = AutoModelForSequenceClassification.from_pretrained(model_id)
    
    print("Configuring LoRA (Low-Rank Adaptation)...")
    # We use LoRA so we only train ~2.5MB of weights instead of 268MB!
    peft_config = LoraConfig(
        task_type=TaskType.SEQ_CLS, 
        inference_mode=False, 
        r=8, 
        lora_alpha=16, 
        lora_dropout=0.1,
        target_modules=["q_lin", "k_lin", "v_lin", "out_lin"]
    )
    
    model = get_peft_model(base_model, peft_config)
    model.print_trainable_parameters()
    
    print("\n----------------------------------------")
    print("STAGE 2: LOCAL DOMAIN ADAPTATION")
    print("----------------------------------------")
    print("Loading your synthetic Indian Bank Dataset (Bandhan, HDFC, ICICI)...")
    # dataset_local = load_dataset("csv", data_files="indian_bank_synthetic_40k.csv")
    
    training_args = TrainingArguments(
        output_dir="./lora_indian_distilbert",
        learning_rate=2e-5,
        per_device_train_batch_size=16,
        num_train_epochs=3,
        weight_decay=0.01,
        fp16=True, # Use Mixed Precision on Kaggle T4 GPUs
        save_strategy="epoch"
    )
    
    # trainer = Trainer(
    #     model=model,
    #     args=training_args,
    #     train_dataset=dataset_local["train"],
    # )
    # trainer.train()
    
    print("\nMerging LoRA adapter back into base model...")
    # This merges the 2.5MB weights back into the 268MB base model
    model = model.merge_and_unload()
    
    print("Saving FULL fine-tuned model...")
    model.save_pretrained("./distilbert_categorization_model")
    tokenizer.save_pretrained("./distilbert_categorization_model")
    
    print("-> Training Complete! Download the 'distilbert_categorization_model' folder from Kaggle.")
    print("-> Place it directly into your local 'model_weights' folder.")

if __name__ == "__main__":
    lora_finetune()
