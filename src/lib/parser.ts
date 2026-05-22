import mammoth from "mammoth";

export interface Option {
  id: string;
  text: string;
  originalText: string;
}

export interface DisplayBlock {
  type: string;
  content: string;
}

export interface Question {
  id: string;
  originalQuestion: string;
  text: string;
  options: Option[];
  correctOptionIds: string[];
  type: "single_choice" | "multiple_choice";
  display_block?: DisplayBlock | null;
  explanation?: string | null;
  sourceId?: string;
  sourceName?: string;
}

export interface ParseResult {
  questions: Question[];
  isValid: boolean;
  error?: string;
}

export function isQuestionCorrect(q: Question, answer: string[] | undefined): boolean {
  if (!answer || answer.length === 0) return false;
  const correctIds = q.correctOptionIds;
  if (correctIds.length !== answer.length) return false;
  const setCorrect = new Set(correctIds);
  return answer.every(id => setCorrect.has(id));
}

export async function parseFile(file: File): Promise<ParseResult> {
  try {
    if (file.name.endsWith(".json")) {
      const text = await file.text();
      return parseQuizJson(text);
    }

    let text = "";
    if (file.name.endsWith(".txt")) {
      text = await file.text();
    } else if (file.name.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      return { questions: [], isValid: false, error: "Định dạng file không được hỗ trợ. Vui lòng chọn file .txt, .docx hoặc .json" };
    }

    return parseQuizText(text);
  } catch (error) {
    console.error("Error parsing file:", error);
    return { questions: [], isValid: false, error: "Đã xảy ra lỗi khi đọc file." };
  }
}

function parseQuizJson(rawText: string): ParseResult {
  try {
    const data = JSON.parse(rawText);
    if (!data || !Array.isArray(data.questions)) {
      return { questions: [], isValid: false, error: "Định dạng JSON không hợp lệ. Phải chứa danh sách 'questions'." };
    }

    const questions: Question[] = [];
    for (let index = 0; index < data.questions.length; index++) {
      const q = data.questions[index];
      if (!q.question) {
        return { questions: [], isValid: false, error: `Câu hỏi thứ ${index + 1} thiếu trường 'question'.` };
      }
      if (!Array.isArray(q.options) || q.options.length === 0) {
        return { questions: [], isValid: false, error: `Câu hỏi thứ ${index + 1} thiếu hoặc rỗng danh sách 'options'.` };
      }
      if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
        return { questions: [], isValid: false, error: `Câu hỏi thứ ${index + 1} thiếu hoặc rỗng danh sách 'correct_answer'.` };
      }

      const options: Option[] = q.options.map((opt: any, optIdx: number) => {
        const id = opt.id ? String(opt.id) : String.fromCharCode(65 + optIdx);
        return {
          id: id,
          text: opt.text ? String(opt.text) : "",
          originalText: `${id}. ${opt.text || ""}`
        };
      });

      const correctOptionIds: string[] = q.correct_answer.map((ans: any) => String(ans));

      const optionIds = new Set(options.map(o => o.id));
      const invalidCorrect = correctOptionIds.filter((id: string) => !optionIds.has(id));
      if (invalidCorrect.length > 0) {
        return { questions: [], isValid: false, error: `Câu hỏi thứ ${index + 1} có đáp án đúng '${invalidCorrect.join(", ")}' không nằm trong danh sách options.` };
      }

      questions.push({
        id: Math.random().toString(36).substring(2, 9),
        originalQuestion: JSON.stringify(q, null, 2),
        text: q.question,
        options,
        correctOptionIds,
        type: q.type === "multiple_choice" ? "multiple_choice" : "single_choice",
        display_block: q.display_block || null,
        explanation: q.explanation || null
      });
    }

    return { questions, isValid: true };
  } catch (err: any) {
    console.error("Error parsing JSON quiz:", err);
    return { questions: [], isValid: false, error: "Tệp JSON không hợp lệ: " + err.message };
  }
}

function unescapeString(str: string): string {
  return str.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      default: return char;
    }
  });
}

function mapBlockType(type: string): string {
  if (type === "code_block") return "code";
  if (type.endsWith("_block")) {
    return type.substring(0, type.length - 6);
  }
  return type;
}

function convertArrowsToTabs(content: string): string {
  return content.split('\n').map(line => {
    const match = line.match(/^([\s\t>]*)/);
    if (match) {
      const prefix = match[1];
      const newPrefix = prefix.replace(/>/g, '\t');
      return newPrefix + line.substring(prefix.length);
    }
    return line;
  }).join('\n');
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

    let cleanedBody = body;

    // 1. Extract Block-based display block: [+][code_block] content [/+] (new syntax)
    let display_block: DisplayBlock | null = null;
    const newDisplayBlockRegex = /\[\+\]\s*\[\s*([a-zA-Z0-9_]+)\s*\]([\s\S]*?)\[\/\+\]/g;
    
    cleanedBody = cleanedBody.replace(newDisplayBlockRegex, (match, type, content) => {
      let cleanContent = content;
      // Strip exactly one leading and one trailing newline if present
      if (cleanContent.startsWith("\r\n")) {
        cleanContent = cleanContent.substring(2);
      } else if (cleanContent.startsWith("\n")) {
        cleanContent = cleanContent.substring(1);
      }
      if (cleanContent.endsWith("\r\n")) {
        cleanContent = cleanContent.substring(0, cleanContent.length - 2);
      } else if (cleanContent.endsWith("\n")) {
        cleanContent = cleanContent.substring(0, cleanContent.length - 1);
      }

      display_block = {
        type: mapBlockType(type),
        content: convertArrowsToTabs(cleanContent)
      };
      return ""; // remove display block tag from body
    });

    // 2. Extract Old display block syntax (backward compatibility)
    if (!display_block) {
      const displayBlockRegex = /\[\+\]\s*:\s*\(\s*type\s*=\s*([a-zA-Z_0-9]+)\s*\)\s*\.\s*\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\)/g;
      cleanedBody = cleanedBody.replace(displayBlockRegex, (match, type, content) => {
        display_block = {
          type: mapBlockType(type),
          content: convertArrowsToTabs(unescapeString(content))
        };
        return ""; // remove display block tag from body
      });
    }

    // Extract Explanation: [>]: "content"
    let explanation: string | null = null;
    const explanationRegex = /\[\>\]\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    cleanedBody = cleanedBody.replace(explanationRegex, (match, content) => {
      explanation = unescapeString(content);
      return ""; // remove explanation tag from body
    });

    // Split body into lines to extract options.
    // Options usually start with A., B., C., D. (case-insensitive)
    // We can use a regex to find options
    const optionMatches = Array.from(cleanedBody.matchAll(/^([A-D])[\.\)]\s*(.*?)$/gim));
    
    if (optionMatches.length === 0) {
      // maybe they are not on new lines, fallback: search for A., B. anywhere but this is risky
      // sticking to standard multiple line format
      continue;
    }

    // Question text is everything before the first option
    const firstOptionIndex = cleanedBody.indexOf(optionMatches[0][0]);
    const questionText = cleanedBody.substring(0, firstOptionIndex).trim();

    const options: Option[] = [];
    const correctOptionIds: string[] = [];

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
        correctOptionIds.push(optId);
      }
    }

    if (options.length > 0) {
       questions.push({
         id: Math.random().toString(36).substring(2, 9),
         originalQuestion: fullQuestionBlock,
         text: questionText,
         options,
         correctOptionIds,
         type: correctOptionIds.length > 1 ? "multiple_choice" : "single_choice",
         display_block,
         explanation
       });
    }
  }

  if (questions.length === 0) {
     return { questions: [], isValid: false, error: "Không tìm thấy lựa chọn A, B, C, D nào." };
  }

  // Validate if some questions are missing correct option
  const invalidQuestions = questions.filter(q => q.correctOptionIds.length === 0);
  if (invalidQuestions.length > 0) {
      // Actually we will allow it but mark as invalid file if ANY question is missing a correct answer
      return { questions, isValid: false, error: `Có ${invalidQuestions.length} câu thiếu đáp án đúng (dấu /)` };
  }

  return { questions, isValid: true };
}
