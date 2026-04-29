import { 
  generateText, 
  generateObject, 
  streamText, 
  transcribeAudio,
  textToSpeech,
  generateImage,
  generateFile,
  generatePodcast
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
  public generatePodcast = generatePodcast;
}

export const aiService = new AiService();
