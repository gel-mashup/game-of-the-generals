import { PIECE_CONFIG } from '../src/types';

describe('Piece Configuration', () => {
  test('total pieces per player equals 21', () => {
    const total = PIECE_CONFIG.reduce((sum, piece) => sum + piece.count, 0);
    expect(total).toBe(21);
  });

  test('all ranks are unique', () => {
    const ranks = PIECE_CONFIG.map((p) => p.rank);
    const uniqueRanks = new Set(ranks);
    expect(uniqueRanks.size).toBe(ranks.length);
  });

  test('all piece types are unique', () => {
    const types = PIECE_CONFIG.map((p) => p.type);
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
  });

  test('flag has rank -3', () => {
    const flag = PIECE_CONFIG.find((p) => p.type === 'flag');
    expect(flag?.rank).toBe(-3);
  });

  test('5-star general has highest rank (11)', () => {
    const fiveStar = PIECE_CONFIG.find((p) => p.type === '5-star');
    expect(fiveStar?.rank).toBe(11);
  });

  test('private count is 6', () => {
    const privatePiece = PIECE_CONFIG.find((p) => p.type === 'private');
    expect(privatePiece?.count).toBe(6);
  });

  test('spy count is 2', () => {
    const spy = PIECE_CONFIG.find((p) => p.type === 'spy');
    expect(spy?.count).toBe(2);
  });

  test('ranks cover all expected values', () => {
    const ranks = PIECE_CONFIG.map((p) => p.rank).sort((a, b) => b - a);
    const expected = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3];
    expect(ranks).toEqual(expected);
  });
});
