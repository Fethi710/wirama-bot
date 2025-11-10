import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WC_KEY = process.env.WC_KEY;
const WC_SECRET = process.env.WC_SECRET;
const WC_URL = process.env.WC_URL;

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// FAQ جاهز
const FAQ = [
  { keywords: ["توصيل", "delivery", "دليفري"], answer: "التوصيل متوفر في كامل تراب الجمهورية 🚚🇹🇳 والتوصيل مجاني للطلبات فوق 80 دت." },
  { keywords: ["عروض", "promotion", "promo"], answer: "حالياً عنا عروض قوية 🔥 على الترامس والسربيسات. شوفهم على الموقع: " + WC_URL },
  { keywords: ["سربيس", "قهوة", "service", "فناجين"], answer: "السربيسات متوفرة بأنواع وألوان مختلفة ☕💖. فما للقهوة التركية وفما للحليب، وكلهم بورسلان فاخر." },
  { keywords: ["اتصال", "تواصل", "contact", "رقم"], answer: "تنجم تتواصل معانا مباشرة على الصفحة، أو تبعثلنا على واتساب من الزر الموجود تحت 🌐📞" }
];

// البحث في FAQ
function findFAQAnswer(userText) {
  const lowerText = userText.toLowerCase();
  for (const item of FAQ) {
    if (item.keywords.some(k => lowerText.includes(k))) return item.answer;
  }
  return null;
}

// WooCommerce fetch
async function getProductPrice(query) {
  try {
    const url = `${WC_URL}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) {
      const product = data[0];
      return `المنتج "${product.name}" سعره ${product.price} دت 💸\nاضغط هنا للشراء مباشرة: ${product.permalink}`;
    }
    return null;
  } catch (err) {
    console.error("❌ WooCommerce error:", err);
    return null;
  }
}

// ChatGPT fallback
async function getAIReply(message) {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "أنت مساعد ذكي باللهجة التونسية تجاوب على الأسئلة المتعلقة بالمنتجات، الأسعار، التوصيل، والعروض." },
        { role: "user", content: message }
      ]
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    return "صارت غلطة صغيرة 😅، جرب بعد شوية.";
  }
}

// Webhook verify
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

// استقبال الرسائل
app.post("/webhook", async (req, res) => {
  if (req.body.object === "page") {
    for (const entry of req.body.entry) {
      for (const event of entry.messaging) {
        const sender = event.sender.id;

        if (event.message && event.message.text) {
          const userText = event.message.text;
          let reply = null;

          // 1️⃣ FAQ
          reply = findFAQAnswer(userText);

          // 2️⃣ WooCommerce
          if (!reply && (userText.toLowerCase().includes("سعر") || userText.toLowerCase().includes("قداش"))) {
            reply = await getProductPrice(userText);
          }

          // 3️⃣ ChatGPT fallback
          if (!reply) reply = await getAIReply(userText);

          // 4️⃣ Quick Replies
          if (userText.toLowerCase().includes("مرحبا") || userText.toLowerCase().includes("سلام")) {
            await sendQuickReplies(sender);
          } else {
            await sendMessage(sender, { text: reply });
          }
        }
      }
    }
    res.status(200).send("OK");
  } else res.sendStatus(404);
});

// إرسال رسالة
async function sendMessage(recipient, message) {
  const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipient }, message })
  });
}

// Quick Replies
async function sendQuickReplies(recipient) {
  const message = {
    text: "أهلا وسهلا 👋 شنوّة تحب تعرف اليوم؟",
    quick_replies: [
      { content_type: "text", title: "🛍️ الأسعار", payload: "PRICES" },
      { content_type: "text", title: "🚚 التوصيل", payload: "DELIVERY" },
      { content_type: "text", title: "📦 العروض", payload: "OFFERS" },
      { content_type: "text", title: "☕ السربيسات", payload: "COFFEESETS" },
      { content_type: "text", title: "📞 التواصل", payload: "CONTACT" }
    ]
  };
  await sendMessage(recipient, message);
}

app.listen(3000, () => console.log("✅ WooCommerce Smart Messenger Bot جاهز 🔥"));
