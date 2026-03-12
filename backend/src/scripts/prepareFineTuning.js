#!/usr/bin/env node

/**
 * Script to prepare fine-tuning data from PDF medical records
 * 
 * Usage:
 *   node src/scripts/prepareFineTuning.js [options]
 * 
 * Options:
 *   --pdfs-dir <path>     Directory containing PDFs (default: ./pdfs)
 *   --output-dir <path>   Output directory (default: ./training-data)
 *   --format <format>     Format: openai, llama, mistral (default: openai)
 */

import { prepareFineTuningData } from '../utils/fineTuningPreparer.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const pdfsDir = getArg('pdfs-dir', join(__dirname, '../../pdfs'));
const outputDir = getArg('output-dir', join(__dirname, '../../training-data'));
const format = getArg('format', 'openai');

// Create output directory
mkdirSync(outputDir, { recursive: true });

console.log('📚 Preparing Fine-Tuning Data');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`PDFs Directory: ${pdfsDir}`);
console.log(`Output Directory: ${outputDir}`);
console.log(`Format: ${format}`);
console.log('');

try {
  const result = await prepareFineTuningData(pdfsDir, outputDir, {
    format,
    includeExamples: true
  });

  console.log('');
  console.log('✅ Fine-tuning data prepared successfully!');
  console.log(`   Examples: ${result.examples}`);
  console.log(`   Output: ${result.outputPath}`);
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Review the training data for accuracy');
  console.log('   2. Correct any mistakes manually');
  console.log('   3. Fine-tune your model (see LLM_OPTIONS.md)');
  console.log('');
} catch (error) {
  console.error('❌ Error preparing fine-tuning data:', error.message);
  process.exit(1);
}

