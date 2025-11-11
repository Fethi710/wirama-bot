const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// إعدادات WooCommerce
const wcApi = new WooCommerceRestApi({
  url: "https://your-store.com", // غيرها بالرابط متاعك
  consumerKey: "ck_xxxxx",
  consumerSecret: "cs_xxxxx",
  version: "wc/v3"
});

// إعداد OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// تخزين بيانات المنتجات و embeddings
let productsCache = [];

// جلب المنتجات وإنشاء Embeddings للصور
async function prepareProducts() {
  const response = await wcApi.get("products");
  productsCache = response.data;

  for (const product of productsCache) {
    product.embeddings = [];

    for (const img of product.images) {
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: img.src
      });
      product.embeddings.push(emb.data[0].embedding);
    }
  }
}
prepareProducts();

// دالة لحساب cosine similarity
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// البحث عن أقرب منتج للصورة
async function findProductByImageUrl(userImageUrl) {
  const userEmb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: userImageUrl
  });
  const userVector = userEmb.data[0].embedding;

  let bestProduct = null;
  let bestScore = -1;

  for (const product of productsCache) {
    for (const prodVec of product.embeddings) {
      const score = cosineSimilarity(userVector, prodVec);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }
  }

  // نرجع المنتج فقط إذا التشابه > 0.8
  return bestScore > 0.8 ? bestProduct : null;
}

// webhook example
app.post("/webhook", async (req, res) => {
  const userImageUrl = req.body.imageUrl;
  const userName = req.body.userName || "صديقي";

  // رسالة ترحيب إذا هذا أول تواصل
  if (req.body.firstMessage) {
    res.json({
      text: `مرحبا ${userName} 👋! مرحبا بيك في متجرنا. التوصيل 8 دت لكامل الجمهورية.\nأرسل صورة أي منتوج من المتجر باش نلقاهولك.`
    });
    return;
  }

  if (userImageUrl) {
    const product = await findProductByImageUrl(userImageUrl);
    if (product) {
      res.json({
        text: `وجدتلك المنتج: ${product.name}\nالسعر: ${product.price} دت\nرابط الشراء: ${product.permalink}\nالتوصيل: 8 دت لكامل الجمهورية 🚚`
      });
    } else {
      // اقتراحات بديلة: اعرض أقرب 3 منتجات (حسب التشابه الأعلى حتى لو < 0.8)
      const suggestions = productsCache.slice(0, 3).map(p => `${p.name} - ${p.price} دت`).join("\n");
      res.json({
        text: `ما لقيتش المنتوج هذا بالضبط 😕.\nيمكنك تشوف المنتجات الأخرى:\n${suggestions}\nالتوصيل: 8 دت لكامل الجمهورية 🚚\nأرسل صورة أخرى أو اسم المنتج للمساعدة أكثر.`
      });
    }
  } else {
    res.json({ text: "أرسل صورة المنتج باش نلقاهولك." });
  }
});

app.listen(3000, () => console.log("Bot listening on port 3000"));
