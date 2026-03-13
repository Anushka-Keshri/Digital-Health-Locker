import { ragService } from './ragService';

// --- 1. Image Preprocessing ---

export const preprocessImage = (base64Data: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64Data}`;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context error");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const contrast = 30; // Increase contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale: 0.299R + 0.587G + 0.114B
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Apply Contrast
        let c = factor * (avg - 128) + 128;
        c = Math.max(0, Math.min(255, c));

        // Simple Sharpening Simulation (Thresholding near extremes)
        if (c > 200) c = 255;
        if (c < 50) c = 0;

        data[i] = c;     // R
        data[i + 1] = c; // G
        data[i + 2] = c; // B
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
    };
    img.onerror = (e) => reject(e);
  });
};

// --- New: Crop Top Region for Date Extraction ---
export const cropTopRegion = (base64Data: string, heightPercentage: number = 0.25): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64Data}`;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context error");

      const targetHeight = img.height * heightPercentage;

      canvas.width = img.width;
      canvas.height = targetHeight;

      // Draw only the top portion
      ctx.drawImage(img, 0, 0, img.width, targetHeight, 0, 0, img.width, targetHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
    };
    img.onerror = (e) => reject(e);
  });
};

// --- New: Date Parsing & Validation Logic ---
export const parseDateFromText = (text: string): string | null => {
  // Regex for DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, D/M/YY
  // Matches separators / - .
  const datePattern = /\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.](20\d{2}|\d{2})\b/g;
  const matches = text.match(datePattern);

  if (!matches || matches.length === 0) return null;

  // Take the first valid match
  for (const match of matches) {
    // Normalize separators
    const parts = match.split(/[\/\-\.]/);
    let day = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let year = parseInt(parts[2]);

    // Handle YY -> YYYY
    if (year < 100) year += 2000;

    // Basic validation
    if (month < 1 || month > 12) continue;
    if (day < 1 || day > 31) continue;

    // Filter Future Dates (allow 1 day buffer for timezone)
    const dateObj = new Date(year, month - 1, day);
    const today = new Date();
    const buffer = new Date();
    buffer.setDate(today.getDate() + 1);

    if (dateObj > buffer) continue; // Future date
    if (year < 2000) continue; // Too old

    // Return ISO format YYYY-MM-DD
    return dateObj.toISOString().split('T')[0];
  }

  return null;
};


// --- 2. RAG Correction & Validation ---

export const validateMedicines = (text: string): string => {
  // Ensure RAG is initialized (non-blocking if already done)
  ragService.init();

  const lines = text.split('\n');

  const processedLines = lines.map(line => {
    // Don't process lines that look like dates or headers
    if (line.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/)) return line;

    // Split line into potential medical terms
    // We split by non-alphanumeric but keep common punctuation for reconstruction
    const words = line.split(/(\s+)/);

    const correctedWords = words.map(word => {
      // Skip whitespace, short words, numbers, or very long strings
      if (!word.trim() || word.length < 4 || /\d/.test(word) || word.length > 25) return word;

      // Clean word for matching
      const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();

      const { corrected, type } = ragService.correctTerm(cleanWord);

      // If a correction was found with high confidence
      if (type !== 'NONE') {
        return word.replace(cleanWord, corrected);
      }
      return word;
    });
    return correctedWords.join('');
  });

  return processedLines.join('\n');
};

// --- 3. Text Normalization ---

export const normalizeText = (text: string): string => {
  let processed = text;

  // Replace G0ld -> Gold
  processed = processed.replace(/G0ld/gi, 'Gold');

  // Replace 0 between letters -> o (e.g., Tabl0t -> Tablet)
  processed = processed.replace(/([a-zA-Z])0([a-zA-Z])/g, '$1o$2');

  // Replace l between numbers -> 1 (e.g., 5l0mg -> 510mg)
  processed = processed.replace(/([0-9])l([0-9])/g, '$11$2');

  // Fix spacing around dosage units (e.g., 500 mg -> 500mg)
  processed = processed.replace(/(\d+)\s+(mg|ml|gm)/gi, '$1$2');

  // Remove duplicate punctuation
  processed = processed.replace(/([.,;])\1+/g, '$1');

  // Fix common Rx patterns
  processed = processed.replace(/R[xX][:.]?/g, 'Rx: ');

  return processed;
};
