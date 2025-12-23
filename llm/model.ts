import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GOOGLE_API_KEY } from "@/lib/env";

export const getSingleAPIKey = () => {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  return GOOGLE_API_KEY.split(",")[
    Math.floor(Math.random() * GOOGLE_API_KEY.split(",").length)
  ];
};

export const getModelName = () => {
  const availableModels = [
    // "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ];
  
  const randomModel = availableModels[
    Math.floor(Math.random() * availableModels.length)
  ];
  return randomModel;
};

export const GeminiModel = () => {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set");
  }
  const gemini = createGoogleGenerativeAI({
    apiKey: getSingleAPIKey(),
  });
  return gemini(getModelName());
};
