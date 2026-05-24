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

    return parseQuizText(text, file.name.endsWith(".docx"));
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

      const options: Option[] = q.options.map((opt: { id?: string | number; text?: string | number }, optIdx: number) => {
        const id = opt.id ? String(opt.id) : String.fromCharCode(65 + optIdx);
        return {
          id: id,
          text: opt.text ? String(opt.text) : "",
          originalText: `${id}. ${opt.text || ""}`
        };
      });

      const correctOptionIds: string[] = q.correct_answer.map((ans: string | number) => String(ans));

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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error parsing JSON quiz:", err);
    return { questions: [], isValid: false, error: "Tệp JSON không hợp lệ: " + errorMsg };
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


export function normalizeCodeIndentation(content: string, isDocx: boolean = false): string {
  let result = content.replace(/\r\n/g, "\n");
  
  if (isDocx) {
    // Collapse Word paragraph artifacts: replace double newlines with single newline
    // Since each paragraph in Word has a trailing \n\n, it converts to a single \n.
    // Genuine empty lines (\n\n\n\n) convert to exactly one empty line (\n\n).
    result = result.replace(/\n\n/g, "\n");
  }
  
  if (result.startsWith("\n")) {
    result = result.substring(1);
  }
  if (result.endsWith("\n")) {
    result = result.substring(0, result.length - 1);
  }
  
  return result.split("\n").map(line => {
    const match = line.match(/^([>\s\t]*)/);
    if (match) {
      const prefix = match[1];
      const newPrefix = prefix.replace(/>/g, "    ");
      return newPrefix + line.substring(prefix.length);
    }
    return line;
  }).join("\n");
}

export function parseTaggedQuestionBlock(text: string): { text: string; type: "single_choice" | "multiple_choice" } | null {
  const regex = /\[\?\]\s*\[\s*(single_choice|multiple_choice)\s*\]([\s\S]*?)(?:\[\/\?\]|(?=\[\+\]|\[=\]|\[\>\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi;
  const match = regex.exec(text);
  if (match) {
    return {
      text: match[2].trim(),
      type: match[1].toLowerCase() as "single_choice" | "multiple_choice"
    };
  }
  return null;
}

export function parseTaggedDisplayBlocks(text: string, isDocx: boolean = false): DisplayBlock[] {
  const blocks: DisplayBlock[] = [];
  const regex = /\[\+\]\s*\[\s*([a-zA-Z0-9_]+)\s*\]([\s\S]*?)(?:\[\/\+\]|(?=\[\+\]|\[=\]|\[\>\]|\[\/\?\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawType = match[1];
    const rawContent = match[2];
    const type = mapBlockType(rawType);
    const content = type === "code" ? normalizeCodeIndentation(rawContent, isDocx) : rawContent.trim();
    blocks.push({ type, content });
  }
  return blocks;
}

export function parseTaggedExplanation(text: string): string | null {
  const regex = /\[\>\]([\s\S]*?)(?:\[\/\>\]|(?=\[\+\]|\[=\]|\[\>\]|\[\/\?\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi;
  const match = regex.exec(text);
  if (match) {
    return match[1].trim();
  }
  return null;
}

export function parseTaggedAnswerBlocks(text: string): { text: string; isCorrect: boolean }[] {
  const answers: { text: string; isCorrect: boolean }[] = [];
  const regex = /\[=\]\s*\[\s*([TF])\s*\]([\s\S]*?)(?:\[\/=\]|(?=\[\+\]|\[=\]|\[\>\]|\[\/\?\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const isCorrect = match[1].toUpperCase() === "T";
    const content = match[2].trim();
    answers.push({ text: content, isCorrect });
  }
  return answers;
}

export function parseQuizText(rawText: string, isDocx: boolean = false): ParseResult {
  const normalizedText = rawText.replace(/\[\\(\+|\?|\>|\=)\]/gi, (match, tag) => `[/${tag}]`);
  
  const questions: Question[] = [];
  
  // Split by legacy prefix "Câu X:" or new tagged question start block
  const parts = normalizedText.split(/(Câu\s+\d+\s*:|\[\?\]\s*\[\s*(?:single_choice|multiple_choice)\s*\])/gi);
  
  if (parts.length < 3) {
    return { questions: [], isValid: false, error: "Không tìm thấy câu hỏi nào. Đảm bảo đúng định dạng 'Câu X:' hoặc '[?][type]'" };
  }

  let i = 1;
  while (i < parts.length) {
    const câuLabel = parts[i];
    const body = parts[i + 1] || "";
    i += 2;

    const fullQuestionBlock = (câuLabel + body).trim();
    if (!fullQuestionBlock) continue;

    // 1. Parse tagged display blocks
    const taggedDisplay = parseTaggedDisplayBlocks(fullQuestionBlock, isDocx);
    let display_block: DisplayBlock | null = taggedDisplay.length > 0 ? taggedDisplay[0] : null;

    // 2. Parse tagged explanation
    let explanation = parseTaggedExplanation(fullQuestionBlock);

    // 3. Parse tagged answers
    const taggedAnswers = parseTaggedAnswerBlocks(fullQuestionBlock);

    // 4. Parse tagged question
    const taggedQuestion = parseTaggedQuestionBlock(fullQuestionBlock);

    // Clean all tagged constructs from the block to allow parsing legacy fallbacks
    let cleanedBlock = fullQuestionBlock;
    
    // Clean tagged question block
    cleanedBlock = cleanedBlock.replace(/\[\?\]\s*\[\s*(single_choice|multiple_choice)\s*\]([\s\S]*?)(?:\[\/\?\]|(?=\[\+\]|\[=\]|\[\>\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi, "");
    
    // Clean tagged display blocks (new syntax)
    cleanedBlock = cleanedBlock.replace(/\[\+\]\s*\[\s*([a-zA-Z0-9_]+)\s*\]([\s\S]*?)(?:\[\/\+\]|(?=\[\+\]|\[=\]|\[\>\]|\[\/\?\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi, "");
    
    // Clean tagged explanation blocks (new syntax)
    cleanedBlock = cleanedBlock.replace(/\[\>\]([\s\S]*?)(?:\[\/\>\]|(?=\[\+\]|\[=\]|\[\>\]|\[\/\?\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi, "");
    
    // Clean tagged answer blocks
    cleanedBlock = cleanedBlock.replace(/\[=\]\s*\[\s*([TF])\s*\]([\s\S]*?)(?:\[\/=\]|(?=\[\+\]|\[=\]|\[\>\]|\[\/\?\]|\[\?\]|\r?\n\s*Câu\s+\d+\s*:|\r?\n\s*[A-D][\.\)]|$))/gi, "");

    // 5. Fallback for legacy display block
    if (!display_block) {
      const displayBlockRegex = /\[\+\]\s*:\s*\(\s*type\s*=\s*([a-zA-Z_0-9]+)\s*\)\s*\.\s*\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\)/g;
      cleanedBlock = cleanedBlock.replace(displayBlockRegex, (match, type, content) => {
        const mappedType = mapBlockType(type);
        const unescaped = unescapeString(content);
        display_block = {
          type: mappedType,
          content: mappedType === "code" ? normalizeCodeIndentation(unescaped, isDocx) : unescaped
        };
        return "";
      });
    } else {
      const displayBlockRegex = /\[\+\]\s*:\s*\(\s*type\s*=\s*([a-zA-Z_0-9]+)\s*\)\s*\.\s*\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\)/g;
      cleanedBlock = cleanedBlock.replace(displayBlockRegex, "");
    }

    // 6. Fallback for legacy explanation
    if (!explanation) {
      const explanationRegex = /\[\>\]\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      cleanedBlock = cleanedBlock.replace(explanationRegex, (match, content) => {
        explanation = unescapeString(content);
        return "";
      });
    } else {
      const explanationRegex = /\[\>\]\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      cleanedBlock = cleanedBlock.replace(explanationRegex, "");
    }

    // Parse options and question text
    let options: Option[] = [];
    const correctOptionIds: string[] = [];
    let questionText = "";
    let questionType: "single_choice" | "multiple_choice" = "single_choice";

    if (taggedAnswers.length > 0) {
      options = taggedAnswers.map((ans, idx) => {
        const optionLetter = String.fromCharCode(65 + idx);
        const optId = Math.random().toString(36).substring(2, 9);
        if (ans.isCorrect) {
          correctOptionIds.push(optId);
        }
        return {
          id: optId,
          text: ans.text,
          originalText: `${optionLetter}. ${ans.text}`
        };
      });

      if (taggedQuestion) {
        questionText = taggedQuestion.text;
        questionType = taggedQuestion.type;
      } else {
        let cleanText = cleanedBlock.trim();
        const câuPrefixMatch = cleanText.match(/^Câu\s+\d+\s*:\s*([\s\S]*)/i);
        if (câuPrefixMatch) {
          cleanText = câuPrefixMatch[1].trim();
        }
        questionText = cleanText;
        questionType = correctOptionIds.length > 1 ? "multiple_choice" : "single_choice";
      }
    } else {
      const optionMatches = Array.from(cleanedBlock.matchAll(/^([A-D])[\.\)]\s*(.*?)$/gim));
      
      if (optionMatches.length === 0) {
        continue;
      }

      const firstOptionIndex = cleanedBlock.indexOf(optionMatches[0][0]);
      let rawQuestionText = cleanedBlock.substring(0, firstOptionIndex).trim();
      const câuPrefixMatch = rawQuestionText.match(/^Câu\s+\d+\s*:\s*([\s\S]*)/i);
      if (câuPrefixMatch) {
        rawQuestionText = câuPrefixMatch[1].trim();
      }

      if (taggedQuestion) {
        questionText = taggedQuestion.text;
        questionType = taggedQuestion.type;
      } else {
        questionText = rawQuestionText;
      }

      for (const match of optionMatches) {
        const optionLetter = match[1].toUpperCase();
        let optionText = match[2].trim();
        let isCorrect = false;

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

      if (taggedQuestion) {
        questionType = taggedQuestion.type;
      } else {
        questionType = correctOptionIds.length > 1 ? "multiple_choice" : "single_choice";
      }
    }

    if (options.length > 0) {
      questions.push({
        id: Math.random().toString(36).substring(2, 9),
        originalQuestion: fullQuestionBlock,
        text: questionText,
        options,
        correctOptionIds,
        type: questionType,
        display_block,
        explanation
      });
    }
  }

  if (questions.length === 0) {
    return { questions: [], isValid: false, error: "Không tìm thấy câu hỏi hoặc lựa chọn nào hợp lệ." };
  }

  const invalidQuestions = questions.filter(q => q.correctOptionIds.length === 0);
  if (invalidQuestions.length > 0) {
    return { questions, isValid: false, error: `Có ${invalidQuestions.length} câu thiếu đáp án đúng (dấu / hoặc [T])` };
  }

  return { questions, isValid: true };
}
