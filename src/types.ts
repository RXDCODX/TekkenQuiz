export type AnswerMode = "block" | "command";

export type ScreenMode = "start" | "game" | "result";

export interface MoveAnswers {
  onBlock?: string;
  commandStrict?: string;
  commandLoose?: string;
}

export interface MovePayloadRecord {
  id?: string;
  character?: string;
  command?: string;
  videoUrl?: string;
  onBlock?: string;
  block?: string;
  answers?: MoveAnswers;
}

export interface MovePayloadObject {
  moves?: MovePayloadRecord[];
}

export interface MoveRecord {
  id: string;
  character: string;
  command: string;
  videoUrl: string;
  onBlockRaw: string;
  onBlockAnswer: string;
  commandStrict: string;
  commandLoose: string;
}

export interface ScoreGainToken {
  id: string;
  text: string;
}
