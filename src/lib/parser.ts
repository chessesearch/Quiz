import mammoth from "mammoth";

export interface Option {
  id: string;
  text: string;
  originalText: string;
}

export interface Question {
  id: string;
  originalQuestion: string;
  text: string;
  options: Option[];
  correctOptionId: string;
}

export interface ParseResult {
  questions: Question[];
  isValid: boolean;
  error?: string;
}

export async function parseFile(file: File): Promise<ParseResult> {
  try {
    let text = "";
    if (file.name.endsWith(".txt")) {
      text = await file.text();
    } else if (file.name.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      return { questions: [], isValid: false, error: "Định dạng file không được hỗ trợ. Vui lòng chọn file .txt hoặc .docx" };
    }

    return parseQuizText(text);
  } catch (error) {
    console.error("Error parsing file:", error);
    return { questions: [], isValid: false, error: "Đã xảy ra lỗi khi đọc file." };
  }
}

function parseQuizText(rawText: string): ParseResult {
  const questions: Question[] = [];
  // Split by "Câu X:"
  const parts = rawText.split(/(Câu\s+\d+\s*:)/i);
  
  // parts will be something like: [ "Intro text", "Câu 1:", "question body A. b B. c...", "Câu 2:", ... ]
  // we iterate and combine the separator and the body
  
  if (parts.length < 3) {
    return { questions: [], isValid: false, error: "Không tìm thấy câu hỏi nào. Đảm bảo đúng định dạng 'Câu X:'" };
  }

  let i = 1; // 0 is prologue
  while (i < parts.length) {
    const câuLabel = parts[i];
    const body = parts[i + 1] || "";
    i += 2;

    const fullQuestionBlock = (câuLabel + body).trim();
    if (!fullQuestionBlock) continue;

    // Split body into lines to extract options.
    // Options usually start with A., B., C., D. (case-insensitive)
    // We can use a regex to find options
    const optionMatches = Array.from(body.matchAll(/^([A-D])[\.\)]\s*(.*?)$/gim));
    
    if (optionMatches.length === 0) {
      // maybe they are not on new lines, fallback: search for A., B. anywhere but this is risky
      // sticking to standard multiple line format
      continue;
    }

    // Question text is everything before the first option
    const firstOptionIndex = body.indexOf(optionMatches[0][0]);
    const questionText = body.substring(0, firstOptionIndex).trim();

    const options: Option[] = [];
    let correctOptionId = "";

    for (const match of optionMatches) {
      const optionLetter = match[1].toUpperCase(); // A, B, C, D
      let optionText = match[2].trim();
      let isCorrect = false;

      // Check if it has a trailing slash for correct answer
      if (optionText.endsWith("/")) {
         isCorrect = true;
         optionText = optionText.substring(0, optionText.length - 1).trim();
      } else if (optionText.endsWith(" /")) {
         isCorrect = true;
         optionText = optionText.substring(0, optionText.length - 2).trim();
      }

      const optId = Math.random().toString(36).substring(2, 9);
      options.push({
        id: optId,
        text: optionText,
        originalText: `${optionLetter}. ${optionText}`
      });

      if (isCorrect) {
        correctOptionId = optId;
      }
    }

    if (options.length > 0) {
       // if no correct answer is marked, we will just pick first or leave it, but let's assume valid file has one
       questions.push({
         id: Math.random().toString(36).substring(2, 9),
         originalQuestion: fullQuestionBlock,
         text: questionText,
         options,
         correctOptionId
       });
    }
  }

  if (questions.length === 0) {
     return { questions: [], isValid: false, error: "Không tìm thấy lựa chọn A, B, C, D nào." };
  }

  // Validate if some questions are missing correct option
  const invalidQuestions = questions.filter(q => !q.correctOptionId);
  if (invalidQuestions.length > 0) {
      // Actually we will allow it but mark as invalid file if ANY question is missing a correct answer
      return { questions, isValid: false, error: `Có ${invalidQuestions.length} câu thiếu đáp án đúng (dấu /)` };
  }

  return { questions, isValid: true };
}
