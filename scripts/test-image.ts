import 'dotenv/config';

const CLOUDFLARE_AI_GATEWAY_API_KEY = process.env.CLOUDFLARE_AI_GATEWAY_API_KEY;
const CLOUDFLARE_AI_GATEWAY_ENDPOINT = process.env.CLOUDFLARE_AI_GATEWAY_ENDPOINT;
const IMAGE_MODEL_ID = 'flux-1-schnell';

async function testImage() {
  console.log("--- Image Tool Diagnostic Test ---");
  
  try {
    const response = await fetch(CLOUDFLARE_AI_GATEWAY_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLOUDFLARE_AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL_ID,
        prompt: "A luxury private jet in champagne gold.",
        width: 1024,
        height: 1024,
      }),
    });

    console.log("Response Status:", response.status);
    console.log("Content-Type:", response.headers.get('content-type'));

    if (response.ok) {
        const { image } = await response.json();
        if (!image) throw new Error('No image in response');
        
        console.log("Decoding image and uploading to S3...");
        const { s3Service } = require('./services/s3.services');
        const buffer = Buffer.from(image, 'base64');
        const key = `test/image-${Date.now()}.jpg`;
        const imageUrl = await s3Service.uploadFile(buffer, key, 'image/jpeg');
        
        console.log("✅ SUCCESS: Image generated and uploaded to S3.");
        console.log("URL:", imageUrl);
    } else {
        const text = await response.text();
        console.error("❌ FAILED:", text);
    }

  } catch (err) {
    console.error("❌ ERROR during test:", err);
  }
}

testImage();
