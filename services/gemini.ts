import { GoogleGenerativeAI, Part } from "@google/generative-ai";

export interface FileData {
  data: string;
  mimeType: string;
}

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

export const aiService = {
  interpretLabs: async (labsText?: string, fileData?: FileData) => {
    try {
      const genAI = getAiClient();
      if (!genAI) return "Servicio de IA no configurado (Falta API Key).";

      const parts: Part[] = [
        { text: "Eres un experto dermatólogo y tricólogo. Analiza los siguientes resultados de laboratorio (texto o imagen/PDF). TU SALIDA DEBE SER ÚNICAMENTE UN OBJETO JSON VÁLIDO (sin bloques de código markdown) con las siguientes dos claves:\n1. \"valores_detectados\": Un string conciso con los hallazgos principales (ej: \"Ferritina: 30ng/mL, VitD: 10ng/mL, TSH: 4.5uIU/mL\").\n2. \"interpretacion_medica\": Un resumen clínico profesional sugiriendo diagnósticos y tratamientos.\n\nNo incluyas nada más que el JSON." }
      ];

      if (labsText) {
        parts.push({ text: `Notas/Texto adicional del usuario: ${labsText}` });
      }

      if (fileData) {
        parts.push({
          inlineData: {
            data: fileData.data,
            mimeType: fileData.mimeType,
          },
        });
      }

      // Updated model list based on user's available models (2.5/2.0)
      const models = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-pro"
      ];

      let lastError;
      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(parts);
          const response = await result.response;
          return response.text();
        } catch (error: any) {
          console.warn(`Model ${modelName} failed:`, error.message);
          lastError = error;
        }
      }

      throw lastError || new Error("Todos los modelos fallaron.");
    } catch (error: any) {
      console.error("AI Lab Error", error);
      return `Error: ${error.message || error.toString()}.`;
    }
  },

  suggestTreatment: async (history: string) => {
    try {
      const genAI = getAiClient();
      if (!genAI) return "Servicio de IA no configurado.";

      const prompt = `Basado en este historial clínico detallado, sugiere un plan terapéutico integral (tópico, oral y procedimientos) para este paciente de tricología/dermatología. Sé conciso y profesional.\n\nHistorial: ${history}`;

      const models = [
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-pro-latest",
        "gemini-1.5-pro",
        "gemini-pro"
      ];

      let lastError;
      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (error: any) {
          console.warn(`Treatment Model ${modelName} failed:`, error.message);
          lastError = error;
        }
      }
      return "No se pudieron generar sugerencias automáticas (Modelos no disponibles).";
    } catch (error) {
      console.error("AI Treatment Error", error);
      return "No se pudieron generar sugerencias automáticas.";
    }
  }
};
