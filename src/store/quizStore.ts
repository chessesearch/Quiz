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
  customName?: string;
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
  
  sourceAllocations: Record<string, number>;
  setSourceAllocations: (allocs: Record<string, number>) => void;
  
  theme: 'light' | 'dark';
  setTheme: (val: 'light' | 'dark') => void;
  
  isSettingsOpen: boolean;
  setSettingsOpen: (val: boolean) => void;

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
  
  questionStartTime: number | null;
  questionAccumulatedTime: number;
  questionTimes: Record<string, number>;
  
  startQuiz: () => void;
  pauseQuiz: () => void;
  resumeQuiz: () => void;
  exitQuiz: () => void;
  submitQuizEarly: () => void;
  submitAnswer: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  retryQuiz: () => void;
  retryIncorrectQuestions: (incorrectIds: string[], addExtra: boolean, extraCount: number, extraMode: 'TIME' | 'RANDOM') => void;
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
  showResultAfterQuestion: true,
  autoNext: false,
  setShowResultAfterQuestion: (val) => set({ showResultAfterQuestion: val }),
  setAutoNext: (val) => set({ autoNext: val }),
  questionCountMode: 'ALL',
  customQuestionCount: 10,
  setQuestionCountMode: (val) => set({ questionCountMode: val }),
  setCustomQuestionCount: (val) => set({ customQuestionCount: val }),
  
  sourceAllocations: {},
  setSourceAllocations: (allocs) => set({ sourceAllocations: allocs }),
  
  theme: 'light',
  setTheme: (val) => set({ theme: val }),
  
  isSettingsOpen: false,
  setSettingsOpen: (val) => set({ isSettingsOpen: val }),

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

  questionStartTime: null,
  questionAccumulatedTime: 0,
  questionTimes: {},

  startQuiz: () => {
    const { sources, questionCountMode, customQuestionCount, sourceAllocations } = get();
    const activeSources = sources.filter(s => s.active && s.isValid);
    if (activeSources.length === 0) return;

    let combinedQuestions: Question[] = [];
    
    if (questionCountMode === 'CUSTOM' && Object.keys(sourceAllocations).length > 0) {
      // Check if allocations match total custom count exactly
      const sumAlloc = Object.values(sourceAllocations).reduce((a, b) => a + b, 0);
      const isAllocValid = sumAlloc === customQuestionCount;
      
      if (isAllocValid) {
        activeSources.forEach(source => {
          const alloc = sourceAllocations[source.id] || 0;
          if (alloc > 0) {
            const qs = source.questions.map(q => ({ ...q, sourceId: source.id, sourceName: source.customName || source.name }));
            const shuffledQs = shuffleArray(qs).slice(0, alloc);
            combinedQuestions = [...combinedQuestions, ...shuffledQs];
          }
        });
      } else {
        // Fallback if allocations are broken
        activeSources.forEach(source => {
          const withSource = source.questions.map(q => ({ ...q, sourceId: source.id, sourceName: source.customName || source.name }));
          combinedQuestions = [...combinedQuestions, ...withSource];
        });
      }
    } else {
      activeSources.forEach(source => {
        const withSource = source.questions.map(q => ({ ...q, sourceId: source.id, sourceName: source.customName || source.name }));
        combinedQuestions = [...combinedQuestions, ...withSource];
      });
    }

    // Shuffle combined questions
    let finalQuestions = shuffleArray(combinedQuestions);
    
    // If not using allocations (ALL or fallback CUSTOM), apply slice
    if (questionCountMode === 'CUSTOM' && (Object.keys(sourceAllocations).length === 0 || Object.values(sourceAllocations).reduce((a, b) => a + b, 0) !== customQuestionCount)) {
      if (customQuestionCount > 0) {
        finalQuestions = finalQuestions.slice(0, customQuestionCount);
      }
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
      isPaused: false,
      questionStartTime: Date.now(),
      questionAccumulatedTime: 0,
      questionTimes: {}
    });
  },

  submitAnswer: (questionId, optionId) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: optionId }
    }));
  },

  nextQuestion: () => {
    const state = get();
    const { currentIndex, questions, startTime, accumulatedTime, questionStartTime, questionAccumulatedTime, questionTimes } = state;
    
    const currentQTime = questionAccumulatedTime + (questionStartTime ? Date.now() - questionStartTime : 0);
    const currentQId = questions[currentIndex].id;
    const newQuestionTimes = { ...questionTimes, [currentQId]: currentQTime };

    if (currentIndex < questions.length - 1) {
      set({ 
        currentIndex: currentIndex + 1,
        questionTimes: newQuestionTimes,
        questionStartTime: Date.now(),
        questionAccumulatedTime: 0
      });
    } else {
      const finalTime = accumulatedTime + (startTime ? Date.now() - startTime : 0);
      set({ 
        state: 'COMPLETED', 
        totalTime: finalTime, 
        startTime: null,
        questionTimes: newQuestionTimes,
        questionStartTime: null
      });
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
      isPaused: false,
      questionStartTime: Date.now(),
      questionAccumulatedTime: 0,
      questionTimes: {}
    });
  },

  retryIncorrectQuestions: (incorrectIds, addExtra, extraCount, extraMode) => {
    const { questions, questionTimes, sources } = get();
    
    const incorrectQuestions = questions.filter(q => incorrectIds.includes(q.id));
    let extraQuestions: Question[] = [];
    
    if (addExtra && extraCount > 0) {
      if (extraMode === 'TIME') {
        const correctQuestions = questions.filter(q => !incorrectIds.includes(q.id));
        const sortedCorrect = [...correctQuestions].sort((a, b) => {
          const timeA = questionTimes[a.id] || 0;
          const timeB = questionTimes[b.id] || 0;
          return timeB - timeA;
        });
        extraQuestions = sortedCorrect.slice(0, extraCount);
      } else {
        let allPool: Question[] = [];
        sources.filter(s => s.active && s.isValid).forEach(source => {
           const qs = source.questions.map(q => ({ ...q, sourceId: source.id, sourceName: source.name }));
           allPool = [...allPool, ...qs];
        });
        const poolExcludeIncorrect = allPool.filter(q => !incorrectIds.includes(q.id));
        const shuffledPool = shuffleArray(poolExcludeIncorrect);
        extraQuestions = shuffledPool.slice(0, extraCount);
      }
    }

    const combined = [...incorrectQuestions, ...extraQuestions];
    const uniqueCombined = Array.from(new Map(combined.map(q => [q.id, q])).values());

    const finalQuestions = shuffleArray(uniqueCombined).map(q => ({
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
      isPaused: false,
      questionStartTime: Date.now(),
      questionAccumulatedTime: 0,
      questionTimes: {}
    });
  },

  pauseQuiz: () => {
    const { startTime, accumulatedTime, isPaused, questionStartTime, questionAccumulatedTime } = get();
    if (isPaused) return;
    const newAccumulated = accumulatedTime + (startTime ? Date.now() - startTime : 0);
    const newQAccumulated = questionAccumulatedTime + (questionStartTime ? Date.now() - questionStartTime : 0);
    
    set({
      isPaused: true,
      accumulatedTime: newAccumulated,
      startTime: null,
      questionAccumulatedTime: newQAccumulated,
      questionStartTime: null
    });
  },

  resumeQuiz: () => {
    set({
      isPaused: false,
      startTime: Date.now(),
      questionStartTime: Date.now()
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
      isPaused: false,
      questionStartTime: null,
      questionAccumulatedTime: 0,
      questionTimes: {}
    });
  },

  submitQuizEarly: () => {
    const state = get();
    const { startTime, accumulatedTime, questionStartTime, questionAccumulatedTime, currentIndex, questions, questionTimes } = state;
    const finalTime = accumulatedTime + (startTime ? Date.now() - startTime : 0);
    
    // Save the time of the current question when submitting early
    const currentQTime = questionAccumulatedTime + (questionStartTime ? Date.now() - questionStartTime : 0);
    const currentQId = questions[currentIndex].id;
    const newQuestionTimes = { ...questionTimes, [currentQId]: currentQTime };

    set({ 
      state: 'COMPLETED', 
      totalTime: finalTime, 
      startTime: null,
      questionTimes: newQuestionTimes,
      questionStartTime: null
    });
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
      isPaused: false,
      questionStartTime: null,
      questionAccumulatedTime: 0,
      questionTimes: {}
    });
  }
}));
