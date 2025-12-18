
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getGameCommentary(score: number, deathReason: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Il giocatore ha appena perso a Neon Dash. Punteggio: ${score}. Causa della morte: ha urtato un ${deathReason}. Scrivi un commento sarcastico, motivante e breve (massimo 15 parole) in italiano.`,
    config: {
      systemInstruction: "Sei un annunciatore di giochi arcade futuristici, energico e un po' insolente.",
    },
  });

  return response.text || "Poteva andare peggio... o forse no!";
}
