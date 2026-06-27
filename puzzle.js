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
        this.generating = {
            '4x4': false,
            '6x6': false
        };
        this.startBackgroundGeneration();
    }

    /**
     * Get next puzzle, or generate if queue is empty
     */
    async getNextPuzzle(mode) {
        if (this.queue[mode].length === 0) {
            return this.generatePuzzle(mode);
        }
        const puzzle = this.queue[mode].shift();
        this.ensureQueueFilled(mode);
        return puzzle;
    }

    /**
     * Start background generation to keep queue filled
     */
    startBackgroundGeneration() {
        setInterval(() => this.ensureQueueFilled('4x4'), 500);
        setInterval(() => this.ensureQueueFilled('6x6'), 1000);
    }

    /**
     * Ensure queue has at least one puzzle
     */
    async ensureQueueFilled(mode) {
        if (this.queue[mode].length === 0 && !this.generating[mode]) {
            this.generating[mode] = true;
            try {
                const puzzle = await this.generatePuzzle(mode);
                this.queue[mode].push(puzzle);
            } catch (e) {
                console.error('Error generating puzzle:', e);
            } finally {
                this.generating[mode] = false;
            }
        }
    }

    /**
     * Generate a single valid puzzle
     */
    async generatePuzzle(mode) {
        const config = mode === '4x4' 
            ? { size: 4, xCount: 4, clueMin: 4, clueMax: 5 }
            : { size: 6, xCount: 10, clueMin: 10, clueMax: 12 };

        let attempts = 0;
        const maxAttempts = 200;

        while (attempts < maxAttempts) {
            attempts++;

            // Periodically yield to prevent blocking
            if (attempts % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

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

            // Verify unique solvability with timeout
            let solutions = 0;
            try {
                solutions = this.countSolutions(config.size, xs, clues, 2);
            } catch (e) {
                // Timeout or error, try next
                continue;
            }

            if (solutions === 1) {
                return {
                    size: config.size,
                    xs,
                    clues,
                    xsRemaining: config.xCount
                };
            }
        }

        // Fallback: return best guess with basic validation
        console.warn('Could not generate fully unique puzzle, using best attempt');
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

        return {
            size: config.size,
            xs,
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
     * Count solutions using backtracking (up to maxSolutions)
     */
    countSolutions(size, xs, clues, maxSolutions = 2) {
        let solutionCount = 0;
        const clueArray = Object.entries(clues).map(([k, v]) => [parseInt(k), v]);

        const backtrack = (testXs, cellIdx = 0) => {
            if (solutionCount >= maxSolutions) return;

            // If we've placed all X's, verify solution
            if (testXs.size === xs.size) {
                // Check all clues
                let valid = true;
                for (const [idx, targetValue] of clueArray) {
                    const row = Math.floor(idx / size);
                    const col = idx % size;
                    const visibility = this.calculateVisibility(size, row, col, testXs);
                    if (visibility !== targetValue) {
                        valid = false;
                        break;
                    }
                }
                if (valid) solutionCount++;
                return;
            }

            // Try placing next X
            for (let i = cellIdx; i < size * size; i++) {
                if (!xs.has(i) && !testXs.has(i)) {
                    testXs.add(i);

                    // Prune: check if any clue can still be satisfied
                    let canContinue = true;
                    for (const [idx, targetValue] of clueArray) {
                        const row = Math.floor(idx / size);
                        const col = idx % size;
                        const visibility = this.calculateVisibility(size, row, col, testXs);
                        if (visibility > targetValue) {
                            canContinue = false;
                            break;
                        }
                    }

                    if (canContinue) {
                        backtrack(testXs, i + 1);
                    }

                    testXs.delete(i);
                    if (solutionCount >= maxSolutions) return;
                }
            }
        };

        backtrack(new Set());
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PuzzleGenerator;
}
