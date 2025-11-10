# 🤖 wirama-bot

بوت ذكي للصفحة متاعك على الفيسبوك، يجاوب الزبائن آليًا باللهجة التونسية 🇹🇳  
يتفاعل مع WooCommerce، ويعطي الأسعار والروابط مباشرة من: https://wirama-store.com/

---

## ⚙️ الإعداد

### 1️⃣ على WooCommerce:
- من لوحة التحكم: `WooCommerce → Settings → Advanced → REST API`
- أضف مفتاح جديد → `Read access`
- خذ: **Consumer Key** و **Consumer Secret**

---

### 2️⃣ على Facebook Developers:
- أنشئ تطبيق جديد → Product → Messenger
- اربط صفحتك
- انسخ **Page Access Token**
- أضف Webhook URL من Render مثل:
  ```
  https://<your-render-url>.onrender.com/webhook
  ```
- Verify Token = `wirama123`

---

### 3️⃣ على Render:
- أنشئ Web Service → Node.js  
- اربط مشروعك من GitHub  
- أضف **Environment Variables**:

```
VERIFY_TOKEN = wirama123
PAGE_ACCESS_TOKEN = (رمز صفحتك)
OPENAI_API_KEY = (مفتاح OpenAI)
WC_KEY = (Consumer Key WooCommerce)
WC_SECRET = (Consumer Secret WooCommerce)
WC_URL = https://wirama-store.com
```

---

### ✅ التشغيل
1. Render يعطيك رابط مثل:
   ```
   https://messenger-bot.onrender.com
   ```
2. ضع الرابط في Facebook Webhook  
3. افتح Messenger → أرسل “مرحبا”  
4. البوت يجاوبك بـ Quick Replies + الأسعار من WooCommerce  

---

### 🧠 المزايا:
- FAQ جاهز
- WooCommerce Integration
- ChatGPT fallback باللهجة التونسية
- Quick Replies تفاعلية

© Wirama Store | إعداد: فتّي 🔥
