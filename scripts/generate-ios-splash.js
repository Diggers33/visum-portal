#!/usr/bin/env node

/**
 * iOS Splash Screen Generator Script
 * Generates iOS splash screens with the brand color background
 *
 * Requirements: Install sharp library
 * Run: npm install sharp --save-dev
 * Usage: node scripts/generate-ios-splash.js
 */

const fs = require('fs');
const path = require('path');

// Brand color from Capacitor config
const BRAND_COLOR = '#00a8b5'; // Cyan from capacitor.config.ts

// iOS splash screen sizes (for modern iOS using storyboard images)
const splashSizes = [
  { name: 'splash-2732x2732.png', width: 2732, height: 2732 },     // 3x
  { name: 'splash-2732x2732-1.png', width: 2732, height: 2732 },   // 2x
  { name: 'splash-2732x2732-2.png', width: 2732, height: 2732 },   // 1x
];

async function generateSplashScreens() {
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

    const logoPath = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
    const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');

    console.log('\n🎨 Generating iOS splash screens...\n');
    console.log(`Brand color: ${BRAND_COLOR}`);
    console.log(`Output directory: ${outputDir}\n`);

    // Check if logo exists
    const hasLogo = fs.existsSync(logoPath);
    if (!hasLogo) {
      console.warn('⚠️  Logo not found, generating splash with solid color only.');
    }

    let successCount = 0;
    for (const splash of splashSizes) {
      const outputPath = path.join(outputDir, splash.name);

      try {
        // Create a solid color background
        const background = await sharp({
          create: {
            width: splash.width,
            height: splash.height,
            channels: 4,
            background: BRAND_COLOR
          }
        }).png();

        // If logo exists, composite it in the center
        if (hasLogo) {
          // Calculate logo size (about 20% of the screen width)
          const logoSize = Math.floor(splash.width * 0.2);
          const logoBuffer = await sharp(logoPath)
            .resize(logoSize, logoSize, {
              kernel: sharp.kernel.lanczos3,
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();

          // Composite logo onto background
          await background
            .composite([{
              input: logoBuffer,
              gravity: 'center'
            }])
            .toFile(outputPath);
        } else {
          // Just save the solid color
          await background.toFile(outputPath);
        }

        console.log(`✅ ${splash.name.padEnd(30)} (${splash.width}x${splash.height})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to generate ${splash.name}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Successfully generated ${successCount}/${splashSizes.length} splash screens!\n`);

  } catch (error) {
    console.error('\n❌ Error generating splash screens:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateSplashScreens();
