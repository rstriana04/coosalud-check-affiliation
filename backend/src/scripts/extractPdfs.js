#!/usr/bin/env node

/**
 * Extract PDF files from nested directory structure
 * 
 * Usage:
 *   node src/scripts/extractPdfs.js [options]
 * 
 * Options:
 *   --source-dir <path>     Source directory (default: current directory)
 *   --output-dir <path>     Output directory (default: ./extracted-pdfs)
 *   --organize-by <type>    Organize by: 'flat', 'patient' (default: 'flat')
 *   --dry-run              Show what would be done without copying
 */

import { readdir, stat, copyFile, mkdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const hasFlag = (name) => args.includes(`--${name}`);

const sourceDir = getArg('source-dir', process.cwd());
const outputDir = getArg('output-dir', join(process.cwd(), 'extracted-pdfs'));
const organizeBy = getArg('organize-by', 'flat');
const dryRun = hasFlag('dry-run');

/**
 * Recursively find all PDF files in a directory
 */
async function findPDFs(dir, pdfs = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        await findPDFs(fullPath, pdfs);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.pdf') {
        pdfs.push({
          sourcePath: fullPath,
          fileName: entry.name,
          relativePath: fullPath.replace(sourceDir, '').replace(/^\//, '')
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return pdfs;
}

/**
 * Extract patient ID from PDF filename or directory structure
 */
function extractPatientId(pdf) {
  // Try to extract from filename (e.g., CC_2537331_...)
  const filenameMatch = pdf.fileName.match(/CC[_\s](\d+)/i);
  if (filenameMatch) {
    return filenameMatch[1];
  }

  // Try to extract from directory path (e.g., CC2537331/)
  const pathMatch = pdf.relativePath.match(/CC(\d+)/i);
  if (pathMatch) {
    return pathMatch[1];
  }

  return null;
}

/**
 * Copy PDFs to output directory
 */
async function copyPDFs(pdfs, outputDir, organizeBy) {
  let copied = 0;
  let skipped = 0;
  let errors = 0;

  // Create output directory
  if (!dryRun) {
    await mkdir(outputDir, { recursive: true });
  }

  for (const pdf of pdfs) {
    try {
      let destPath;

      if (organizeBy === 'patient') {
        // Organize by patient ID (extract from filename or path)
        const patientId = extractPatientId(pdf);
        if (patientId) {
          const patientDir = join(outputDir, `CC_${patientId}`);
          if (!dryRun) {
            await mkdir(patientDir, { recursive: true });
          }
          destPath = join(patientDir, pdf.fileName);
        } else {
          // Fallback to flat structure if patient ID not found
          destPath = join(outputDir, pdf.fileName);
        }
      } else {
        // Flat structure - all PDFs in one directory
        destPath = join(outputDir, pdf.fileName);

        // Handle duplicate filenames
        if (!dryRun) {
          let counter = 1;
          let finalDestPath = destPath;
          while (await fileExists(finalDestPath)) {
            const nameWithoutExt = basename(pdf.fileName, '.pdf');
            const ext = extname(pdf.fileName);
            finalDestPath = join(outputDir, `${nameWithoutExt}_${counter}${ext}`);
            counter++;
          }
          destPath = finalDestPath;
        }
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would copy: ${pdf.sourcePath} -> ${destPath}`);
      } else {
        await copyFile(pdf.sourcePath, destPath);
        console.log(`✓ Copied: ${basename(destPath)}`);
      }

      copied++;
    } catch (error) {
      console.error(`✗ Error copying ${pdf.fileName}:`, error.message);
      errors++;
    }
  }

  return { copied, skipped, errors };
}

/**
 * Check if file exists
 */
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📁 PDF Extractor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Source Directory: ${sourceDir}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Organize By: ${organizeBy}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'COPY'}`);
  console.log('');

  try {
    // Find all PDFs
    console.log('🔍 Searching for PDF files...');
    const pdfs = await findPDFs(sourceDir);

    if (pdfs.length === 0) {
      console.log('❌ No PDF files found in the source directory.');
      process.exit(1);
    }

    console.log(`✅ Found ${pdfs.length} PDF file(s)\n`);

    // Copy PDFs
    console.log('📋 Processing PDFs...');
    const result = await copyPDFs(pdfs, outputDir, organizeBy);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   Total found: ${pdfs.length}`);
    console.log(`   ${dryRun ? 'Would copy' : 'Copied'}: ${result.copied}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors}`);

    if (!dryRun && result.copied > 0) {
      console.log(`\n✅ PDFs extracted to: ${outputDir}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

