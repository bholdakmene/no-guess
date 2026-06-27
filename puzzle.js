/**
 * Puzzle Generation System
 * Generates valid, logically solvable No Guess puzzles.
 * "Logically solvable" means a player can determine every cell through
 * deductive reasoning alone — no guessing or trial-and-error required.
 */

class PuzzleGenerator {
    constructor() {}

    getNextPuzzle(mode) {
        return this.generatePuzzle(mode);
    }

    generatePuzzle(mode) {
        const config = mode === '4x4'
            ? { size: 4, xCount: 4, clueMin: 4, clueMax: 6 }
            : { size: 6, xCount: 10, clueMin: 10, clueMax: 14 };

        // Main attempt loop: try random layouts and clue selections
        for (let attempt = 0; attempt < 300; attempt++) {
            const xs = this.randomPlaceXs(config.size, config.xCount);
            const freeIndices = this.getFreeIndices(config.size, xs);
            if (freeIndices.length < config.clueMin) continue;

            const clueCount = config.clueMin + Math.floor(Math.random() * (config.clueMax - config.clueMin + 1));
            const shuffled = this.shuffle(freeIndices);
            const clueIndices = shuffled.slice(0, Math.min(clueCount, freeIndices.length));

            const clues = this.buildClues(config.size, xs, clueIndices);

            if (this.isSolvableByLogic(config.size, xs, clues)) {
                return { size: config.size, xs, clues, xsRemaining: config.xCount };
            }
        }

        // Fallback: keep trying with progressively more clues until logic-solvable
        console.warn('Main generation exhausted — using fallback with extra clues');
        for (let attempt = 0; attempt < 100; attempt++) {
            const xs = this.randomPlaceXs(config.size, config.xCount);
            const freeIndices = this.getFreeIndices(config.size, xs);
            const shuffled = this.shuffle(freeIndices);

            for (let clueCount = config.clueMin; clueCount <= freeIndices.length; clueCount++) {
                const clues = this.buildClues(config.size, xs, shuffled.slice(0, clueCount));
                if (this.isSolvableByLogic(config.size, xs, clues)) {
                    return { size: config.size, xs, clues, xsRemaining: config.xCount };
                }
            }
        }

        // Should never reach here
        console.error('Puzzle generation completely failed');
        return null;
    }

    buildClues(size, xs, clueIndices) {
        const clues = {};
        for (const idx of clueIndices) {
            const row = Math.floor(idx / size);
            const col = idx % size;
            clues[idx] = this.calculateVisibility(size, row, col, xs);
        }
        return clues;
    }

    /**
     * Determine if a puzzle is solvable by pure logical deduction.
     *
     * Strategy: simulate what a logical player does.
     *   - For each unknown cell, temporarily mark it as X and check consistency.
     *     If that's inconsistent → it must be free.
     *   - Do the same test with free → if inconsistent → must be X.
     *   - Also deduce from X count: if remaining X's == remaining unknowns,
     *     all unknowns are X; if 0 remaining, all unknowns are free.
     *   - Repeat until nothing changes.
     *
     * Returns true only if every cell is determined (no unknowns remain).
     */
    isSolvableByLogic(size, xs, clues) {
        const totalXs = xs.size;
        const clueEntries = Object.entries(clues).map(([k, v]) => [parseInt(k), v]);

        // Grid values: null = unknown, true = X, false = free
        const grid = new Array(size * size).fill(null);

        // Clue cells are always free
        for (const [idx] of clueEntries) {
            grid[idx] = false;
        }

        /**
         * For a clue at clueIdx, compute:
         *   vMin — minimum possible visibility given the current grid
         *          (assumes every unknown cell adjacent to the scan is an X)
         *   vMax — maximum possible visibility
         *          (assumes every unknown cell is free, until a definite X)
         */
        const getVisibilityRange = (clueIdx) => {
            const row = Math.floor(clueIdx / size);
            const col = clueIdx % size;
            let vMin = 0, vMax = 0;

            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                let r = row + dr, c = col + dc;
                let seenUnknown = false;

                while (r >= 0 && r < size && c >= 0 && c < size) {
                    const cell = grid[r * size + c];
                    if (cell === true) break;          // definite X — blocks both
                    if (cell === false) {               // definite free
                        if (!seenUnknown) vMin++;      // only counts for min if no prior unknown
                        vMax++;
                    } else {                            // unknown
                        seenUnknown = true;
                        vMax++;                        // might be free → counts for max
                        // does NOT count for min (might be X → blocks scan)
                    }
                    r += dr;
                    c += dc;
                }
            }

            return { vMin, vMax };
        };

        /**
         * Check whether the current grid state is consistent with all constraints:
         *   1. X-count bounds
         *   2. Each clue's visibility range brackets its target value
         */
        const isConsistent = () => {
            let definiteX = 0, unknowns = 0;
            for (let i = 0; i < size * size; i++) {
                if (grid[i] === true) definiteX++;
                else if (grid[i] === null) unknowns++;
            }
            if (definiteX > totalXs) return false;
            if (definiteX + unknowns < totalXs) return false;

            for (const [clueIdx, V] of clueEntries) {
                const { vMin, vMax } = getVisibilityRange(clueIdx);
                if (vMin > V || vMax < V) return false;
            }
            return true;
        };

        // Constraint propagation loop
        let changed = true;
        while (changed) {
            changed = false;

            // --- X-count deductions ---
            let definiteX = 0, unknowns = 0;
            const unknownCells = [];
            for (let i = 0; i < size * size; i++) {
                if (grid[i] === true) definiteX++;
                else if (grid[i] === null) { unknowns++; unknownCells.push(i); }
            }

            const remaining = totalXs - definiteX;
            if (remaining < 0) return false; // contradiction

            if (unknowns > 0 && remaining === unknowns) {
                // Every remaining unknown must be X
                for (const i of unknownCells) grid[i] = true;
                changed = true;
                continue;
            }
            if (unknowns > 0 && remaining === 0) {
                // No more X's to place — all unknowns are free
                for (const i of unknownCells) grid[i] = false;
                changed = true;
                continue;
            }

            // --- Per-cell trial deductions ---
            for (let i = 0; i < size * size; i++) {
                if (grid[i] !== null) continue;

                // Test: what if this cell is X?
                grid[i] = true;
                const xOk = isConsistent();
                grid[i] = null;

                // Test: what if this cell is free?
                grid[i] = false;
                const freeOk = isConsistent();
                grid[i] = null;

                if (!xOk && !freeOk) return false; // contradiction — no solution

                if (!xOk) {
                    grid[i] = false; // must be free
                    changed = true;
                } else if (!freeOk) {
                    grid[i] = true; // must be X
                    changed = true;
                }
                // If both are consistent, we can't determine this cell yet — leave unknown
            }
        }

        // A logically solvable puzzle has no remaining unknowns after propagation
        for (let i = 0; i < size * size; i++) {
            if (grid[i] === null) return false;
        }
        return true;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    randomPlaceXs(size, xCount) {
        const xs = new Set();
        const indices = Array.from({ length: size * size }, (_, i) => i);
        for (let i = 0; i < xCount; i++) {
            const j = i + Math.floor(Math.random() * (indices.length - i));
            [indices[i], indices[j]] = [indices[j], indices[i]];
            xs.add(indices[i]);
        }
        return xs;
    }

    getFreeIndices(size, xs) {
        const free = [];
        for (let i = 0; i < size * size; i++) {
            if (!xs.has(i)) free.push(i);
        }
        return free;
    }

    calculateVisibility(size, row, col, xs) {
        let count = 0;
        for (let r = row - 1; r >= 0; r--) { if (xs.has(r * size + col)) break; count++; }
        for (let r = row + 1; r < size; r++) { if (xs.has(r * size + col)) break; count++; }
        for (let c = col - 1; c >= 0; c--) { if (xs.has(row * size + c)) break; count++; }
        for (let c = col + 1; c < size; c++) { if (xs.has(row * size + c)) break; count++; }
        return count;
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PuzzleGenerator;
}
