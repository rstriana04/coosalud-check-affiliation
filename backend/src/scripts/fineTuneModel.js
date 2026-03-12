#!/usr/bin/env node

/**
 * Fine-tune model using Unsloth (Option A)
 * 
 * Usage:
 *   node src/scripts/fineTuneModel.js [options]
 * 
 * Options:
 *   --training-data <path>    Path to training data JSON file (default: ./training-data/training-data-*.json)
 *   --model-name <name>        Model name to use (default: unsloth/llama-3.1-8b-bnb-4bit)
 *   --output-dir <path>        Output directory for fine-tuned model (default: ./fine-tuned-model)
 *   --epochs <number>          Number of training epochs (default: 1)
 *   --batch-size <number>     Batch size (default: 2)
 *   --learning-rate <number>  Learning rate (default: 2e-4)
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const trainingDataPath = getArg('training-data', null);
const modelName = getArg('model-name', 'meta-llama/Llama-3.1-8B-Instruct');
const outputDir = getArg('output-dir', join(process.cwd(), 'fine-tuned-model'));
const epochs = parseInt(getArg('epochs', '1'));
const batchSize = parseInt(getArg('batch-size', '2'));
const learningRate = parseFloat(getArg('learning-rate', '2e-4'));

async function findTrainingDataFile() {
  if (trainingDataPath) {
    return trainingDataPath;
  }

  const trainingDataDir = join(process.cwd(), 'training-data');
  const files = await readdir(trainingDataDir);
  const trainingFiles = files
    .filter(file => file.startsWith('training-data-') && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (trainingFiles.length === 0) {
    throw new Error('No training data file found. Please specify --training-data path.');
  }

  return join(trainingDataDir, trainingFiles[0]);
}

async function loadTrainingData(filePath) {
  console.log(`📂 Loading training data from: ${filePath}`);
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  console.log(`✅ Loaded ${data.length} training examples`);
  return data;
}

function convertToUnslothFormat(trainingData) {
  console.log('🔄 Converting training data to Unsloth format...');
  
  const formatted = trainingData.map((item, index) => {
    const instruction = item.instruction || '';
    const output = item.output || '';
    
    const text = `${instruction}\n\n${output}`;
    
    return { text };
  });

  console.log(`✅ Converted ${formatted.length} examples`);
  return formatted;
}

function generateUnslothScript(config) {
  return `from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import Dataset
from trl import SFTTrainer
import json
import torch

# Check device
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
print(f"🖥️  Using device: {device}")

# Load model
print("📥 Loading model: ${config.modelName}...")
tokenizer = AutoTokenizer.from_pretrained("${config.modelName}")
tokenizer.pad_token = tokenizer.eos_token

# Configure quantization (4-bit for memory efficiency)
if device == "cuda":
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16
    )
    model = AutoModelForCausalLM.from_pretrained(
        "${config.modelName}",
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
else:
    # For CPU/MPS (macOS), use full precision but smaller model
    print("⚠️  Running on CPU/MPS - using full precision (slower but works)")
    model = AutoModelForCausalLM.from_pretrained(
        "${config.modelName}",
        torch_dtype=torch.float32,
        device_map="auto",
        trust_remote_code=True
    )

# Prepare model for training
if device == "cuda":
    model = prepare_model_for_kbit_training(model)

# Add LoRA adapters
print("🔧 Adding LoRA adapters...")
lora_config = LoraConfig(
    r=16,
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# Load training data
print("📂 Loading training data...")
with open("${config.trainingDataPath}", "r", encoding="utf-8") as f:
    training_data = json.load(f)

# Convert to format
formatted_data = [{"text": item["instruction"] + "\\n\\n" + item["output"]} for item in training_data]

# Create dataset
dataset = Dataset.from_list(formatted_data)
print(f"✅ Loaded {len(dataset)} training examples")

# Training arguments
training_args = TrainingArguments(
    per_device_train_batch_size=${config.batchSize},
    gradient_accumulation_steps=4,
    warmup_steps=5,
    num_train_epochs=${config.epochs},
    learning_rate=${config.learningRate},
    fp16=(device == "cuda"),
    bf16=False,
    logging_steps=1,
    output_dir="${config.outputDir}",
    optim="adamw_torch",
    save_strategy="epoch",
    save_total_limit=1,
    report_to="none"
)

# Tokenize dataset
print("🔧 Tokenizing dataset...")
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=2048,
        padding=False,
        return_tensors=None
    )

tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    remove_columns=dataset.column_names
)

# Create trainer
print("🚀 Starting fine-tuning...")
trainer = SFTTrainer(
    model=model,
    train_dataset=tokenized_dataset,
    tokenizer=tokenizer,
    args=training_args
)

# Train
trainer.train()

# Save model
print(f"💾 Saving fine-tuned model to: ${config.outputDir}")
model.save_pretrained("${config.outputDir}")
tokenizer.save_pretrained("${config.outputDir}")

print("✅ Fine-tuning completed successfully!")
`;
}

async function createPythonScript(config) {
  const scriptPath = join(process.cwd(), 'fine_tune_unsloth.py');
  const scriptContent = generateUnslothScript(config);
  
  await writeFile(scriptPath, scriptContent, 'utf-8');
  console.log(`📝 Created Python script: ${scriptPath}`);
  
  return scriptPath;
}

async function main() {
  console.log('🎯 Fine-Tuning Script Generator (Unsloth)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Model: ${modelName}`);
  console.log(`Epochs: ${epochs}`);
  console.log(`Batch Size: ${batchSize}`);
  console.log(`Learning Rate: ${learningRate}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log('');

  try {
    const trainingDataFile = await findTrainingDataFile();
    const trainingData = await loadTrainingData(trainingDataFile);
    
    const config = {
      modelName: modelName,
      trainingDataPath: trainingDataFile,
      outputDir: outputDir,
      epochs: epochs,
      batchSize: batchSize,
      learningRate: learningRate
    };

    const scriptPath = await createPythonScript(config);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Fine-tuning script created successfully!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('');
    console.log('1. Dependencies already installed! ✅');
    console.log('   (transformers, peft, trl, datasets, bitsandbytes)');
    console.log('');
    console.log('2. Run the fine-tuning script:');
    console.log(`   python ${scriptPath}`);
    console.log('');
    console.log('3. After training, create Ollama model:');
    console.log('   ollama create medical-extractor -f Modelfile');
    console.log('');
    console.log('📝 Note:');
    console.log('   - Works on macOS (CPU/MPS), Linux/Windows (CUDA)');
    console.log('   - Training on CPU will be slower (2-4 hours)');
    console.log('   - For faster training, use Google Colab with GPU');
    console.log('   - At least 16GB RAM recommended');
    console.log('');
    console.log('💡 Tip: Use smaller model for macOS:');
    console.log('   npm run fine-tune -- --model-name microsoft/Phi-3-mini-4k-instruct');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

