import vision from "@google-cloud/vision";

export async function extractTextFromImageBuffer(imageBuffer: Buffer): Promise<string> {
  const client = new vision.ImageAnnotatorClient();

  // API espera el contenido en base64.
  const [result] = await client.textDetection({
    image: { content: imageBuffer.toString("base64") }
  });

  const text = result?.fullTextAnnotation?.text ?? "";
  return text;
}

