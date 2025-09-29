// 댓글 데이터 타입
export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  element: HTMLElement;
  isFiltered?: boolean;
  originalText?: string;
}

// 감정 분석 결과 타입
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    disgust: number;
    surprise: number;
  };
}

// 문맥 분석 결과 타입
export interface ContextAnalysisResult {
  isMalicious: boolean;
  confidence: number;
  categories: {
    hate: number;
    harassment: number;
    spam: number;
    inappropriate: number;
  };
  reasoning: string;
}

// 필터링 결과 타입
export interface FilteringResult {
  shouldFilter: boolean;
  confidence: number;
  reason: string;
  sanitizedText?: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 설정 타입
export interface ExtensionSettings {
  isEnabled: boolean;
  filterThreshold: number;
  autoSanitize: boolean;
  showNotifications: boolean;
}
