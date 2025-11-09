# iOS Quick Start Guide

Quick reference for building IRIS Portal for iOS.

## Prerequisites

- macOS with Xcode installed
- Node.js v18+
- CocoaPods: `sudo gem install cocoapods`
- Sharp library: `npm install sharp --save-dev`

## Quick Build Steps

### 1. Generate iOS Assets

```bash
# Generate all app icons
npm run ios:icons

# Generate splash screens
npm run ios:splash

# Or generate both at once
npm run ios:assets
```

### 2. Build and Sync

```bash
# Build web assets and sync to iOS
npm run ios:sync
```

### 3. Open in Xcode

```bash
# Open iOS project in Xcode
npm run ios:open
```

### 4. Configure Signing

In Xcode:
1. Select **App** target
2. Go to **Signing & Capabilities**
3. Select your **Team**

### 5. Build and Run

- Press **Cmd + R**
- Or click the Play button

## Available Scripts

```bash
npm run ios:icons     # Generate app icons
npm run ios:splash    # Generate splash screens
npm run ios:assets    # Generate all assets
npm run ios:sync      # Build web + sync to iOS
npm run ios:open      # Open Xcode project
npm run ios:run       # Build and run on device/simulator
```

## App Configuration

### Current Settings

- **App ID**: com.iris.distributor
- **App Name**: IRIS Portal
- **Min iOS**: 13.0
- **Brand Color**: #00a8b5

### Key Files

```
ios/App/App/Info.plist                      # iOS app configuration
ios/App/App/Assets.xcassets/AppIcon.appiconset/   # App icons
ios/App/App/Assets.xcassets/Splash.imageset/      # Splash screens
capacitor.config.ts                          # Capacitor config
```

## Development Workflow

### Local Development with Hot Reload

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://YOUR-LOCAL-IP:5173',
     cleartext: true
   }
   ```

3. Sync and run:
   ```bash
   npx cap sync ios
   npm run ios:run
   ```

### Production Build

```bash
npm run build
npx cap sync ios
npm run ios:open
```

Then in Xcode: **Product > Archive**

## Common Issues

### Icons not showing?
```bash
npm run ios:icons
npx cap sync ios
# Clean build in Xcode: Cmd + Shift + K
```

### Pod install fails?
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

### White screen on launch?
```bash
npm run build
npx cap sync ios
```

## Testing

### Simulator
```bash
npm run ios:run
```

### Physical Device
1. Connect iPhone/iPad
2. Trust computer on device
3. Select device in Xcode
4. Press Cmd + R

## Next Steps

- See [iOS-BUILD-SETUP.md](./iOS-BUILD-SETUP.md) for detailed configuration
- Configure push notifications
- Set up OAuth redirect URLs
- Test on physical devices
- Prepare for App Store submission

## Resources

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)

---

Need help? Check the full guide: [iOS-BUILD-SETUP.md](./iOS-BUILD-SETUP.md)
