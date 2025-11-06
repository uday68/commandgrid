import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer, Trainer, TrainingArguments
from datasets import Dataset, DatasetDict
from sklearn.model_selection import train_test_split
import json
import evaluate
import random
import numpy as np

# Configuration
class Config:
    model_name = "t5-base"  # Consider "google/flan-t5-base" for instruction-aware model
    max_input_length = 256
    max_output_length = 512
    num_train_epochs = 15
    batch_size = 8 if torch.cuda.is_available() else 4
    learning_rate = 2e-5
    weight_decay = 0.01
    warmup_ratio = 0.1
    gradient_accumulation_steps = 2
    num_beams = 5
    early_stopping = True
    prefix = "translate English to SQL: "

# Load device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Enhanced dataset loading and preprocessing
def load_and_prepare_data(file_path):
    with open(file_path) as f:
        data = json.load(f)
    
    # Data validation and cleaning
    valid_data = []
    for item in data:
        if all(key in item for key in ["nl", "sql"]) and len(item["nl"]) > 5 and len(item["sql"]) > 10:
            valid_data.append(item)
    
    # Add task prefix
    for item in valid_data:
        item["nl"] = Config.prefix + item["nl"]
    
    # Split dataset
    train_data, val_data = train_test_split(valid_data, test_size=0.1, random_state=42)
    
    return DatasetDict({
        "train": Dataset.from_dict({
            "nl_query": [item["nl"] for item in train_data],
            "sql_query": [item["sql"] for item in train_data]
        }),
        "validation": Dataset.from_dict({
            "nl_query": [item["nl"] for item in val_data],
            "sql_query": [item["sql"] for item in val_data]
        })
    })

# Initialize model and tokenizer
tokenizer = T5Tokenizer.from_pretrained(Config.model_name)
model = T5ForConditionalGeneration.from_pretrained(Config.model_name).to(device)

# Enhanced tokenization with error handling
def tokenize_function(examples):
    try:
        inputs = tokenizer(
            examples["nl_query"],
            max_length=Config.max_input_length,
            truncation=True,
            padding="max_length",
            return_tensors="pt"
        )
        
        with tokenizer.as_target_tokenizer():
            targets = tokenizer(
                examples["sql_query"],
                max_length=Config.max_output_length,
                truncation=True,
                padding="max_length",
                return_tensors="pt"
            )
            
        return {
            "input_ids": inputs["input_ids"].squeeze(),
            "attention_mask": inputs["attention_mask"].squeeze(),
            "labels": targets["input_ids"].squeeze()
        }
    except Exception as e:
        print(f"Error tokenizing example: {e}")
        return None

# Metrics calculation
def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.where(predictions != -100, predictions, tokenizer.pad_token_id)
    
    decoded_preds = tokenizer.batch_decode(predictions, skip_special_tokens=True)
    labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
    decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
    
    # Calculate multiple metrics
    bleu = evaluate.load("bleu")
    rouge = evaluate.load("rouge")
    exact_match = evaluate.load("exact_match")
    
    return {
        "bleu": bleu.compute(
            predictions=decoded_preds,
            references=[[ref] for ref in decoded_labels]
        )["bleu"],
        "rougeL": rouge.compute(
            predictions=decoded_preds,
            references=decoded_labels
        )["rougeL"],
        "exact_match": exact_match.compute(
            predictions=decoded_preds,
            references=decoded_labels
        )["exact_match"]
    }

# Training setup
# Training setup
training_args = TrainingArguments(
    output_dir="./sql-generator",
    num_train_epochs=Config.num_train_epochs,
    per_device_train_batch_size=Config.batch_size,
    per_device_eval_batch_size=Config.batch_size,
    warmup_ratio=Config.warmup_ratio,
    weight_decay=Config.weight_decay,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="exact_match",
    greater_is_better=True,
    logging_dir="./logs",
    logging_steps=100,
    fp16=torch.cuda.is_available(),
    gradient_accumulation_steps=Config.gradient_accumulation_steps,
    learning_rate=Config.learning_rate,
    save_total_limit=3,
    report_to="none",
    #predict_with_generate=True,  # Remove this line as it's causing the error
    #generation_max_length=Config.max_output_length,
    #generation_num_beams=Config.num_beams,
)
# Main execution
if __name__ == "__main__":
    # Load and prepare data
    datasets = load_and_prepare_data("/content/enhanced_dataset.json")
    
    # Tokenize datasets
    tokenized_datasets = datasets.map(
        tokenize_function,
        batched=True,
        remove_columns=["nl_query", "sql_query"],
        batch_size=Config.batch_size
    )
    
    # Initialize Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["validation"],
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
    )
    
    # Train model
    trainer.train()
    
    # Save final model
    model.save_pretrained("./sql-generator-final")
    tokenizer.save_pretrained("./sql-generator-final")
    
    # Example inference
    def generate_sql(query):
        inputs = tokenizer(
            Config.prefix + query,
            return_tensors="pt",
            max_length=Config.max_input_length,
            truncation=True,
            padding="max_length"
        ).to(device)
        
        outputs = model.generate(
            input_ids=inputs.input_ids,
            attention_mask=inputs.attention_mask,
            max_length=Config.max_output_length,
            num_beams=Config.num_beams,
            early_stopping=Config.early_stopping,
            temperature=0.7,
            top_p=0.9,
        )
        
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Test examples
    test_queries = [
        "Show projects with budget over $50000",
        "List all users created after 2023",
        "Find tasks assigned to John with high priority"
    ]
    
    for query in test_queries:
        print(f"Query: {query}")
        print(f"Generated SQL: {generate_sql(query)}\n")