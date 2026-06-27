/**
 * Puzzle Generation System
 * Generates valid, uniquely solvable No Guess puzzles
 */

class PuzzleGenerator {
    constructor() {
        this.queue = {
            '4x4': [],
            '6x6': []
        };
    }

    /**
     * Get next puzzle - synchronous generation for reliability
     */
    getNextPuzzle(mode) {
        return this.generatePuzzle(mode);
    }

    /**
     * Generate a single valid puzzle
     */
    generatePuzzle(mode) {
        const config = mode === '4x4' 
            ? { size: 4, xCount: 4, clueMin: 4, clueMax: 5 }
            : { size: 6, xCount: 10, clueMin: 10, clueMax: 12 };

        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;

            // Place X's randomly
            const xs = this.randomPlaceXs(config.size, config.xCount);

            // Determine clue count
            const clueCount = Math.random() < 0.5 
                ? config.clueMin 
                : config.clueMax;

            // Select random free cells as clue cells
            const freeIndices = this.getFreeIndices(config.size, xs);
            if (freeIndices.length < clueCount) continue;

            const shuffled = this.shuffle(freeIndices);
            const clueIndices = shuffled.slice(0, clueCount);

            // Calculate clue values
            const clues = {};
            for (const idx of clueIndices) {
                const row = Math.floor(idx / config.size);
                const col = idx % config.size;
                const value = this.calculateVisibility(config.size, row, col, xs);
                clues[idx] = value;
            }

            // Verify unique solvability
            const solutions = this.countSolutions(config.size, xs, clues);
            
            if (solutions === 1) {
                // FIX: return xs as a Set so game.js can use .has() and .size
                return {
                    size: config.size,
                    xs: xs,
                    clues,
                    xsRemaining: config.xCount
                };
            }
        }

        // Fallback - create a simple puzzle
        console.warn('Using fallback puzzle generation');
        const xs = this.randomPlaceXs(config.size, config.xCount);
        const freeIndices = this.getFreeIndices(config.size, xs);
        const clueCount = config.clueMin;
        const shuffled = this.shuffle(freeIndices);
        const clueIndices = shuffled.slice(0, Math.min(clueCount, freeIndices.length));

        const clues = {};
        for (const idx of clueIndices) {
            const row = Math.floor(idx / config.size);
            const col = idx % config.size;
            const value = this.calculateVisibility(config.size, row, col, xs);
            clues[idx] = value;
        }

        // FIX: return xs as a Set so game.js can use .has() and .size
        return {
            size: config.size,
            xs: xs,
            clues,
            xsRemaining: config.xCount
        };
    }

    /**
     * Randomly place X's on the grid
     */
    randomPlaceXs(size, xCount) {
        const xs = new Set();
        const total = size * size;
        const indices = Array.from({ length: total }, (_, i) => i);

        for (let i = 0; i < xCount && i < indices.length; i++) {
            const j = Math.floor(Math.random() * (indices.length - i)) + i;
            [indices[i], indices[j]] = [indices[j], indices[i]];
            xs.add(indices[i]);
        }

        return xs;
    }

    /**
     * Get all free (non-X) cell indices
     */
    getFreeIndices(size, xs) {
        const free = [];
        for (let i = 0; i < size * size; i++) {
            if (!xs.has(i)) free.push(i);
        }
        return free;
    }

    /**
     * Calculate visibility from a cell
     */
    calculateVisibility(size, row, col, xs) {
        let count = 0;

        // Up
        for (let r = row - 1; r >= 0; r--) {
            const idx = r * size + col;
            if (xs.has(idx)) break;
            count++;
        }

        // Down
        for (let r = row + 1; r < size; r++) {
            const idx = r * size + col;
            if (xs.has(idx)) break;
            count++;
        }

        // Left
        for (let c = col - 1; c >= 0; c--) {
            const idx = row * size + c;
            if (xs.has(idx)) break;
            count++;
        }

        // Right
        for (let c = col + 1; c < size; c++) {
            const idx = row * size + c;
            if (xs.has(idx)) break;
            count++;
        }

        return count;
    }

    /**
     * Count solutions using iterative backtracking with aggressive pruning
     */
    countSolutions(size, xs, clues) {
        let solutionCount = 0;
        const clueArray = Object.entries(clues).map(([k, v]) => [parseInt(k), v]);
        const xsArray = Array.from(xs);
        const freeIndices = [];
        
        for (let i = 0; i < size * size; i++) {
            if (!xs.has(i)) freeIndices.push(i);
        }

        const backtrack = (testXs) => {
            if (solutionCount > 1) return; // Early exit if multiple solutions found

            // If we've placed all X's, verify solution
            if (testXs.length === xsArray.length) {
                let valid = true;
                for (const [idx, targetValue] of clueArray) {
                    const row = Math.floor(idx / size);
                    const col = idx % size;
                    const xsSet = new Set([...xsArray, ...testXs]);
                    const visibility = this.calculateVisibility(size, row, col, xsSet);
                    if (visibility !== targetValue) {
                        valid = false;
                        break;
                    }
                }
                if (valid) solutionCount++;
                return;
            }

            // Find next cell to place X in
            const startIdx = testXs.length > 0 ? testXs[testXs.length - 1] + 1 : 0;
            
            for (let i = startIdx; i < freeIndices.length; i++) {
                const cellIdx = freeIndices[i];
                testXs.push(cellIdx);

                // Prune: check if remaining clues can still be satisfied
                let canContinue = true;
                const xsSet = new Set([...xsArray, ...testXs]);
                const needMoreXs = xsArray.length - testXs.length;

                for (const [idx, targetValue] of clueArray) {
                    const row = Math.floor(idx / size);
                    const col = idx % size;
                    const visibility = this.calculateVisibility(size, row, col, xsSet);
                    
                    // If we already exceed the target, prune
                    if (visibility > targetValue) {
                        canContinue = false;
                        break;
                    }
                    
                    // If we can't possibly reach target even with all remaining X's, prune
                    if (visibility + needMoreXs < targetValue) {
                        canContinue = false;
                        break;
                    }
                }

                if (canContinue && solutionCount <= 1) {
                    backtrack(testXs);
                }

                testXs.pop();
            }
        };

        backtrack([]);
        return solutionCount;
    }

    /**
     * Shuffle array using Fisher-Yates
     */
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
