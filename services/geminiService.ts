import Groq from "groq-sdk";
import { preprocessImage, normalizeText, validateMedicines, cropTopRegion, parseDateFromText } from "./ocrPipeline";
import { ragService } from "./ragService";

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });

// --- Helper: Exponential Backoff Retry ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error.status || error.response?.status || error.error?.code;
      const message = error.message || error.error?.message || JSON.stringify(error);

      const isRetryable =
        status === 429 ||
        status === 503 ||
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('overloaded');

      if (isRetryable && i < retries - 1) {
        console.warn(`Groq API hit retryable error. Retrying in ${currentDelay}ms... (Attempt ${i + 1}/${retries})`);
        await delay(currentDelay);
        currentDelay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export const explainMedicalRecord = async (recordContent: string, recordType: string): Promise<string> => {
  const systemPrompt = `
    You are a professional Medical Assistant. Summarize this medical document (${recordType}) for a patient in clear, structured Markdown.
    
    STRICT FORMATTING RULES:
    1. Use "##" for main sections and "###" for subsections.
    2. Use bullet points for lists.
    3. Use bold (**text**) ONLY for labels or key medical terms. 
    4. Ensure no bold leak: the entire paragraph should NOT be bold.
    5. No raw JSON. No escape characters like "\\n". Use actual newlines.
    
    REQUIRED SECTIONS:
    ## Patient & Clinical Information
    - Extract Patient Name (if available)
    - Date of consultation or report
    
    ## Clinical Summary
    - Brief overview of the main findings or diagnosis.
    
    ## Symptoms & Findings
    - List symptoms and clinical observations.
    
    ## Recommendations & Medications
    - List medicines with dosage and instructions.
    - List diet or lifestyle advice.
    
    ## Healthcare Provider
    - Name and details of the doctor or hospital.
  `;

  try {
    const completion = await callWithRetry(() =>
      groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: recordContent }
        ],
        model: "llama-3.3-70b-versatile",
      })
    );
    return completion.choices[0]?.message?.content || "No summary available.";
  } catch (e) {
    console.error("Groq Explain Error:", e);
    return "Summary unavailable at the moment. Please try again later.";
  }
};

const MEDICAL_KEYWORDS = [
  "rx", "tab", "cap", "syr", "diagnosis", "prescription", "hemoglobin",
  "blood", "wbc", "rbc", "doctor", "dr.", "registration", "hospital",
  "lab", "mg", "ml", "report", "patient", "clinical", "pharmacy",
  "medicine", "history", "examination", "consultation", "opd", "ipd"
];

const countMedicalKeywords = (text: string): number => {
  const lower = text.toLowerCase();
  let count = 0;
  MEDICAL_KEYWORDS.forEach(k => {
    if (lower.includes(k.toLowerCase())) count++;
  });
  return count;
};

export const processMedicalDocument = async (base64Data: string, mimeType: string) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('PLACEHOLDER')) {
    throw new Error("Configuration Error: GROQ_API_KEY is missing or invalid in .env.local");
  }

  // Ensure RAG is initialized
  await ragService.init();

  try {
    let processedBase64 = base64Data;
    let dateRegionBase64 = base64Data;

    if (mimeType.startsWith('image/')) {
      processedBase64 = await preprocessImage(base64Data);
      dateRegionBase64 = await cropTopRegion(base64Data, 0.25);
    }

    // 1. Extract Date
    const datePrompt = `
      Extract the document date from this header region.
      Return ONLY the date in YYYY-MM-DD format.
      If no date found, return "null".
    `;

    const dateResponse = await callWithRetry(() => groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: datePrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${dateRegionBase64}` } }
          ]
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    }));

    const rawDateRegionText = dateResponse.choices[0]?.message?.content?.trim() || "null";
    const ocrDateParsed = parseDateFromText(rawDateRegionText);

    // 2. OCR Extraction
    const ocrPrompt = `
      Perform strict OCR on this medical document.
      Extract all visible text exactly as it appears.
      Return only the extracted text.
    `;

    const ocrResponse = await callWithRetry(() => groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ocrPrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${processedBase64}` } }
          ]
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    }));

    const rawOCRText = ocrResponse.choices[0]?.message?.content || "";
    const keywordCount = countMedicalKeywords(rawOCRText);
    const normalizedText = normalizeText(rawOCRText);
    const validatedText = validateMedicines(normalizedText);

    // 2.5 Retrieve Knowledge for medicines found
    const medicines = validatedText.match(/[A-Z][a-z]{3,}/g) || [];
    const uniqueMeds = Array.from(new Set(medicines));
    let ragContext = "";
    uniqueMeds.forEach(med => {
      const knowledge = ragService.getKnowledge(med);
      if (knowledge) ragContext += knowledge;
    });

    // 3. Analysis and Structuring
    const analysisPrompt = `
      You are a specialized medical document analyzer. Analyze the following OCR text and extract structured clinical information.
      
      RETRIEVED KNOWLEDGE (RAG):
      """
      ${ragContext || "No specific drug knowledge found in local index."}
      """

      Input Text:
      """
      ${validatedText}
      """
      
      STRICT RULES:
      1. Is this a medical document? (TRUE/FALSE)
      2. Document Type (PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, MEDICAL_RECORD)
      3. Extract Date (YYYY-MM-DD). Reference header date: "${ocrDateParsed || 'Unknown'}".
      4. Use the RETRIEVED KNOWLEDGE to provide clinical context in "summaryMarkdown".
      5. Generate a "summaryMarkdown" following the professional structure defined for patient reports.

      
      OUTPUT FORMAT (JSON):
      {
        "isMedicalDocument": boolean,
        "correctedText": "Full corrected text...",
        "documentType": "PRESCRIPTION" | "LAB_REPORT" | "DISCHARGE_SUMMARY" | "MEDICAL_RECORD",
        "extractedDate": "YYYY-MM-DD" or null,
        "doctorName": "Name or null",
        "diagnosis": "Main condition or Checkup",
        "summaryMarkdown": "## Patient Information\\n... professional markdown structure...",
        "confidence": 0-100
      }
      
      IMPORTANT: Return ONLY valid JSON. Do not include markdown code blocks.
    `;

    const finalResponse = await callWithRetry(() => groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs JSON." },
        { role: "user", content: analysisPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    }));

    const resultText = finalResponse.choices[0]?.message?.content || "{}";
    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse JSON response:", resultText);
      result = {};
    }

    if (result.isMedicalDocument === false && keywordCount < 2) {
      throw new Error("Invalid Document: The AI determined this is not a medical document.");
    }

    let finalDate = result.extractedDate;
    let dateConfidence = result.confidence;

    if (ocrDateParsed && result.extractedDate === ocrDateParsed) {
      dateConfidence = Math.max(dateConfidence, 95);
    } else if (ocrDateParsed && !result.extractedDate) {
      finalDate = ocrDateParsed;
      dateConfidence = 85;
    }

    return {
      extractedText: rawOCRText,
      correctedText: result.correctedText || validatedText,
      documentType: result.documentType || "PRESCRIPTION",
      extractedDate: finalDate,
      doctorName: result.doctorName,
      diagnosis: result.diagnosis || "Medical Record",
      summaryMarkdown: result.summaryMarkdown || "Analysis complete. Review original document.",
      confidence: result.confidence || 0,
      dateConfidence: dateConfidence
    };

  } catch (error: any) {
    console.error("Groq Document Processing Error:", error);
    // Pass the actual error message to the UI
    if (error.message) {
      throw new Error(`Processing Failed: ${error.message}`);
    }
    throw new Error("Medical document analysis failed. Please check your connection and try again.");
  }
};