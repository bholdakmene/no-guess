/**
 * Constraint-based Puzzle Solver
 * Verifies puzzle solvability and assists with solving
 */

class PuzzleSolver {
    constructor(size, clues, xs = null) {
        this.size = size;
        this.clues = clues;
        this.xs = xs || new Set();
        this.grid = this.initializeGrid();
    }

    /**
     * Initialize grid: 0 = unknown, 1 = X, -1 = free
     */
    initializeGrid() {
        const grid = new Array(this.size * this.size);

        for (let i = 0; i < this.size * this.size; i++) {
            if (this.clues[i] !== undefined) {
                grid[i] = -2; // Mark as clue (special)
            } else if (this.xs.has(i)) {
                grid[i] = 1; // X
            } else {
                grid[i] = 0; // Unknown
            }
        }

        return grid;
    }

    /**
     * Calculate visibility from a position given current grid state
     */
    calculateVisibilityWithGrid(row, col, grid = null) {
        const g = grid || this.grid;
        let count = 0;

        // Up
        for (let r = row - 1; r >= 0; r--) {
            const idx = r * this.size + col;
            if (g[idx] === 1) break; // Hit X
            if (g[idx] !== 1) count++;
        }

        // Down
        for (let r = row + 1; r < this.size; r++) {
            const idx = r * this.size + col;
            if (g[idx] === 1) break;
            if (g[idx] !== 1) count++;
        }

        // Left
        for (let c = col - 1; c >= 0; c--) {
            const idx = row * this.size + c;
            if (g[idx] === 1) break;
            if (g[idx] !== 1) count++;
        }

        // Right
        for (let c = col + 1; c < this.size; c++) {
            const idx = row * this.size + c;
            if (g[idx] === 1) break;
            if (g[idx] !== 1) count++;
        }

        return count;
    }

    /**
     * Get cells visible from a clue position in a given direction
     */
    getVisibleCells(row, col, direction) {
        const cells = [];
        const directions = {
            'up': { dr: -1, dc: 0 },
            'down': { dr: 1, dc: 0 },
            'left': { dr: 0, dc: -1 },
            'right': { dr: 0, dc: 1 }
        };

        const { dr, dc } = directions[direction];
        let r = row + dr, c = col + dc;

        while (r >= 0 && r < this.size && c >= 0 && c < this.size) {
            const idx = r * this.size + c;
            if (this.grid[idx] === 1) break; // Hit X
            cells.push(idx);
            r += dr;
            c += dc;
        }

        return cells;
    }

    /**
     * Constraint propagation: narrow down possibilities
     */
    propagateConstraints() {
        let changed = true;
        while (changed) {
            changed = false;

            for (const [idxStr, clueValue] of Object.entries(this.clues)) {
                const idx = parseInt(idxStr);
                const row = Math.floor(idx / this.size);
                const col = idx % this.size;

                const directions = ['up', 'down', 'left', 'right'];

                for (const dir of directions) {
                    const visible = this.getVisibleCells(row, col, dir);

                    let unknownCount = 0;
                    let setXCount = 0;

                    for (const cellIdx of visible) {
                        if (this.grid[cellIdx] === 0) unknownCount++;
                        if (this.grid[cellIdx] === 1) setXCount++;
                    }

                    // If all remaining unknowns must be X to satisfy clue
                    // (This is a simple heuristic; full constraint satisfaction is complex)
                }
            }
        }
    }

    /**
     * Check if current state violates any constraints
     */
    isConsistent() {
        for (const [idxStr, clueValue] of Object.entries(this.clues)) {
            const idx = parseInt(idxStr);
            const row = Math.floor(idx / this.size);
            const col = idx % this.size;

            const visibility = this.calculateVisibilityWithGrid(row, col);

            // Count how many unknown cells remain
            let unknownCount = 0;
            for (let i = 0; i < this.size * this.size; i++) {
                if (this.grid[i] === 0) unknownCount++;
            }

            // If we've already exceeded the clue value, inconsistent
            if (visibility > clueValue) {
                return false;
            }

            // If we can't reach clue value even with all unknowns, inconsistent
            if (visibility + unknownCount < clueValue) {
                return false;
            }
        }

        return true;
    }

    /**
     * Verify if grid satisfies all clues
     */
    isSolution() {
        for (const [idxStr, clueValue] of Object.entries(this.clues)) {
            const idx = parseInt(idxStr);
            const row = Math.floor(idx / this.size);
            const col = idx % this.size;

            const visibility = this.calculateVisibilityWithGrid(row, col);
            if (visibility !== clueValue) return false;
        }

        return true;
    }

    /**
     * Get hint: suggest next cell to mark
     */
    getHint() {
        // Simple heuristic: find cells that must be X based on visibility constraints
        const mustBeX = [];
        const mustBeFree = [];

        for (let i = 0; i < this.size * this.size; i++) {
            if (this.grid[i] !== 0) continue; // Only check unknowns

            // Try marking as X
            this.grid[i] = 1;
            if (!this.isConsistent()) {
                mustBeFree.push(i);
            }
            this.grid[i] = 0;

            // Try marking as free
            this.grid[i] = -1;
            if (!this.isConsistent()) {
                mustBeX.push(i);
            }
            this.grid[i] = 0;
        }

        if (mustBeX.length > 0) {
            return { type: 'x', indices: mustBeX };
        }

        if (mustBeFree.length > 0) {
            return { type: 'free', indices: mustBeFree };
        }

        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PuzzleSolver;
}
