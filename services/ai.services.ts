import { 
  generateText, 
  generateObject, 
  streamText, 
  transcribeAudio,
  textToSpeech,
  generateImage,
  generateFile
} from '@/services/llm';

export * from '@/services/llm';

class AiService {
  public generateText = generateText;
  public generateObject = generateObject;
  public streamText = streamText;
  public transcribeAudio = transcribeAudio;
  public textToSpeech = textToSpeech;
  public generateImage = generateImage;
  public generateFile = generateFile;
}

export const aiService = new AiService();
