
import { GoogleGenAI } from "@google/genai";

export async function getGameCommentary(score: number, deathReason: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Il giocatore ha appena perso a Neon Dash. Punteggio: ${score}. Causa della morte: ha urtato un ${deathReason}. Scrivi un commento sarcastico, motivante e breve (massimo 15 parole) in italiano.`,
      config: {
        systemInstruction: "Sei un annunciatore di giochi arcade futuristici, energico e un po' insolente.",
      },
    });

    return response.text || "Poteva andare meglio... o forse no!";
  } catch (e) {
    console.error("Errore AI:", e);
    return "L'AI è rimasta senza parole per il tuo crash!";
  }
}
