export type PieceType =
  | 'flag'
  | 'spy'
  | 'private'
  | 'sergeant'
  | '2nd-lieutenant'
  | '1st-lieutenant'
  | 'captain'
  | 'major'
  | 'lieutenant-colonel'
  | 'colonel'
  | '1-star'
  | '2-star'
  | '3-star'
  | '4-star'
  | '5-star';

export type PieceRank = 11 | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 | -1 | -2 | -3;

export interface Piece {
  id: string;
  type: PieceType;
  owner: 'red' | 'blue';
  rank: PieceRank;
  revealed: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Player {
  id: string;
  name: string;
  side: 'red' | 'blue';
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  isBotGame: boolean;
  botSide: 'red' | 'blue' | null;
  scores: { red: number; blue: number; draws: number; gamesPlayed: number };
}

export interface PublicRoom {
  roomId: string;
  hostName: string;
  playerCount: number;
  isFull: boolean;
  isBotGame: boolean;
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
}

export interface PieceConfig {
  type: PieceType;
  rank: PieceRank;
  count: number;
}

export const PIECE_CONFIG: PieceConfig[] = [
  { type: '5-star', rank: 11, count: 1 },
  { type: '4-star', rank: 10, count: 1 },
  { type: '3-star', rank: 9, count: 1 },
  { type: '2-star', rank: 8, count: 1 },
  { type: '1-star', rank: 7, count: 1 },
  { type: 'colonel', rank: 6, count: 1 },
  { type: 'lieutenant-colonel', rank: 5, count: 1 },
  { type: 'major', rank: 4, count: 1 },
  { type: 'captain', rank: 3, count: 1 },
  { type: '1st-lieutenant', rank: 2, count: 1 },
  { type: '2nd-lieutenant', rank: 1, count: 1 },
  { type: 'sergeant', rank: 0, count: 1 },
  { type: 'private', rank: -1, count: 6 },
  { type: 'spy', rank: -2, count: 2 },
  { type: 'flag', rank: -3, count: 1 },
];
