#!/usr/bin/env node

/**
 * iOS Icon Generator Script
 * Generates all required iOS app icon sizes from a source 1024x1024 image
 *
 * Requirements: Install sharp library
 * Run: npm install sharp --save-dev
 * Usage: node scripts/generate-ios-icons.js
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for iOS
const iconSizes = [
  // iPhone
  { name: 'icon-20.png', size: 40 },           // 20pt @2x
  { name: 'icon-20@3x.png', size: 60 },        // 20pt @3x
  { name: 'icon-29.png', size: 58 },           // 29pt @2x
  { name: 'icon-29@3x.png', size: 87 },        // 29pt @3x
  { name: 'icon-40.png', size: 80 },           // 40pt @2x
  { name: 'icon-40@3x.png', size: 120 },       // 40pt @3x
  { name: 'icon-60@2x.png', size: 120 },       // 60pt @2x
  { name: 'icon-60@3x.png', size: 180 },       // 60pt @3x

  // iPad
  { name: 'icon-20-ipad.png', size: 20 },      // 20pt @1x
  { name: 'icon-20@2x-ipad.png', size: 40 },   // 20pt @2x
  { name: 'icon-29-ipad.png', size: 29 },      // 29pt @1x
  { name: 'icon-29@2x-ipad.png', size: 58 },   // 29pt @2x
  { name: 'icon-40-ipad.png', size: 40 },      // 40pt @1x
  { name: 'icon-40@2x-ipad.png', size: 80 },   // 40pt @2x
  { name: 'icon-76.png', size: 76 },           // 76pt @1x
  { name: 'icon-76@2x.png', size: 152 },       // 76pt @2x
  { name: 'icon-83.5@2x.png', size: 167 },     // 83.5pt @2x

  // App Store
  { name: 'icon-1024.png', size: 1024 }        // App Store
];

async function generateIcons() {
  try {
    // Try to import sharp
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.error('\n❌ Error: sharp library not found.');
      console.error('Please install it by running: npm install sharp --save-dev\n');
      process.exit(1);
    }

    const sourceIconPath = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
    const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

    // Check if source file exists
    if (!fs.existsSync(sourceIconPath)) {
      console.error(`\n❌ Source icon not found at: ${sourceIconPath}`);
      console.error('Please ensure you have a 1024x1024 PNG source icon.\n');
      process.exit(1);
    }

    console.log('\n📱 Generating iOS app icons...\n');
    console.log(`Source: ${path.basename(sourceIconPath)}`);
    console.log(`Output directory: ${outputDir}\n`);

    // Verify source image is 1024x1024
    const metadata = await sharp(sourceIconPath).metadata();
    if (metadata.width !== 1024 || metadata.height !== 1024) {
      console.warn(`⚠️  Warning: Source image is ${metadata.width}x${metadata.height}, expected 1024x1024`);
    }

    // Generate each icon size
    let successCount = 0;
    for (const icon of iconSizes) {
      const outputPath = path.join(outputDir, icon.name);

      try {
        await sharp(sourceIconPath)
          .resize(icon.size, icon.size, {
            kernel: sharp.kernel.lanczos3,
            fit: 'cover'
          })
          .png({ quality: 100, compressionLevel: 9 })
          .toFile(outputPath);

        console.log(`✅ ${icon.name.padEnd(25)} (${icon.size}x${icon.size})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to generate ${icon.name}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Successfully generated ${successCount}/${iconSizes.length} icons!\n`);

  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateIcons();
