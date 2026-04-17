import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function transcribeAndFormatAudio(audioBase64: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    你是一个专业的高级秘书。你的任务是处理会议录音。
    1. 将音频准确转录为文字。
    2. 对转录结果进行格式化，生成一份专业的会议实录。
    3. 输出格式应包含：
       - 会议概述 (Summary)
       - 议程要点 (Key Points)
       - 详细记录 (Detailed Transcript)
       - 待办事项 (Action Items)
    4. 使用 Markdown 格式进行输出。
    5. 如果录音质量不佳，请尽量根据上下文推断并标记可能的错误。
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: "请转录此录音并生成格式化的会议实录。使用中文输出。",
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for more factual transcription
      },
    });

    return response.text || "未能生成实录，请重试。";
  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
}
