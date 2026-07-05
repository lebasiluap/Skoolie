# Skoolie App — Expo Setup

## 1. Install dependencies
```bash
cd SkoolieApp
npm install
```

## 2. Start the dev server
```bash
npx expo start
```

Then:
- Press `i` to open iOS Simulator (requires Xcode)
- Press `a` to open Android Emulator (requires Android Studio)
- Scan the QR code with **Expo Go** app on your phone to test immediately

## 3. Build for App Store / Play Store (when ready)
Install EAS CLI:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

Build:
```bash
# Android APK/AAB
eas build --platform android

# iOS IPA
eas build --platform ios
```

## Project Structure
```
app/
  (auth)/       ← Login, Signup, Forgot Password, Onboarding
  (app)/        ← Main tabs: Dashboard, Practice, Search, Progress, Profile
    practice/   ← MCQ, Flashcards, Cases (each has Topics → Quiz → Results flow)
  users/[id]    ← Public user profile (from leaderboard)

constants/Colors.ts   ← Theme system (light + dark mode)
lib/supabase.ts       ← Supabase client
hooks/useAuth.tsx     ← Auth context + profile
hooks/useTheme.ts     ← Color scheme hook
types/index.ts        ← Shared TypeScript types
components/           ← Button, Card, ProgressBar, Avatar, TabBar
```

## Notes
- Supabase project: bqhiwlpmrejvjdljxspy
- All content (questions, flashcards, cases) comes from Supabase — no migration needed
- Dark mode is automatic based on system preference
- Font: Nunito (loaded via @expo-google-fonts/nunito)
