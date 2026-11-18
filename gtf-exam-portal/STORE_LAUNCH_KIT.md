# 📱 Gateway To Future (GTF) - Mobile App Store Packaging & D-U-N-S Submission Kit

> **Enterprise App ID:** `com.gatewaytofuture.app`  
> **App Name:** Gateway To Future  
> **Corporate Entity:** The Gateway to Future (GSTIN: `05AAOPR7336L3Z0` | PAN: `AAOPR7336L`)  
> **Corporate Slogan:** *Creating Career Without Borders*  
> **Production URLs:** Web App: [app.gatewaytofuture.com](https://app.gatewaytofuture.com) | Corporate: [www.gatewaytofuture.com](https://www.gatewaytofuture.com)

---

## 📑 Table of Contents
1. [App Registry & Architecture](#1-app-registry--architecture)
2. [Apple D-U-N-S Number Registration Dossier (Indian Entity)](#2-apple-d-u-n-s-number-registration-dossier-indian-entity)
3. [D&B / Apple Verification Email Reply Template](#3-db--apple-verification-email-reply-template)
4. [App Store & Google Play Store Metadata Kit](#4-app-store--google-play-store-metadata-kit)
5. [App Store Reviewer Demo Credentials](#5-app-store-reviewer-demo-credentials)
6. [1-Click Android Release Packaging (`.aab` for Google Play)](#6-1-click-android-release-packaging-aab-for-google-play)
7. [1-Click iOS Release Packaging (`.ipa` for Apple App Store)](#7-1-click-ios-release-packaging-ipa-for-apple-app-store)

---

## 1. App Registry & Architecture

| Parameter | Value |
| :--- | :--- |
| **Package / Bundle ID** | `com.gatewaytofuture.app` |
| **App Title** | Gateway To Future |
| **Short Brand Name** | GTF |
| **Engine Framework** | Capacitor 8 Native Container + Next.js App Router |
| **Production Target URL** | `https://app.gatewaytofuture.com` |
| **Allowed Navigation Rules** | `app.gatewaytofuture.com`, `*.gatewaytofuture.com`, `gatewaytofuture.com`, `*.firebaseapp.com`, `*.googleapis.com`, `accounts.google.com` |
| **Required Permissions (Android)** | `INTERNET`, `ACCESS_NETWORK_STATE`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `WAKE_LOCK`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` |
| **Required Permissions (iOS)** | `NSMicrophoneUsageDescription` (AI German Sprechen practice), `UIBackgroundModes` (`audio`) |
| **Offline Fallback Handling** | Configured via `server.errorPath: "index.html"` loading bundled native offline recovery page from `webDir: "out"` with auto-reconnect |
| **Primary Category** | Education / Language Learning |
| **Secondary Category** | Productivity / International Careers |

---

## 2. Apple D-U-N-S Number Registration Dossier (Indian Entity)

Apple requires an active **D-U-N-S Number** (Dun & Bradstreet 9-digit unique identifier) to enroll as an **Organization / Enterprise** in the Apple Developer Program.

### Quick Links:
- **Apple Developer D-U-N-S Lookup:** [developer.apple.com/enroll/duns-lookup/](https://developer.apple.com/enroll/duns-lookup/)
- **D&B Direct Portal:** [dnb.com/duns-number/get-a-duns.html](https://www.dnb.com/duns-number/get-a-duns.html)

### Field-by-Field Copy-Paste Form Values:

```text
Legal Entity Name:
The Gateway to Future

Tradestyle / DBA (Doing Business As):
Gateway To Future

Business Structure:
Proprietorship / Enterprise Firm (GST Registered)

GSTIN (Goods and Services Tax ID):
05AAOPR7336L3Z0

Permanent Account Number (PAN):
AAOPR7336L

State Code:
05 (Uttarakhand)

Registered Physical Address:
Line 1: Mahant Building
Line 2: Main Market Road
City: Laksar
District: Haridwar
State / Province: Uttarakhand
PIN / Postal Code: 247663
Country: India

European / Operational Headquarters:
Schönefelder Straße 2, GStU, 12355 Berlin, Germany

Official Website:
https://www.gatewaytofuture.com

Web App / Digital Academy:
https://app.gatewaytofuture.com

Corporate Banking Details (For Proof of Business):
Bank Name: State Bank of India (SBI)
Account Name: THE GATEWAY TO FUTURE
Account Number: 45246385485
IFSC Code: SBIN0002405
Branch: Laksar (Haridwar)

Authorized Signatory / Primary Contact:
Full Name: Sarbjit Kour
Title: Founder & CEO, Gateway To Future
Direct Phone: +49 176 60720947
Primary Email: info@gatewaytofuture.com
Secondary Email: Skour8786@gmail.com
```

---

## 3. D&B / Apple Verification Email Reply Template

When Dun & Bradstreet or Apple sends an automated verification email requesting proof of organization status for **The Gateway to Future**, reply with this exact text and attach your GST Certificate and PAN Card:

```text
To: applecs@dnb.com / devprograms@apple.com
Subject: Verification Documents for D-U-N-S Request / Apple Developer Enrollment - The Gateway to Future

Dear Dun & Bradstreet / Apple Developer Support Team,

Thank you for your assistance. Please find below the verified corporate details and attached legal documentation for our organization:

1. Legal Entity Name: The Gateway to Future
2. Business Structure: Registered Firm / Educational & Career Pathway Services
3. Indian GSTIN: 05AAOPR7336L3Z0 (State: Uttarakhand - Code 05)
4. Indian PAN: AAOPR7336L
5. Registered Address: Mahant Building, Main Market Road, Laksar, Haridwar, Uttarakhand - 247663, India
6. European Operations HQ: Schönefelder Straße 2, GStU, 12355 Berlin, Germany
7. Official Website: https://www.gatewaytofuture.com
8. Web Application: https://app.gatewaytofuture.com
9. Authorized Representative:
   - Name: Sarbjit Kour
   - Title: Founder & CEO, Gateway To Future
   - Email: info@gatewaytofuture.com (or Skour8786@gmail.com)
   - Phone: +49 176 60720947

Attached Documents:
- GST Registration Certificate (Form GST REG-06) showing GSTIN 05AAOPR7336L3Z0
- Corporate PAN Card (AAOPR7336L)
- Bank Account Statement / Letterhead (State Bank of India - Account Name: THE GATEWAY TO FUTURE)

I confirm that I have the legal authority to bind The Gateway to Future to Apple Developer Program agreements and D-U-N-S records.

Kindly process our D-U-N-S assignment / Apple Developer account verification at your earliest convenience.

Sincerely,

Sarbjit Kour
Founder & CEO, Gateway To Future
The Gateway to Future
info@gatewaytofuture.com
+49 176 60720947
www.gatewaytofuture.com
```

---

## 4. App Store & Google Play Store Metadata Kit

### A. App Identity & Titles
- **App Name (max 30 chars):** `Gateway To Future`
- **Apple App Store Subtitle (max 30 chars):** `German A1-B2 & Study Abroad`
- **Google Play Short Description (max 80 chars):**  
  `German language mastery (A1–B2), Goethe/telc prep & career pathways to Germany.`

### B. Keywords (Apple App Store - max 100 chars comma-separated):
```text
German,Deutsch,Goethe,telc,TestDaF,A1,A2,B1,B2,Studienkolleg,Pflege,Anerkennung,Germany,Berlin,Ausbildung
```

### C. Promotional Text (Apple App Store - max 170 chars):
```text
Master German from A1 to B2 with Goethe & telc exam simulations, interactive flashcards, AI speaking labs, and direct guidance for your career in Germany.
```

### D. Full Description (Google Play & Apple App Store - max 4000 chars):

```text
Welcome to Gateway To Future (GTF) — the premier German language learning and career pathway platform engineered to take you from beginner (A1) to fluent (B2) and guide your relocation to Germany.

Whether your goal is studying at a German tuition-free public university, attending Studienkolleg, securing a paid nursing Ausbildung (€1,000–€1,400/month), or achieving medical Anerkennung (Approbation & FSP) as a doctor or nurse, Gateway To Future is your end-to-end partner.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CORE FEATURES & LEARNING CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. STRUCTURED CEFR CURRICULUM (A1, A2, B1, B2)
• 40+ Structured Digital Labs: Dedicated modules for Hören (Listening), Lesen (Reading), Schreiben (Writing), and Sprechen (Speaking).
• Clear German Grammar Guides: High-yield grammar explanations with contextual examples, sentence structures, and case declensions (Nominativ, Akkusativ, Dativ, Genitiv).
• Comprehensive Vocabulary: High-frequency words categorized by CEFR difficulty with native pronunciation audio.

2. QUIZLET-STYLE INTERACTIVE FLASHCARDS
• Spaced-Repetition System: Flip, shuffle, and master essential German vocabulary.
• Instant Audio Pronunciation: Native German audio playback for every card.
• Progress Tracking: Categorize words into "Learning" and "Mastered" to optimize study sessions.

3. GOETHE-INSTITUT & TELC EXAM SIMULATOR
• Realistic exam timers and authentic question formats for Goethe-Zertifikat and telc exams.
• Multi-section testing with instant feedback and score reporting.
• AI-powered speaking and pronunciation evaluation to build real exam confidence.

4. SPECIALIZED CAREER & STUDY PATHWAYS
• Studienkolleg Prep: Entrance exam practice (T-Kurs, M-Kurs, W-Kurs).
• Healthcare & Pflegefachkraft: Specialized medical German terminology and Fachsprachenprüfung (FSP) preparation.
• Berlin Relocation & Mobility: Step-by-step guidance on APS certification, blocked accounts (Sperrkonto), visa filing, and Berlin city registration (Anmeldung).

5. DIRECT FOUNDER & CEO MENTORSHIP
• Guided directly by Sarbjit Kour (Founder & CEO, Gateway To Future) — Berlin relocation leadership and certified German language coaching.
• "Creating Career Without Borders" — personal mentorship ensuring you never navigate the German visa or admissions system alone.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY & COMPLIANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gateway To Future is fully GDPR-compliant and respects your privacy. Voice input is processed exclusively for interactive pronunciation evaluation.

• Privacy Policy: https://app.gatewaytofuture.com/privacy
• Terms of Service: https://app.gatewaytofuture.com/terms
• Support & Portal: https://www.gatewaytofuture.com

Start your journey to Germany today with Gateway To Future!
```

---

## 5. App Store Reviewer Demo Credentials

Google Play Console and Apple App Store Review require functional test account credentials to test authenticated features without SMS or OTP friction.

Provide this block in the **"App Review Information"** section:

```text
Username / Email:
student@gatewaytofuture.com

Password:
GTFDemo2026!

Demo Account Role:
Verified Candidate / Full Academy Access

Reviewer Notes:
Gateway To Future provides structured German language training (A1–B2) and Goethe/telc exam preparation.
Please use the demo credentials above to sign in. The demo user has full access to:
- A1, A2, B1, and B2 Interactive Labs
- Quizlet-style flashcard workspaces
- Goethe/telc practice exam simulations
- Listening audio playback and AI speaking evaluation

Microphone permission is requested solely when the user clicks the microphone button inside speaking (Sprechen) practice exercises to evaluate German pronunciation. No background recording is performed.
```

---

## 6. 1-Click Android Release Packaging (`.aab` for Google Play)

### Step 1: Generate Release Keystore (One-Time Setup)
Run this command in terminal from your secure key directory:

```bash
keytool -genkey -v -keystore gtf-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias gtf-key -dname "CN=The Gateway to Future, OU=Mobile, O=The Gateway to Future, L=Laksar, ST=Uttarakhand, C=IN"
```

### Step 2: Configure Keystore in `android/keystore.properties`
Create `gtf-exam-portal/android/keystore.properties` (added to `.gitignore`):

```properties
storeFile=../gtf-release-key.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=gtf-key
keyPassword=YOUR_KEY_PASSWORD
```

### Step 3: Build Signed Release App Bundle (`.aab`)

**Option 1: From Project Root (1-Click npm command)**
```bash
npm run build:aab
```

**Option 2: Direct Gradle Terminal Command**
From `gtf-exam-portal`:

```bash
# 1. Sync web assets & Capacitor config
npx cap sync android

# 2. Compile signed Android App Bundle (.aab)
cd android

# On Windows (PowerShell / CMD):
.\gradlew.bat bundleRelease

# On macOS / Linux:
./gradlew bundleRelease
```

**Option 3: Via Android Studio IDE**
```bash
npx cap open android
```
In Android Studio:
1. Go to **Build > Generate Signed Bundle / APK...**
2. Choose **Android App Bundle**.
3. Select your keystore `gtf-release-key.jks`, enter credentials, and select **release**.
4. Click **Create**.

The compiled release bundle will be generated at:
```text
gtf-exam-portal/android/app/build/outputs/bundle/release/app-release.aab
```

Upload this `.aab` file directly to **Google Play Console** under **Testing > Internal testing** or **Production > Releases**.

---

## 7. 1-Click iOS Release Packaging (`.ipa` for Apple App Store)

### Step 1: Sync Capacitor iOS Project
Run from `gtf-exam-portal`:

```bash
npx cap sync ios
```

### Step 2: Open in Xcode or Build via Command Line

**Option A: Open Xcode IDE (Recommended for First Distribution)**
```bash
npx cap open ios
```
In Xcode:
1. Select target **App** > **Signing & Capabilities**.
2. Select your Apple Developer Team (**The Gateway to Future**).
3. Set Bundle Identifier to `com.gatewaytofuture.app`.
4. Select build target: **Any iOS Device (arm64)**.
5. Menu: **Product > Archive**.
6. When the Organizer window opens, click **Distribute App** > **App Store Connect** > **Upload**.

**Option B: Headless Terminal Build via `xcodebuild`**
Ensure `ExportOptions.plist` is present (already configured in `ios/App/ExportOptions.plist`):

```bash
# 1. Archive the iOS App
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -sdk iphoneos \
  -configuration Release \
  -archivePath build/App.xcarchive \
  clean archive

# 2. Export Signed IPA using ExportOptions.plist
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist ios/App/ExportOptions.plist \
  -exportPath build/ipa

# 3. Upload directly to App Store Connect via xcrun altool or transporter
xcrun altool --upload-app -f build/ipa/App.ipa -t ios -u "info@gatewaytofuture.com" -p "YOUR_APP_SPECIFIC_PASSWORD"
```

#### Reference: `ExportOptions.plist` Template
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>destination</key>
	<string>export</string>
	<key>method</key>
	<string>app-store</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>teamID</key>
	<string>YOUR_APPLE_TEAM_ID</string>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
```

---

## 8. Store Submission Compliance Checklist

- [x] **App ID Unified:** `com.gatewaytofuture.app` across Capacitor, Android (`build.gradle`), and iOS (`project.pbxproj`).
- [x] **Safe Containment:** `allowNavigation` array covers `app.gatewaytofuture.com`, `*.gatewaytofuture.com`, `accounts.google.com`, `*.googleapis.com`, and `*.firebaseapp.com`.
- [x] **Microphone Usage:** Purpose description clearly documented in `Info.plist` and `AndroidManifest.xml` for speaking evaluation.
- [x] **Privacy Policy URL Live:** Hosted at [https://app.gatewaytofuture.com/privacy](https://app.gatewaytofuture.com/privacy).
- [x] **Terms of Service URL Live:** Hosted at [https://app.gatewaytofuture.com/terms](https://app.gatewaytofuture.com/terms).
- [x] **Account Deletion Protocol:** In-app and email instructions fully compliant with Apple App Store Guideline 5.1.1(v).
- [x] **Reviewer Demo Account:** Documented with pre-seeded login credentials.
