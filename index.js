import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

// ✅ المتغيرات البيئية
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WC_KEY = process.env.WC_KEY;
const WC_SECRET = process.env.WC_SECRET;
const WC_URL = process.env.WC_URL;

// ✅ OpenAI Client
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ Webhook Verification
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

// ✅ استقبال رسائل Messenger
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

// ✅ إرسال رسالة نصية
async function sendMessage(sender, text) {
  await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender },
      message: { text },
    }),
  });
}

// ✅ Quick Replies
async function sendQuickReplies(sender) {
  await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender },
      message: {
        text: "مرحبًا 🙌 كيف نجم نعاونك؟",
        quick_replies: [
          { content_type: "text", title: "📦 المنتجات", payload: "PRODUCTS" },
          { content_type: "text", title: "🚚 التوصيل", payload: "DELIVERY" },
          { content_type: "text", title: "💬 خدمة الحريف", payload: "SUPPORT" },
        ],
      },
    }),
  });
}

// ✅ المعالجة العامة للرسائل
async function handleMessage(sender, userText) {
  const text = userText.toLowerCase();

  if (text.includes("سلام") || text.includes("مرحبا")) {
    await sendQuickReplies(sender);
    return;
  }

  if (text.includes("توصيل")) {
    await sendMessage(sender, "🚚 التوصيل موجود لكل الولايات، الدفع عند الاستلام ✅");
    return;
  }

  // ✅ الرد بالذكاء الاصطناعي
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "أجب باللهجة التونسية، باحترام وبدون إطالة." },
        { role: "user", content: text }
      ]
    });

    const reply = response.choices[0].message.content;
    await sendMessage(sender, reply);
  } catch (error) {
    console.error("AI Error:", error);
    await sendMessage(sender, "سامحني صارت مشكلة تقنية ⚙️ عاود جرّب 🙏");
  }
}

// ✅ أهم حاجة: Render يستنى Port
app.get("/", (req, res) => res.send("Bot is running ✅"));
app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running ✅");
});



