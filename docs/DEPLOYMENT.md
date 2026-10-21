# BCAM Deployment & Operations Guide

## 1. Environment Configuration
Create `.env.local` based on `.env.example`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=basechan-am.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=basechan-am
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=basechan-am.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 2. Deployment Order
1. **Deploy Firestore Rules & Indexes:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
2. **Build Production Application:**
   ```bash
   npm run build
   ```
3. **Deploy Hosting Bundle:**
   ```bash
   firebase deploy --only hosting
   ```

## 3. Post-Deployment Verification
1. Log in as a corporate admin user (`*@basechaninternational.com`).
2. Run `migrateCredentialSecrets` from the Ingestion Tab to migrate any legacy plaintext credential secrets into `credential_secrets`.
3. Verify staff users can view assigned assets and submit weekly reports without permission errors.
