async function prepareProducts() {
  const response = await wcApi.get("products");
  productsCache = response.data;

  for (const product of productsCache) {
    product.embeddings = await Promise.all(
      product.images.map(async (img) => {
        try {
          const emb = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: img.src
          });
          return emb.data[0].embedding;
        } catch (err) {
          console.error("Error generating embedding for image:", img.src, err);
          return null;
        }
      })
    );
    // إزالة أي Embedding فاشل
    product.embeddings = product.embeddings.filter(e => e !== null);
  }
  console.log("Products embeddings ready!");
}
