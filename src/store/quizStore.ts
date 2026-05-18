import { create } from 'zustand';
import { Question, Option } from '../lib/parser';

export interface SourceFile {
  id: string;
  name: string;
  questionsCount: number;
  active: boolean;
  questions: Question[];
  isValid: boolean;
  error?: string;
}

export type QuizState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface QuizStore {
  // Settings
  showResultAfterQuestion: boolean;
  autoNext: boolean;
  setShowResultAfterQuestion: (val: boolean) => void;
  setAutoNext: (val: boolean) => void;
  questionCountMode: 'ALL' | 'CUSTOM';
  customQuestionCount: number;
  setQuestionCountMode: (val: 'ALL' | 'CUSTOM') => void;
  setCustomQuestionCount: (val: number) => void;

  // Sources
  sources: SourceFile[];
  addSource: (source: SourceFile) => void;
  toggleSource: (id: string) => void;
  removeSource: (id: string) => void;

  // Quiz execution
  state: QuizState;
  questions: Question[]; // Combined and shuffled
  currentIndex: number;
  answers: Record<string, string>; // questionId -> optionId
  startTime: number | null;
  accumulatedTime: number;
  totalTime: number | null;
  isPaused: boolean;
  
  startQuiz: () => void;
  pauseQuiz: () => void;
  resumeQuiz: () => void;
  exitQuiz: () => void;
  submitQuizEarly: () => void;
  submitAnswer: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  retryQuiz: () => void;
  resetApp: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  showResultAfterQuestion: false,
  autoNext: true,
  setShowResultAfterQuestion: (val) => set({ showResultAfterQuestion: val }),
  setAutoNext: (val) => set({ autoNext: val }),
  questionCountMode: 'ALL',
  customQuestionCount: 10,
  setQuestionCountMode: (val) => set({ questionCountMode: val }),
  setCustomQuestionCount: (val) => set({ customQuestionCount: val }),

  sources: [],
  addSource: (source) => set((state) => ({ sources: [...state.sources, source] })),
  toggleSource: (id) => set((state) => ({
    sources: state.sources.map(s => s.id === id ? { ...s, active: !s.active } : s)
  })),
  removeSource: (id) => set((state) => ({
    sources: state.sources.filter(s => s.id !== id)
  })),

  state: 'NOT_STARTED',
  questions: [],
  currentIndex: 0,
  answers: {},
  startTime: null,
  accumulatedTime: 0,
  totalTime: null,
  isPaused: false,

  startQuiz: () => {
    const { sources } = get();
    const activeSources = sources.filter(s => s.active && s.isValid);
    if (activeSources.length === 0) return;

    let combinedQuestions: Question[] = [];
    activeSources.forEach(source => {
      combinedQuestions = [...combinedQuestions, ...source.questions];
    });

    // Shuffle questions and options
    let finalQuestions = shuffleArray(combinedQuestions);
    const { questionCountMode, customQuestionCount } = get();
    if (questionCountMode === 'CUSTOM' && customQuestionCount > 0) {
      finalQuestions = finalQuestions.slice(0, customQuestionCount);
    }

    finalQuestions = finalQuestions.map(q => ({
      ...q,
      options: shuffleArray(q.options)
    }));

    set({
      state: 'IN_PROGRESS',
      questions: finalQuestions,
      currentIndex: 0,
      answers: {},
      startTime: Date.now(),
      accumulatedTime: 0,
      totalTime: null,
      isPaused: false
    });
  },

  submitAnswer: (questionId, optionId) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: optionId }
    }));
  },

  nextQuestion: () => {
    const { currentIndex, questions, startTime, accumulatedTime } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    } else {
      const finalTime = accumulatedTime + (startTime ? Date.now() - startTime : 0);
      set({ state: 'COMPLETED', totalTime: finalTime, startTime: null });
    }
  },

  retryQuiz: () => {
    const { questions } = get();
    // Reshuffle for retry
    const reshuffled = shuffleArray(questions).map(q => ({
      ...q,
      options: shuffleArray(q.options)
    }));
    set({
      state: 'IN_PROGRESS',
      questions: reshuffled,
      currentIndex: 0,
      answers: {},
      startTime: Date.now(),
      accumulatedTime: 0,
      totalTime: null,
      isPaused: false
    });
  },

  pauseQuiz: () => {
    const { startTime, accumulatedTime, isPaused } = get();
    if (isPaused) return;
    const newAccumulated = accumulatedTime + (startTime ? Date.now() - startTime : 0);
    set({
      isPaused: true,
      accumulatedTime: newAccumulated,
      startTime: null
    });
  },

  resumeQuiz: () => {
    set({
      isPaused: false,
      startTime: Date.now()
    });
  },

  exitQuiz: () => {
    set({
      state: 'NOT_STARTED',
      questions: [],
      currentIndex: 0,
      answers: {},
      startTime: null,
      accumulatedTime: 0,
      totalTime: null,
      isPaused: false
    });
  },

  submitQuizEarly: () => {
    const { startTime, accumulatedTime } = get();
    const finalTime = accumulatedTime + (startTime ? Date.now() - startTime : 0);
    set({ state: 'COMPLETED', totalTime: finalTime, startTime: null });
  },

  resetApp: () => {
    set({
      state: 'NOT_STARTED',
      questions: [],
      currentIndex: 0,
      answers: {},
      startTime: null,
      accumulatedTime: 0,
      totalTime: null,
      isPaused: false
    });
  }
}));
