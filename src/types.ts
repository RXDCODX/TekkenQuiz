export type AnswerMode = "block" | "command";

export type GameMode = "classic" | "sandbox";

export type ScreenMode = "start" | "game" | "result";

export type SandboxSortBy =
  | "random"
  | "command-asc"
  | "command-desc"
  | "startup-asc"
  | "startup-desc"
  | "block-asc"
  | "block-desc"
  | "hit-asc"
  | "hit-desc"
  | "hitLevel-asc"
  | "hitLevel-desc"
  | "damage-asc"
  | "damage-desc";

export type FrameBand = "plus" | "neutral" | "safe" | "unsafe";

export type StartupFilterBand =
  | "under10"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "over20";

export type SandboxHitLevelFilter =
  | "high"
  | "mid"
  | "low"
  | "specialLow"
  | "specialMid"
  | "throw";

export type SandboxMovePropertyFilter =
  | "throw"
  | "counterHit"
  | "chip"
  | "jails"
  | "parry"
  | "powerCrush"
  | "homing"
  | "heatEngager"
  | "tornado"
  | "wallInteraction"
  | "floorInteraction";

export type SandboxStateFilter =
  | "whileStanding"
  | "sidestep"
  | "fullCrouch"
  | "heat"
  | "rage";

export type SandboxThrowFilterMode = "all" | "only" | "exclude";

export interface SandboxMoveFilters {
  sortBy: SandboxSortBy;
  onBlockBands: FrameBand[];
  onHitBands: FrameBand[];
  startup: StartupFilterBand[];
  hitLevels: SandboxHitLevelFilter[];
  properties: SandboxMovePropertyFilter[];
  states: SandboxStateFilter[];
  throwMode: SandboxThrowFilterMode;
}

export interface MoveAnswers {
  onBlock?: string;
  commandStrict?: string;
  commandLoose?: string;
}

export interface MovePayloadRecord {
  id?: string;
  character?: string;
  command?: string;
  name?: string;
  videoUrl?: string;
  onBlock?: string;
  block?: string;
  onHit?: string;
  hit?: string;
  onCounter?: string;
  counter?: string;
  startup?: string;
  hitLevel?: string;
  damage?: string;
  notes?: string;
  tags?: string;
  transitions?: string;
  answers?: MoveAnswers;
}

export interface MovePayloadObject {
  moves?: MovePayloadRecord[];
}

export interface MoveRecord {
  id: string;
  character: string;
  command: string;
  name: string;
  videoUrl: string;
  onBlockRaw: string;
  onBlockAnswer: string;
  onHit: string;
  onCounter: string;
  startup: string;
  hitLevel: string;
  damage: string;
  notes: string;
  tags: string;
  transitions: string;
  commandStrict: string;
  commandLoose: string;
}

export interface ScoreGainToken {
  id: string;
  text: string;
}
