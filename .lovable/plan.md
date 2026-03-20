

# Thirukkural App — Revised Plan

## Concept
A number keypad-based Thirukkural app. Users enter a kural number (1–1330) on a keypad, then listen to the corresponding kural song/audio. First 10 kurals are free; full access requires a subscription.

## Subscription Tiers
- **Free**: Kurals 1–10
- **1 Month**: ₹99
- **1 Year**: ₹999
- **Lifetime**: ₹3,499

## Pages & Components

### 1. Home / Keypad Screen
- Large numeric keypad (0–9, clear, enter)
- Display field showing entered number
- On submit: navigate to kural player view
- If kural > 10 and not subscribed → show paywall

### 2. Kural Player View
- Kural number and Tamil verse text
- Audio player (plays the linked music/song)
- Chapter and section info

### 3. Subscription / Paywall
- Triggered when free user tries kural 11+
- Shows 3 plans: Monthly ₹99, Yearly ₹999, Lifetime ₹3,499
- Stripe integration for payment

### 4. Auth (Email, Google, Phone OTP)
- Login/signup screens
- Required before subscribing

### 5. Profile
- Subscription status
- Account settings, logout

## Data
- User will provide JSON files containing all 1330 kurals (text, metadata, music links)
- Data loaded into Supabase or used as static JSON

## Tech Stack
- React + Tailwind (modern minimal design)
- Supabase for auth + user data
- Stripe for subscriptions (₹ INR pricing)
- Capacitor for iOS/Android builds

## Implementation Order
1. Upload and integrate kural JSON data
2. Build keypad UI and kural player with audio
3. Set up Supabase auth (email, Google, phone OTP)
4. Enable Stripe and create 3 subscription plans in INR
5. Add paywall logic (free for 1–10, paid for 11–1330)
6. User profile and subscription management
7. Capacitor setup for native builds

