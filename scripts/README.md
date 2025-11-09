# Asset Generation Scripts

Automated scripts for generating iOS and Android app assets.

## Prerequisites

Install the Sharp image processing library:

```bash
npm install sharp --save-dev
```

## Scripts

### generate-ios-icons.js

Generates all required iOS app icon sizes from a source 1024x1024 image.

**Usage:**
```bash
node scripts/generate-ios-icons.js
# Or use the npm script:
npm run ios:icons
```

**Source Image:**
- Location: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- Format: PNG
- Size: 1024x1024 pixels
- Requirements: No transparency, opaque background

**Output:**
- Generates 18 icon sizes
- Saves to: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Generated Sizes:**
- iPhone: 40, 60, 87, 58, 80, 120, 180 pixels
- iPad: 20, 29, 40, 58, 76, 80, 152, 167 pixels
- App Store: 1024 pixels

---

### generate-ios-splash.js

Generates iOS splash screens with branded background color and centered logo.

**Usage:**
```bash
node scripts/generate-ios-splash.js
# Or use the npm script:
npm run ios:splash
```

**Configuration:**
- Brand Color: `#00a8b5` (defined in script)
- Logo: Uses app icon as logo source
- Logo Size: 20% of screen width

**Output:**
- Generates 3 splash screen variants
- Size: 2732x2732 pixels each
- Saves to: `ios/App/App/Assets.xcassets/Splash.imageset/`

**Variants:**
- `splash-2732x2732.png` - @3x
- `splash-2732x2732-1.png` - @2x
- `splash-2732x2732-2.png` - @1x

---

## NPM Scripts

Convenient npm scripts are available in `package.json`:

```bash
# Generate iOS icons only
npm run ios:icons

# Generate iOS splash screens only
npm run ios:splash

# Generate all iOS assets (icons + splash)
npm run ios:assets

# Build web assets and sync to iOS
npm run ios:sync

# Open iOS project in Xcode
npm run ios:open

# Run on iOS device/simulator
npm run ios:run
```

## Customization

### Changing Brand Color

Edit `scripts/generate-ios-splash.js`:

```javascript
const BRAND_COLOR = '#00a8b5'; // Change to your color
```

### Using Different Source Image

Update the source path in the scripts:

```javascript
const sourceIconPath = path.join(__dirname, '../path/to/your/icon.png');
```

### Adding More Sizes

Add to the `iconSizes` or `splashSizes` array:

```javascript
const iconSizes = [
  { name: 'custom-icon.png', size: 512 },
  // ... existing sizes
];
```

## Workflow

### Initial Setup

1. Place your 1024x1024 app icon at:
   ```
   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
   ```

2. Generate all assets:
   ```bash
   npm run ios:assets
   ```

3. Sync to iOS project:
   ```bash
   npm run ios:sync
   ```

### Updating Icons

When you update your app icon:

```bash
# Replace the source icon
# Then regenerate
npm run ios:icons
npx cap sync ios
```

### Updating Splash Screens

When you change brand color or logo:

```bash
# Update BRAND_COLOR in script if needed
npm run ios:splash
npx cap sync ios
```

## Troubleshooting

### Sharp not installed

```
Error: Cannot find module 'sharp'
```

**Solution:**
```bash
npm install sharp --save-dev
```

### Source icon not found

```
Source icon not found at: [path]
```

**Solution:**
- Verify the source icon exists
- Check the path in the script
- Ensure it's named correctly

### Permission denied

```
EACCES: permission denied
```

**Solution:**
```bash
chmod +x scripts/generate-ios-icons.js
chmod +x scripts/generate-ios-splash.js
```

### Invalid image size

```
Warning: Source image is XXXxYYY, expected 1024x1024
```

**Solution:**
- Use a proper 1024x1024 source image
- Resize your icon to 1024x1024 before running the script

## Image Requirements

### App Icons

- ✅ Format: PNG
- ✅ Size: 1024x1024 pixels
- ✅ Color Space: sRGB or Display P3
- ✅ Background: Opaque (no alpha channel)
- ❌ No transparency
- ❌ No rounded corners (iOS adds automatically)

### Source Logo for Splash

- Format: PNG (transparency OK)
- Recommended size: 1024x1024
- Will be scaled to 20% of splash screen size
- Centered automatically

## Advanced Usage

### Generate specific sizes only

Edit the script to filter sizes:

```javascript
const iconSizes = [
  { name: 'icon-1024.png', size: 1024 },
  { name: 'icon-60@3x.png', size: 180 },
  // Comment out sizes you don't need
];
```

### Use different compression

Edit the Sharp options:

```javascript
.png({
  quality: 100,           // 0-100
  compressionLevel: 9,    // 0-9
  progressive: true
})
```

### Add watermark or overlay

Composite additional images:

```javascript
.composite([
  { input: logoBuffer, gravity: 'center' },
  { input: watermarkBuffer, gravity: 'southeast' }
])
```

## Best Practices

1. **Always use high-quality source images** (1024x1024 minimum)
2. **Keep source icons in version control** for reproducibility
3. **Run asset generation before each release** to ensure consistency
4. **Test on actual devices** to verify icon appearance
5. **Follow Apple's design guidelines** for app icons

## Resources

- [iOS App Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Capacitor iOS Setup](https://capacitorjs.com/docs/ios)

---

**Note:** These scripts are designed for iOS asset generation. For Android assets, see Android-specific documentation.
