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

// ✅ 1️⃣ التحقق من Webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ 2️⃣ استقبال الرسائل من Messenger
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const sender = event.sender.id;
      if (event.message && event.message.text) {
        await handleMessage(sender, event.message.text);
      } else if (event.postback) {
        await handleMessage(sender, event.postback.payload);
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ✅ 3️⃣ التعامل مع الرسائل
async function handleMessage(sender, userText) {
  const text = userText.toLowerCase();

  // ردود جاهزة (FAQ)
  if (text.includes("مرحبا") || text.includes("سلام")) {
    await sendQuickReplies(sender);
    return;
  }
  if (text.includes("توصيل")) {
    await sendMessage(sender, "🚚 التوصيل متوفّر لكل تراب الجمهورية، والدفع عند الاستلام 😉");
    return;
  }
  if (text.includes("عروض") || text.includes("promo")) {
    await sendMessage(sender, "📦 توا عنا عروض قوية! شوف أحدث المنتوجات على www.wirama-store.com 😍");
    return;
  }

  // بحث عن المنتج في WooCommerce
  const productReply = await getProductPrice(text);
  if (productReply) {
    await sendMessage(sender, productReply);
    return;
  }

  // 🔹 ChatGPT للرد القصير والعفوي
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "إنت مساعد متاع متجر تونسي اسمو ويراما ستور. جاوب باللهجة التونسية بطريقة قصيرة وواضحة (ما تتجاوزش 3 أسطر). ما تعطيش شرح مطوّل، جاوب باختصار وبأسلوب عفوي. إذا السؤال ما يخصّش الأواني ولا المنتجات، جاوب بلطافة وبدون تفاصيل."
      },
      { role: "user", content: userText }
    ]
  });

  const reply = completion.choices[0].message.content.trim();
  await sendMessage(sender, reply);
}

// ✅ 4️⃣ إرسال رسالة
async function sendMessage(sender, text) {
  await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender },
      message: { text }
    })
  });
}

// ✅ 5️⃣ Quick Replies
async function sendQuickReplies(sender) {
  const message = {
    text: "أهلا بيك 👋، شنوّة تحب تعرف؟",
    quick_replies: [
      { content_type: "text", title: "🛍️ الأسعار", payload: "الأسعار" },
      { content_type: "text", title: "🚚 التوصيل", payload: "التوصيل" },
      { content_type: "text", title: "📦 العروض", payload: "العروض" }
    ]
  };

  await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender },
      message
    })
  });
}

// ✅ 6️⃣ WooCommerce API
async function getProductPrice(query) {
  try {
    const response = await fetch(
      `${WC_URL}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`
    );
    const products = await response.json();
    if (products.length > 0) {
      const p = products[0];
      return `🔸 ${p.name}\n💰 ${p.price} د.ت\nشوفو على: ${p.permalink}`;
    }
  } catch (error) {
    console.error("خطأ في WooCommerce:", error);
  }
  return null;
}

app.listen(3000, () => console.log("✅ Wirama Bot شغال على Render"));
