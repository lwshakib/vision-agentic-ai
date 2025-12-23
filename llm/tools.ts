import type { Tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { v2 as cloudinary } from "cloudinary";
import {
  TAVILY_API_KEY,
  NEBIUS_API_KEY,
  DEEPGRAM_API_KEY,
} from "../env";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const tvlyClient = tavily({ apiKey: TAVILY_API_KEY || "" });

export const webSearchTool: Tool = {
  description: "Search the web for current information using Tavily.",
  inputSchema: z.object({
    query: z.string().describe("Search query for the web"),
  }),
  execute: async ({ query }: { query: string }) => {
    if (!TAVILY_API_KEY) {
      throw new Error("Missing TAVILY_API_KEY");
    }

    const result = await tvlyClient.search(query, {
      includeAnswer: true,
      includeFavicon: true,
      includeImages: false,
      maxResults: 5,
    });

    return result;
  },
};

export const extractWebUrlTool: Tool = {
  description:
    "Extract comprehensive, detailed content from one or more URLs for deep research, fact-checking, and validation. Returns full page content including all text, structure, and context. Use this for: (1) Deep research when user requests detailed/comprehensive information, (2) When webSearch results are insufficient or lack detail, (3) Fact-checking and validation from original sources, (4) Extracting detailed data, statistics, or technical information, (5) Cross-referencing multiple sources to verify claims. Always extract from multiple authoritative sources when doing deep research or validation.",
  inputSchema: z.object({
    urls: z
      .array(
        z
          .string()
          .url()
          .describe("Website URL to extract detailed content from")
      )
      .min(1)
      .max(10)
      .describe(
        "Array of URLs to extract. For deep research, include 3-5 most relevant and authoritative sources. Prioritize primary sources, official websites, and reputable publications."
      ),
  }),
  execute: async ({ urls }: { urls: string[] }) => {
    try {
      // Use advanced extraction depth for comprehensive content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await tvlyClient.extract(urls, {
        includeFavicon: true,
        includeImages: false,
        topic: "general",
        format: "markdown",
        extractDepth: "advanced", // Changed from "basic" to "advanced" for deeper extraction
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (response?.results || [])?.map((r: any) => ({
        url: r.url,
        title: r.title || r.url,
        content: r.rawContent || r.content || "No content extracted",
        favicon: r.favicon || null,
        extractedLength: r.rawContent?.length || 0,
      }));

      return {
        success: true,
        urls: urls,
        results: results,
        totalSources: results.length,
        totalContentLength: results.reduce(
          (sum: number, r: any) => sum + (r.extractedLength || 0),
          0
        ),
        response_time: response.responseTime,
      };
    } catch (error) {
      return {
        success: false,
        message: "Extract url content failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export const generateImageTool: Tool = {
  description:
    "Generate high-quality images using AI. Use this when the user explicitly asks to create, generate, or make an image, picture, photo, illustration, or artwork. The model used is Flux Schnell, which creates fast, high-quality images based on text prompts.",
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        "Detailed description of the image to generate. Be specific about style, composition, colors, subject, mood, and any other relevant details."
      ),
    width: z
      .number()
      .int()
      .min(256)
      .max(2048)
      .default(1024)
      .describe("Width of the image in pixels"),
    height: z
      .number()
      .int()
      .min(256)
      .max(2048)
      .default(1024)
      .describe("Height of the image in pixels"),
    negative_prompt: z
      .string()
      .optional()
      .describe("Things to avoid in the image"),
  }),
  execute: async ({
    prompt,
    width = 1024,
    height = 1024,
    negative_prompt = "",
  }: {
    prompt: string;
    width?: number;
    height?: number;
    negative_prompt?: string;
  }) => {
    if (!NEBIUS_API_KEY) {
      throw new Error("Missing NEBIUS_API_KEY");
    }

    try {
      const response = await fetch(
        "https://api.tokenfactory.nebius.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NEBIUS_API_KEY}`,
          },
          body: JSON.stringify({
            model: "black-forest-labs/flux-schnell",
            response_format: "b64_json",
            response_extension: "png",
            width,
            height,
            num_inference_steps: 4,
            negative_prompt: negative_prompt || "",
            seed: -1,
            loras: null,
            prompt,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `API error: ${response.statusText}`
        );
      }

      const data = await response.json();
      const base64Image = data.data?.[0]?.b64_json;

      if (!base64Image) {
        throw new Error("No image generated in response");
      }

      // Convert base64 to buffer and upload to Cloudinary
      const imageBuffer = Buffer.from(base64Image, "base64");
      const uploadResult = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "loop-social-platform",
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else if (result) {
                resolve({
                  secure_url: result.secure_url,
                  public_id: result.public_id,
                });
              } else {
                reject(new Error("Upload returned no result"));
              }
            }
          )
          .end(imageBuffer);
      });

      return {
        success: true,
        image: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        prompt,
        width,
        height,
        model: "black-forest-labs/flux-schnell",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        prompt,
      };
    }
  },
};


// ToolSet expects an object map keyed by tool name
export const textToSpeechTool: Tool = {
  description:
    "Convert text to speech using an AI model. Use this when the user asks to 'say', 'speak', 'read out loud', or convert text to audio.",
  inputSchema: z.object({
    text: z.string().describe("The text to convert to speech"),
  }),
  execute: async ({ text }: { text: string }) => {
    try {
      if (!DEEPGRAM_API_KEY) {
        throw new Error("Missing DEEPGRAM_API_KEY");
      }

      const response = await fetch(
        "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Groq API error: ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Cloudinary
      const uploadResult = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "vision-ai-studio/audio",
              resource_type: "video", // Audio is treated as video resource type in Cloudinary usually
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else if (result) {
                resolve({
                  secure_url: result.secure_url,
                  public_id: result.public_id,
                });
              } else {
                reject(new Error("Upload returned no result"));
              }
            }
          )
          .end(buffer);
      });

      return {
        success: true,
        audioUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        text,
      };
    }
  },
};

// ToolSet expects an object map keyed by tool name
export const tools: Record<string, Tool> = {
  webSearch: webSearchTool,
  extractWebUrl: extractWebUrlTool,
  generateImage: generateImageTool,
  textToSpeech: textToSpeechTool,
};
