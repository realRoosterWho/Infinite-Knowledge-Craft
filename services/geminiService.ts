import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { CraftingResult, ElementData, PetData } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Gemini 3 Flash for high speed and efficiency
const MODEL_NAME = 'gemini-3-flash-preview';

const CACHE_STORAGE_KEY = 'ikc_recipe_cache_v2';

// Load cache from localStorage on initialization
const loadCache = (): Map<string, CraftingResult> => {
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Map(parsed);
      }
    }
  } catch (e) {
    console.warn("Failed to load recipe cache", e);
  }
  return new Map();
};

const combinationCache = loadCache();

const saveCache = () => {
  try {
    localStorage.setItem(
      CACHE_STORAGE_KEY, 
      JSON.stringify(Array.from(combinationCache.entries()))
    );
  } catch (e) {
    console.warn("Failed to save cache", e);
  }
};

/**
 * Helper to handle API calls with retry logic for 429 (Quota Exceeded) errors.
 */
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      // Check for 429 or Resource Exhausted errors
      const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 1s, 2s, 4s
        console.warn(`Quota hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Extracts concepts and detects language.
 */
export const extractConcepts = async (text: string): Promise<{ elements: ElementData[], language: string }> => {
  const prompt = `
    Analyze: "${text.substring(0, 2000)}".
    1. Detect language.
    2. Extract 20 concepts (nouns) in that language.
    
    Return JSON: { "language": "Detected Language", "concepts": [{ "text": "Concept", "emoji": "💡" }] }
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      language: { type: Type.STRING },
      concepts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            emoji: { type: Type.STRING },
          },
          required: ["text", "emoji"],
        },
      },
    },
    required: ["language", "concepts"],
  };

  try {
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    }));

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response text");

    const parsed = JSON.parse(jsonText) as { language: string, concepts: { text: string; emoji: string }[] };
    
    const elements = parsed.concepts.map((item) => ({
      id: item.text.toLowerCase().replace(/\s/g, '-'),
      text: item.text,
      emoji: item.emoji,
    }));

    return { elements, language: parsed.language || 'English' };

  } catch (error) {
    console.error("Extraction error:", error);
    throw error;
  }
};

/**
 * Generates a single element data (Emoji) for a user-provided text.
 */
export const generateSingleElement = async (text: string): Promise<ElementData | null> => {
    const prompt = `
      Task: Provide a relevant emoji for the concept "${text}".
      Output Format: Emoji only.
      Example: 
      Input: "Black Hole" -> Output: "🕳️"
    `;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "text/plain",
                maxOutputTokens: 10,
            },
        }));

        let emoji = response.text?.trim() || '✨';
        const emojiMatch = emoji.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
        if (emojiMatch) {
            emoji = emojiMatch[0];
        }

        return {
            id: text.toLowerCase().replace(/\s/g, '-'),
            text: text,
            emoji: emoji,
            parents: undefined
        };
    } catch (error) {
        console.error("Single element generation error:", error);
        return {
            id: text.toLowerCase().replace(/\s/g, '-'),
            text: text,
            emoji: '✨',
        };
    }
};

/**
 * Combines two elements.
 */
export const combineElements = async (item1: string, item2: string, targetLanguage: string = 'English'): Promise<CraftingResult | null> => {
  const cacheKey = [item1, item2].sort().join('|') + `|${targetLanguage}`;
  
  if (combinationCache.has(cacheKey)) {
    return combinationCache.get(cacheKey)!;
  }

  const prompt = `
    Task: Synthesize "${item1}" + "${item2}".
    Language: ${targetLanguage}
    Rules:
    1. If they have NO logical, metaphorical, or pop-culture connection, return "NULL".
    2. No simple stacking.
    3. Provide 2 hex colors representing the result.
    4. Output Format: Result|Emoji|Hex1|Hex2
    Example: Lava|🌋|#FF4500|#8B0000
  `;

  try {
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "text/plain", 
        maxOutputTokens: 60, 
        thinkingConfig: { thinkingBudget: 0 } 
      },
    }));

    const text = response.text?.trim();
    
    if (!text || text.includes("NULL") || text.toLowerCase().includes("nothing")) {
        const nullResult: CraftingResult = { result: "NULL", emoji: "🚫", isNew: false, colors: [] };
        return null;
    }

    let [result, emoji, color1, color2] = text.split('|').map(s => s.trim());

    if (!emoji) {
       const emojiMatch = result?.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
       if (emojiMatch) {
         emoji = emojiMatch[0];
         result = result.replace(emoji, '').trim();
       } else {
         emoji = '✨'; 
       }
    }

    if (!color1 || !color1.startsWith('#')) color1 = '#60A5FA'; 
    if (!color2 || !color2.startsWith('#')) color2 = '#A78BFA'; 
    
    result = result.replace(/^["']|["']$/g, '').replace(/\.$/, '');

    if (!result) return null;

    const data: CraftingResult = {
        result: result,
        emoji: emoji || '✨',
        isNew: false,
        colors: [color1, color2]
    };

    combinationCache.set(cacheKey, data);
    saveCache();
    
    return data;

  } catch (error) {
    console.error("Combination error:", error);
    return null;
  }
};

export const explainConcept = async (term: string, language: string = 'English', context?: string): Promise<string> => {
    const contextInstruction = context 
        ? `Game Context/Topic: "${context.substring(0, 300)}..."` 
        : '';

    const prompt = `
      Explain "${term}" in ${language}.
      ${contextInstruction}
      Style: Witty, concise, fun. Mention meme context if applicable. 
      Max 1 sentence.
    `;
  
    try {
      const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "text/plain", 
          maxOutputTokens: 100, 
          thinkingConfig: { thinkingBudget: 0 } 
        },
      }));
  
      return response.text?.trim() || "No explanation available.";
    } catch (error) {
      console.error("Explanation error:", error);
      return "Could not load explanation.";
    }
  };

/**
 * Generates a unique pet based on the current items on the board.
 */
export const generatePetFromContext = async (contextItems: string[]): Promise<PetData> => {
    // Pick up to 5 random items from context to inspire the pet
    const inspiration = contextItems.sort(() => 0.5 - Math.random()).slice(0, 5).join(', ');
    
    const prompt = `
        Task: Create a cute fantasy pet/companion based on these concepts: "${inspiration}".
        Output Format: Name|Emoji|HexColor|ShortDescription
        Example: Lava Slime|🌋|#FF4500|A warm, bubbly friend.
        Rules:
        1. Name should be short (1-3 words).
        2. Color should be bright/neon (Hex).
        3. Description max 5 words.
    `;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "text/plain",
                maxOutputTokens: 60,
                thinkingConfig: { thinkingBudget: 0 }
            },
        }));

        const text = response.text?.trim() || "Mystery Blob|❓|#FFFFFF|Unknown origin.";
        const [name, emoji, color, description] = text.split('|').map(s => s.trim());

        return {
            id: Math.random().toString(36).substr(2, 9),
            name: name || "Glitch",
            emoji: emoji || "👾",
            color: color?.startsWith('#') ? color : '#FFFFFF',
            description: description || "A strange visitor.",
            createdAt: Date.now()
        };
    } catch (error) {
        console.error("Pet generation error:", error);
        return {
            id: Math.random().toString(36).substr(2, 9),
            name: "Void Mite",
            emoji: "🌑",
            color: "#94a3b8",
            description: "Born from an error.",
            createdAt: Date.now()
        };
    }
};
