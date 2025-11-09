# iOS Build Configuration Guide

Complete guide for configuring and building the IRIS Portal iOS application using Capacitor.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Configuration](#project-configuration)
- [App Icons Setup](#app-icons-setup)
- [Splash Screens Setup](#splash-screens-setup)
- [Building for iOS](#building-for-ios)
- [Testing](#testing)
- [App Store Submission](#app-store-submission)

---

## Prerequisites

### Required Software

1. **macOS** - iOS development requires macOS
2. **Xcode** - Latest version from App Store
3. **Node.js** - v18 or higher
4. **Capacitor CLI** - Installed via npm
5. **CocoaPods** - iOS dependency manager

### Install CocoaPods

```bash
sudo gem install cocoapods
```

### Install Sharp (for icon generation)

```bash
npm install sharp --save-dev
```

---

## Project Configuration

### App Information

- **App ID**: `com.iris.distributor`
- **App Name**: IRIS Portal
- **Display Name**: IRIS Portal
- **Bundle Version**: 1.0.0
- **Minimum iOS Version**: 13.0

### Configuration Files

#### 1. Info.plist Location
```
ios/App/App/Info.plist
```

Key configurations:
- ✅ App display name
- ✅ Bundle identifier
- ✅ URL schemes for OAuth
- ✅ Privacy permissions (Camera, Photo Library, Microphone)
- ✅ Background modes (Remote notifications)
- ✅ Status bar configuration
- ✅ Interface orientations
- ✅ App Transport Security

#### 2. Capacitor Config
```
capacitor.config.ts
```

iOS-specific settings:
- Content inset: automatic (handles notch/safe areas)
- Minimum iOS version: 13.0
- Scroll enabled
- Inline media playback allowed

---

## App Icons Setup

### Required Icon Sizes

iOS requires app icons in the following sizes:

| Size | Scale | Device | Purpose |
|------|-------|--------|---------|
| 20x20 | @1x, @2x, @3x | iPhone, iPad | Notifications |
| 29x29 | @1x, @2x, @3x | iPhone, iPad | Settings |
| 40x40 | @1x, @2x, @3x | iPhone, iPad | Spotlight |
| 60x60 | @2x, @3x | iPhone | App Icon |
| 76x76 | @1x, @2x | iPad | App Icon |
| 83.5x83.5 | @2x | iPad Pro | App Icon |
| 1024x1024 | @1x | All | App Store |

### Source Icon Requirements

- **Format**: PNG (no transparency)
- **Size**: 1024x1024 pixels
- **Color Space**: sRGB or P3
- **Background**: Opaque (no alpha channel)

### Generate Icons Automatically

Run the icon generation script:

```bash
node scripts/generate-ios-icons.js
```

This will:
1. Read the source icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
2. Generate all 18 required icon sizes
3. Save them to the AppIcon.appiconset directory

### Manual Icon Setup

If you need to manually add icons:

1. Open Xcode
2. Navigate to: `App > App > Assets.xcassets > AppIcon`
3. Drag and drop icons into their respective slots
4. Ensure all slots are filled (no yellow warnings)

---

## Splash Screens Setup

### Splash Screen Configuration

**Brand Color**: `#00a8b5` (Cyan)

The splash screen appears for 2 seconds when the app launches.

### Configuration in capacitor.config.ts

```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#00a8b5',
  showSpinner: false,
  spinnerColor: '#ffffff',
}
```

### Generate Splash Screens

Run the splash screen generation script:

```bash
node scripts/generate-ios-splash.js
```

This will:
1. Create a solid color background using the brand color
2. Center the app logo (if available)
3. Generate 3 splash screen variants
4. Save to `ios/App/App/Assets.xcassets/Splash.imageset/`

### Splash Screen Sizes

- 2732x2732 pixels (Universal size for iOS)
- 3 variants for @1x, @2x, @3x scales

---

## Building for iOS

### Step 1: Build Web Assets

```bash
npm run build
```

This creates the production build in the `build/` directory.

### Step 2: Sync Capacitor

```bash
npx cap sync ios
```

This:
- Copies web assets to iOS project
- Updates native plugins
- Installs CocoaPods dependencies

### Step 3: Open in Xcode

```bash
npx cap open ios
```

This opens the iOS project in Xcode.

### Step 4: Configure Signing

In Xcode:

1. Select **App** target in the project navigator
2. Go to **Signing & Capabilities** tab
3. Select your **Team**
4. Xcode will automatically manage signing

### Step 5: Select Device/Simulator

Choose target device from the device dropdown:
- Physical device (for testing on real hardware)
- Simulator (for local testing)

### Step 6: Build and Run

Press **Cmd + R** or click the Play button to build and run.

---

## Development Workflow

### Hot Reload During Development

1. Start the development server:
```bash
npm run dev
```

2. Update `capacitor.config.ts` with your local IP:
```typescript
server: {
  url: 'http://192.168.1.XXX:5173', // Replace with your IP
  cleartext: true
}
```

3. Sync and rebuild:
```bash
npx cap sync ios
npx cap open ios
```

Now changes will reload automatically without rebuilding.

### Making Changes

After updating web code:
```bash
npm run build
npx cap sync ios
```

After updating native code or plugins:
```bash
npx cap sync ios
cd ios/App && pod install && cd ../..
```

---

## Testing

### Simulator Testing

```bash
npx cap run ios
```

Or select a simulator in Xcode and press **Cmd + R**.

### Device Testing

1. Connect iPhone/iPad via USB
2. Trust the computer on your device
3. Select device in Xcode
4. Press **Cmd + R**

Note: First time requires waiting for symbol files to process.

### TestFlight Testing

1. Archive the app: **Product > Archive**
2. Upload to App Store Connect
3. Wait for processing (~5-10 minutes)
4. Add internal/external testers
5. Distribute via TestFlight

---

## App Store Submission

### Pre-Submission Checklist

- [ ] All app icons generated and added
- [ ] Splash screens configured
- [ ] Info.plist properly configured
- [ ] App signing configured with Distribution certificate
- [ ] App version and build number set
- [ ] Privacy permission descriptions added
- [ ] App tested on physical device
- [ ] Screenshots prepared (all required sizes)
- [ ] App Store metadata prepared

### Build for Release

1. **Select Generic iOS Device**
   - In Xcode device dropdown, select "Any iOS Device (arm64)"

2. **Archive the Build**
   - Menu: **Product > Archive**
   - Wait for archive to complete

3. **Validate the Archive**
   - In Organizer, select the archive
   - Click **Validate App**
   - Fix any issues

4. **Upload to App Store Connect**
   - Click **Distribute App**
   - Select **App Store Connect**
   - Follow prompts to upload

5. **Submit for Review**
   - Go to App Store Connect
   - Select your app
   - Fill in metadata, screenshots, description
   - Submit for review

### Required Screenshots

You'll need screenshots for:
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1242 x 2688)
- iPad Pro 12.9" (2048 x 2732)

Tip: Use iPhone 14 Pro Max and iPad Pro 12.9" simulators to capture screenshots.

---

## Troubleshooting

### Pod Install Fails

```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

### Build Fails with Signing Error

1. Go to Xcode > Preferences > Accounts
2. Ensure Apple ID is signed in
3. Download manual profiles if needed
4. Select correct team in Signing & Capabilities

### App Doesn't Launch on Device

1. Open Settings on device
2. Go to General > VPN & Device Management
3. Trust your developer certificate

### Icons Not Showing

1. Clean build folder: **Product > Clean Build Folder**
2. Delete app from device/simulator
3. Rebuild and run

### White Screen on Launch

1. Check web assets built correctly (`npm run build`)
2. Verify `webDir: 'build'` in capacitor.config.ts
3. Run `npx cap sync ios`
4. Check console logs in Xcode for errors

---

## Version Management

### Update App Version

Update in two places:

**1. package.json**
```json
{
  "version": "1.0.0"
}
```

**2. Xcode Project Settings**
- Select App target
- General tab
- Version: 1.0.0
- Build: 1 (increment for each build)

### Versioning Strategy

- **Version** (CFBundleShortVersionString): User-facing version (1.0.0, 1.1.0, 2.0.0)
- **Build** (CFBundleVersion): Internal build number (1, 2, 3, ...)

Increment:
- **Build number** for every upload to App Store Connect
- **Version number** for public releases

---

## Useful Commands

```bash
# Build web assets
npm run build

# Sync web assets to iOS
npx cap sync ios

# Open project in Xcode
npx cap open ios

# Run on device/simulator
npx cap run ios

# Update Capacitor
npm install @capacitor/core @capacitor/ios
npx cap sync ios

# Update iOS plugins
cd ios/App && pod update && cd ../..

# View logs from device
npx cap run ios --target [device-id]
```

---

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [iOS App Icon Sizes](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)

---

## Support

For issues specific to:
- **Capacitor**: Check [Capacitor GitHub Issues](https://github.com/ionic-team/capacitor/issues)
- **iOS Build**: Check [Apple Developer Forums](https://developer.apple.com/forums/)
- **App Store**: Contact Apple Developer Support

---

**Last Updated**: November 2024
**iOS Target**: iOS 13.0+
**Xcode Version**: 15.0+
