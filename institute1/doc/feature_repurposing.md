# Repurposing Unused Files for Future Features (PRD Roadmap)

बजाय इसके कि हम इन 19 फ़ाइलों को डिलीट कर दें, हम इन्हें आने वाले अहम फीचर्स (Important Features) के लिए इस्तेमाल (repurpose) कर सकते हैं। 

यहाँ एक एनालिसिस है कि कौन-सी फ़ाइल किस बड़े फीचर के लिए काम आ सकती है:

## 1. PWA & Offline Support (प्रोग्रेसिव वेब ऐप)
**File to Use:** `public/sw.js`
**Feature Idea:** 
इस Service Worker फ़ाइल का इस्तेमाल प्लेटफॉर्म को **PWA (Progressive Web App)** बनाने के लिए किया जा सकता है। इससे यूज़र्स ऐप को अपने फ़ोन में इंस्टॉल कर सकेंगे, और खराब इंटरनेट में भी कैश (cache) की गई क्लासेज़ या नोट्स पढ़ सकेंगे। इसके ज़रिए **Push Notifications** (जैसे "Your assignment is reviewed!") भी भेजे जा सकते हैं।

## 2. Bulk Course Import (JSON/CSV से कोर्स अपलोड)
**File to Use:** `seed_curriculum.js`
**Feature Idea:** 
वर्तमान में इंस्ट्रक्टर को मैन्युअली कोर्स बनाना पड़ता है। इस फ़ाइल के लॉजिक को बदलकर हम एक **"Bulk Import Feature"** बना सकते हैं जहाँ इंस्ट्रक्टर एक JSON या CSV फ़ाइल अपलोड करेगा और पूरा कोर्स (विथ लेसन्स और असाइनमेंट्स) एक सेकंड में डेटाबेस में बन जाएगा।

## 3. Automated Code Validation & Plagiarism Checker
**File to Use:** `check_submissions.js`
**Feature Idea:** 
इस फ़ाइल को एक **Cron Job** या बैकग्राउंड वर्कर में बदला जा सकता है। जब भी कोई स्टूडेंट कोड सबमिट करेगा, यह स्क्रिप्ट बैकग्राउंड में चलकर कोड को ऑटोमैटिकली रन करेगी (या OpenAI API से चेक करेगी) और इंस्ट्रक्टर का काम 50% कम कर देगी।

## 4. Advanced Gamification & Automated Badging
**Files to Use:** `trigger_badges.js`, `trigger.js`, `trigger.ts`
**Feature Idea:** 
अभी शायद बैजेज सीधे डेटाबेस से मिलते हैं। इन स्क्रिप्ट्स को हम **Supabase Edge Functions** में बदल सकते हैं। इससे जब भी कोई स्टूडेंट GitHub पर लगातार 7 दिन कोड पुश करेगा, तो यह एज फंक्शन ऑटोमैटिकली उसे "Streak Master" बैज दे देगा और स्क्रीन पर एक एनिमेशन पॉपअप भेज देगा।

## 5. Global Loading UI
**File to Use:** `src/components/ui/Spinner.tsx`
**Feature Idea:** 
यह एक UI कॉम्पोनेंट है। इसे हम Next.js के `loading.tsx` में डाल सकते हैं ताकि जब भी कोई स्टूडेंट भारी कोर्स डेटा लोड कर रहा हो, तो स्क्रीन फ्रीज होने के बजाय यह शानदार नियॉन (Neon) स्पिनर घूमे।

## 6. GitHub Integration Automation
**File to Use:** `add_github_username.js`
**Feature Idea:** 
इसे एक **OAuth Webhook** में बदला जा सकता है। जब यूज़र अपना GitHub अकाउंट लिंक करेगा, तो यह स्क्रिप्ट GitHub API से उसकी पुरानी रिपॉज़िटरीज़ पढ़ लेगी और उसे पुरानी कोडिंग के लिए भी एक्सट्रा (Extra) XP दे देगी!

## 7. Automated Infrastructure Setup (CI/CD)
**Files to Use:** `create_avatar_bucket.js`, `create_bucket.js`, `run_migration_*.js`
**Feature Idea:** 
अगर कल को आपको यह प्लेटफॉर्म किसी कॉलेज या दूसरी कंपनी को बेचना हो (SaaS Model), तो इन स्क्रिप्ट्स को एक **"One-Click Setup"** टूल में बदल सकते हैं जो उनका पूरा डेटाबेस और स्टोरेज बकेट्स (Buckets) 1 मिनट में तैयार कर देगा।

---

### Conclusion
ये फ़ाइलें कचरा (redundant) नहीं हैं, बल्कि यह आपके प्रोजेक्ट का **रफ़ ड्राफ़्ट (Rough Draft)** हैं! 

अगर आपको इनमें से कोई फीचर बहुत ज़रूरी (Important) लगता है (जैसे PWA या Automated Checking), तो आप बता सकते हैं और हम उसे सबसे पहले डेवलप कर सकते हैं!
