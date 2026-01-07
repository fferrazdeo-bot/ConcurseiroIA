
export type QuestionType = 'multiple' | 'boolean' | 'flashcard';

export interface Question {
  id: string;
  type: QuestionType;
  subject: string;
  topic: string;
  statement: string;
  options?: {
    id: string;
    text: string;
  }[];
  correctOptionId?: string;
  explanation: string;
}

export interface StudyProject {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface ExamAttempt {
  id: string;
  projectId: string;
  timestamp: number;
  questions: Question[];
  answers: Record<string, string>;
  score: number;
  mode: QuestionType;
}

export interface SubjectAnalysis {
  name: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
}

export interface StudyTopic {
  subject: string;
  subtopics: string[];
  relevanceScore: number; // Percentual da nota total da prova (0-100)
  isParetoPriority: boolean;
  questionCount?: number; // Qtd questões prevista no edital
  knowledgeType?: 'Geral' | 'Específico';
}

export interface CargoData {
  name: string;
  topics: StudyTopic[];
}

export interface PerformanceReport {
  overallAccuracy: number;
  totalQuestionsAnswered: number;
  subjects: SubjectAnalysis[];
  aiRecommendations: string;
}

export interface ExamProfile {
  difficulty: 'Fácil' | 'Média' | 'Difícil' | 'Extrema';
  styleDescription: string;
  predominantSubjects: string[];
}

export interface AppFile {
  id: string;
  projectId: string;
  name: string;
  type: 'edital' | 'prova';
  base64: string;
  availableCargos?: CargoData[];
  selectedCargoName?: string;
  parsedTopics?: StudyTopic[]; 
  examProfile?: ExamProfile;
}
