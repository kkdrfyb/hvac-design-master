import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || '';
// Initialize with API Key
const ai = new GoogleGenAI({ apiKey });

// --- Offline Fallback Data ---
const OFFLINE_QUESTIONS: Record<string, string[]> = {
  default: [
      "请核对该系统的抗震支吊架间距是否符合 GB 50981 的要求？",
      "请确认设备的基础高度是否满足冷凝水排放坡度要求？",
      "请检查防火阀的安装位置是否距离墙体表面不大于 200mm？",
      "请复核机房内检修通道宽度是否满足设备更换组件的需求？"
  ],
  多专业接口: [
      "多专业边界条件是否已与结构、电气、工艺进行交叉确认？",
      "是否确认了与其他专业的关键接口变更记录？"
  ],
  安全与风险控制: [
      "关键风险工况是否已纳入通风/空调系统方案？",
      "事故通风路径是否已验证可行性？"
  ],
  阶段成果: [
      "当前阶段成果文件是否包含必要的系统图和计算说明？",
      "阶段性成果是否已满足审图所需的基本完整度？"
  ]
};

const OFFLINE_DESIGN_CHECKLIST = `
[离线模式 - 规范自查清单]
由于无法连接 AI 网络，请依据以下通则自查：
1. 强制性条文复核：是否违反 GB50736 及 GB50016 强条？
2. 完整性检查：平面图、系统图、大样图是否闭合一致？
3. 提资复核：是否已向电气提供准确的设备功率（含备用）？
4. 碰撞检查：主要管线标高是否与梁底、喷淋及桥架冲突？
5. 节能审查：水泵风机能效比是否满足节能规范限制？
`;

export const generateWorkflowQuestion = async (category: string, customModel?: string): Promise<string> => {
  try {
    // Check if API key exists, otherwise assume offline immediately
    if (!apiKey) throw new Error("No API Key");

    const model = customModel || 'gemini-2.5-flash';
    const prompt = `
      You are a strict and experienced Senior HVAC Engineer in China.
      The user is working on the design phase: "${category}".
      
      Please generate ONE short, critical "check-up" question (in Chinese) to ask the designer.
      The question should verify if they have considered a specific, often overlooked technical detail or regulation related to this phase.
      
      Return ONLY the question text in Chinese. No introductory text.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || "请检查该阶段的关键规范要求是否满足。";
  } catch (error) {
    console.warn("Gemini API Offline/Error, using fallback:", error);
    
    // Offline Logic
    const specificQuestions = OFFLINE_QUESTIONS[category] || OFFLINE_QUESTIONS['default'];
    const randomQ = specificQuestions[Math.floor(Math.random() * specificQuestions.length)];
    return `(离线模式) ${randomQ}`;
  }
};

export const verifyDesignInput = async (input: string, customModel?: string): Promise<string> => {
    try {
        if (!apiKey) throw new Error("No API Key");

        const model = customModel || 'gemini-2.5-flash';
        const prompt = `
          You are a Senior HVAC Engineer. Review the following design note or parameter provided by a junior designer:
          "${input}"
          
          Evaluate it for potential issues, compliance risks (Chinese GB standards), or missing information.
          Reply in Chinese. Be constructive and concise.
        `;
    
        const response: GenerateContentResponse = await ai.models.generateContent({
          model,
          contents: prompt,
        });
    
        return response.text?.trim() || "无法分析输入，请重试。";
      } catch (error) {
        console.warn("Gemini API Offline/Error, using fallback:", error);
        return OFFLINE_DESIGN_CHECKLIST;
      }
}
