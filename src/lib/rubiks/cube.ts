/**
 * 3x3 Rubik's cube model.
 *
 * The cube is stored as 26 cubies in a right-handed coordinate system:
 * x right, y up, z toward the viewer. The front face is +z.
 * A face turn rotates every cubie in that layer (position and sticker normals).
 * The same rotation functions drive the three.js renderer, so the logical
 * state and the animation can never disagree.
 */

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export type Move =
  | 'U' | "U'" | 'U2'
  | 'D' | "D'" | 'D2'
  | 'R' | "R'" | 'R2'
  | 'L' | "L'" | 'L2'
  | 'F' | "F'" | 'F2'
  | 'B' | "B'" | 'B2';

export const ALL_MOVES: Move[] = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

export const FACE_COLORS: Record<Face, { name: string; letter: string; hex: string }> = {
  U: { name: 'white', letter: 'W', hex: '#f2f2f2' },
  R: { name: 'red', letter: 'R', hex: '#d8322b' },
  F: { name: 'green', letter: 'G', hex: '#2fa84f' },
  D: { name: 'yellow', letter: 'Y', hex: '#f5d327' },
  L: { name: 'orange', letter: 'O', hex: '#f28c1c' },
  B: { name: 'blue', letter: 'B', hex: '#2461d6' },
};

export type Vec3 = [number, number, number];

export interface Sticker {
  normal: Vec3;
  face: Face; // the face this sticker belongs to when solved (its color)
}

export interface Cubie {
  pos: Vec3;
  stickers: Sticker[];
}

export interface CubeState {
  cubies: Cubie[];
}

/** Axis index and layer sign for each face, plus the clockwise rotation of a vector. */
export const TURN: Record<Face, { axis: 0 | 1 | 2; layer: 1 | -1; rotate: (v: Vec3) => Vec3 }> = {
  U: { axis: 1, layer: 1, rotate: ([x, y, z]) => [-z, y, x] },
  D: { axis: 1, layer: -1, rotate: ([x, y, z]) => [z, y, -x] },
  R: { axis: 0, layer: 1, rotate: ([x, y, z]) => [x, z, -y] },
  L: { axis: 0, layer: -1, rotate: ([x, y, z]) => [x, -z, y] },
  F: { axis: 2, layer: 1, rotate: ([x, y, z]) => [y, -x, z] },
  B: { axis: 2, layer: -1, rotate: ([x, y, z]) => [-y, x, z] },
};

const NORMAL_TO_FACE: { normal: Vec3; face: Face }[] = [
  { normal: [0, 1, 0], face: 'U' },
  { normal: [0, -1, 0], face: 'D' },
  { normal: [1, 0, 0], face: 'R' },
  { normal: [-1, 0, 0], face: 'L' },
  { normal: [0, 0, 1], face: 'F' },
  { normal: [0, 0, -1], face: 'B' },
];

export function solvedCube(): CubeState {
  const cubies: Cubie[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const pos: Vec3 = [x, y, z];
        const stickers: Sticker[] = [];
        for (const { normal, face } of NORMAL_TO_FACE) {
          const dot = normal[0] * x + normal[1] * y + normal[2] * z;
          if (dot === 1) stickers.push({ normal: [...normal] as Vec3, face });
        }
        cubies.push({ pos, stickers });
      }
    }
  }
  return { cubies };
}

export function parseMove(move: Move): { face: Face; quarterTurns: 1 | 2 | 3 } {
  const face = move[0] as Face;
  const suffix = move.slice(1);
  const quarterTurns = suffix === '2' ? 2 : suffix === "'" ? 3 : 1;
  return { face, quarterTurns };
}

/** Returns a new state with the move applied. Does not mutate. */
export function applyMove(state: CubeState, move: Move): CubeState {
  const { face, quarterTurns } = parseMove(move);
  const { axis, layer, rotate } = TURN[face];
  const cubies = state.cubies.map((cubie) => {
    if (cubie.pos[axis] !== layer) return cubie;
    let pos = cubie.pos;
    let stickers = cubie.stickers;
    for (let i = 0; i < quarterTurns; i++) {
      pos = rotate(pos);
      stickers = stickers.map((s) => ({ normal: rotate(s.normal), face: s.face }));
    }
    return { pos, stickers };
  });
  return { cubies };
}

export function applyMoves(state: CubeState, moves: Move[]): CubeState {
  return moves.reduce((s, m) => applyMove(s, m), state);
}

/**
 * Facelet grid of one face, 3x3, in the standard (Kociemba) reading order:
 * each face is viewed head-on with U at the top (U viewed with B at the top,
 * D viewed with F at the top).
 */
export function faceGrid(state: CubeState, face: Face): Face[][] {
  const normal = NORMAL_TO_FACE.find((n) => n.face === face)!.normal;
  const lookup = new Map<string, Face>();
  for (const cubie of state.cubies) {
    for (const s of cubie.stickers) {
      if (s.normal[0] === normal[0] && s.normal[1] === normal[1] && s.normal[2] === normal[2]) {
        lookup.set(cubie.pos.join(','), s.face);
      }
    }
  }
  const grid: Face[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: Face[] = [];
    for (let c = 0; c < 3; c++) {
      row.push(lookup.get(facePosition(face, r, c).join(','))!);
    }
    grid.push(row);
  }
  return grid;
}

function facePosition(face: Face, row: number, col: number): Vec3 {
  const a = [-1, 0, 1];
  switch (face) {
    case 'U': return [a[col], 1, a[row]];
    case 'D': return [a[col], -1, -a[row]];
    case 'F': return [a[col], -a[row], 1];
    case 'B': return [-a[col], -a[row], -1];
    case 'R': return [1, -a[row], -a[col]];
    case 'L': return [-1, -a[row], a[col]];
  }
}

/** 54-character facelet string in URFDLB order using face letters. */
export function toFacelets(state: CubeState): string {
  return FACES.map((f) => faceGrid(state, f).flat().join('')).join('');
}

export function isSolved(state: CubeState): boolean {
  return FACES.every((f) => faceGrid(state, f).flat().every((c) => c === f));
}

/** Number of stickers not matching their face center (0 when solved, max 48). */
export function misplacedStickers(state: CubeState): number {
  let n = 0;
  for (const f of FACES) {
    for (const c of faceGrid(state, f).flat()) if (c !== f) n++;
  }
  return n;
}

export function solvedFaces(state: CubeState): number {
  return FACES.filter((f) => faceGrid(state, f).flat().every((c) => c === f)).length;
}

/** Deterministic PRNG so a seed reproduces the same scramble on every client. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AXIS_OF: Record<Face, number> = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 };

/** Random scramble of `length` moves. No two consecutive moves share a face, no three share an axis. */
export function generateScramble(seed: number, length: number): Move[] {
  const rand = mulberry32(seed);
  const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];
  const suffixes = ['', "'", '2'];
  const moves: Move[] = [];
  let prev: Face | null = null;
  let prevPrev: Face | null = null;
  while (moves.length < length) {
    const face = faces[Math.floor(rand() * 6)];
    if (face === prev) continue;
    if (prev && prevPrev && AXIS_OF[face] === AXIS_OF[prev] && AXIS_OF[prev] === AXIS_OF[prevPrev]) continue;
    moves.push((face + suffixes[Math.floor(rand() * 3)]) as Move);
    prevPrev = prev;
    prev = face;
  }
  return moves;
}

export function invertMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map((m) => {
    const { face, quarterTurns } = parseMove(m);
    return (quarterTurns === 1 ? face + "'" : quarterTurns === 3 ? face : face + '2') as Move;
  });
}

const MOVE_TOKEN = /\b([URFDLB])(2'|'2|2|'|’)?(?![A-Za-z])/g;

function normalizeToken(face: string, suffix: string | undefined): Move {
  if (!suffix) return face as Move;
  if (suffix === '2') return (face + '2') as Move;
  if (suffix === "'" || suffix === '’') return (face + "'") as Move;
  return (face + '2') as Move; // "2'" and "'2" both mean a half turn
}

function tokensOf(text: string): Move[] {
  const out: Move[] = [];
  const re = new RegExp(MOVE_TOKEN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(normalizeToken(m[1], m[2]));
  return out;
}

function isPureMoveLine(line: string): boolean {
  const stripped = line.replace(/[\s,;.()\[\]`*_-]/g, '').replace(/’/g, "'");
  if (!stripped) return false;
  return /^([URFDLB](2|'|2'|'2)?)+$/.test(stripped);
}

/**
 * Pull a move sequence out of free-form model output.
 * Preference order: the last "MOVES:" line, then the last line made only of
 * moves, then every move token in the text.
 */
export function extractMoves(text: string): { moves: Move[]; source: 'moves-line' | 'pure-line' | 'all-tokens' | 'none' } {
  const cleaned = text.replace(/\*\*/g, '');
  const movesRe = /MOVES?\s*:\s*(.+)/gi;
  let lastMovesLine: string | null = null;
  let mm: RegExpExecArray | null;
  while ((mm = movesRe.exec(cleaned)) !== null) lastMovesLine = mm[1];
  if (lastMovesLine !== null) {
    const moves = tokensOf(lastMovesLine);
    if (moves.length) return { moves, source: 'moves-line' };
  }
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isPureMoveLine(lines[i])) return { moves: tokensOf(lines[i]), source: 'pure-line' };
  }
  const all = tokensOf(cleaned);
  return { moves: all, source: all.length ? 'all-tokens' : 'none' };
}

/** ASCII net of the cube using color letters, the way it is shown to the models. */
export function toNet(state: CubeState): string {
  const g = (f: Face) => faceGrid(state, f).map((row) => row.map((c) => FACE_COLORS[c].letter));
  const U = g('U'), R = g('R'), F = g('F'), D = g('D'), L = g('L'), B = g('B');
  const pad = '        ';
  const lines: string[] = [];
  for (let r = 0; r < 3; r++) lines.push(pad + U[r].join(' '));
  for (let r = 0; r < 3; r++) {
    lines.push([L[r].join(' '), F[r].join(' '), R[r].join(' '), B[r].join(' ')].join('  '));
  }
  for (let r = 0; r < 3; r++) lines.push(pad + D[r].join(' '));
  return lines.join('\n');
}

/** Faces as 3x3 grids of color letters, for structured (JSON) consumers. */
export function toColorGrids(state: CubeState): Record<Face, string[][]> {
  const out = {} as Record<Face, string[][]>;
  for (const f of FACES) out[f] = faceGrid(state, f).map((row) => row.map((c) => FACE_COLORS[c].letter));
  return out;
}

export const MOVE_DESCRIPTIONS: Record<Move, string> = {
  U: 'Turn the top face (white center) 90° clockwise, looking at it from above',
  "U'": 'Turn the top face (white center) 90° counterclockwise, looking at it from above',
  U2: 'Turn the top face (white center) 180°',
  D: 'Turn the bottom face (yellow center) 90° clockwise, looking at it from below',
  "D'": 'Turn the bottom face (yellow center) 90° counterclockwise, looking at it from below',
  D2: 'Turn the bottom face (yellow center) 180°',
  R: 'Turn the right face (red center) 90° clockwise, looking at it from the right',
  "R'": 'Turn the right face (red center) 90° counterclockwise, looking at it from the right',
  R2: 'Turn the right face (red center) 180°',
  L: 'Turn the left face (orange center) 90° clockwise, looking at it from the left',
  "L'": 'Turn the left face (orange center) 90° counterclockwise, looking at it from the left',
  L2: 'Turn the left face (orange center) 180°',
  F: 'Turn the front face (green center) 90° clockwise, looking at it from the front',
  "F'": 'Turn the front face (green center) 90° counterclockwise, looking at it from the front',
  F2: 'Turn the front face (green center) 180°',
  B: 'Turn the back face (blue center) 90° clockwise, looking at it from the back',
  "B'": 'Turn the back face (blue center) 90° counterclockwise, looking at it from the back',
  B2: 'Turn the back face (blue center) 180°',
};

export function isMove(s: string): s is Move {
  return (ALL_MOVES as string[]).includes(s);
}
