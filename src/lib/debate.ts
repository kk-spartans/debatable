export interface DebateConfig {
  topic: string;
  rounds: number;
  minSearches: number;
  apiKey: string;
  model: string;
  proModel?: string;
  conModel?: string;
  judgeModel?: string;
  searxngUrl?: string;
}

export interface DebateResult {
  topic: string;
  rounds: number;
  proRounds: string[];
  conRounds: string[];
  proFeedback: string;
  conFeedback: string;
  judgeResult: {
    winner: string;
    reasoning: string;
  };
}

export type AppPhase = "setup" | "debating" | "done";
