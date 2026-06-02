export interface ToolCallLog {
  id: string;
  name: string;
  args: string;
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
