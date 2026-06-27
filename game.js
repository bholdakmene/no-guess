/**
 * Main Game Engine
 * Manages game state, UI, and user interactions
 */

class NoGuessGame {
    constructor() {
        this.generator = new PuzzleGenerator();
        this.puzzle = null;      // current game's puzzle — never overwritten mid-game
        this.nextPuzzle = null;  // pre-loaded puzzle waiting in the wings
        this.marked = new Set();
        this.mode = '4x4';
        this.gameActive = false;
        this.timerStarted = false;
        this.timerInterval = null;
        this.timerMs = 0;
        this.gameResult = null; // 'win', 'loss', 'giveup'
        this.incorrectCellIdx = null;
        this.stats = this.loadStats();

        this.initializeUI();
        this.loadNextPuzzle(); // pre-load first puzzle into this.nextPuzzle
    }

    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Game buttons
        document.getElementById('new-puzzle-btn').addEventListener('click', () => this.newPuzzle());
        document.getElementById('give-up-btn').addEventListener('click', () => this.giveUp());
        document.getElementById('face-button').addEventListener('click', () => this.newPuzzle());

        this.updateStats();
    }

    /**
     * Switch active tab
     */
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        if (tabName === 'stats') {
            this.updateStats();
        }
    }

    /**
     * Switch game mode
     */
    async switchMode(newMode) {
        if (this.gameActive) {
            if (!confirm('End current game?')) return;
        }

        this.mode = newMode;
        this.nextPuzzle = null; // discard any pre-loaded puzzle for the old mode

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === newMode);
        });

        await this.newPuzzle();
    }

    /**
     * Pre-load the next puzzle into this.nextPuzzle (never touches this.puzzle)
     */
    async loadNextPuzzle() {
        this.nextPuzzle = await this.generator.getNextPuzzle(this.mode);
    }

    /**
     * Start new puzzle
     */
    async newPuzzle() {
        // Grab pre-loaded puzzle; if not ready yet, generate one now
        if (this.nextPuzzle) {
            this.puzzle = this.nextPuzzle;
            this.nextPuzzle = null;
        } else {
            this.puzzle = this.generator.getNextPuzzle(this.mode);
        }

        this.marked.clear();
        this.gameActive = true;
        this.timerStarted = false;
        this.timerMs = 0;
        this.gameResult = null;
        this.incorrectCellIdx = null;

        if (this.timerInterval) clearInterval(this.timerInterval);

        document.getElementById('face-button').textContent = '🙂';
        document.getElementById('new-puzzle-btn').disabled = false;
        document.getElementById('give-up-btn').disabled = false;

        this.renderBoard();
        this.updateUI();

        // Pre-load next puzzle in background — stored in this.nextPuzzle, not this.puzzle
        setTimeout(() => this.loadNextPuzzle(), 100);
    }

    /**
     * Render game board
     */
    renderBoard() {
        const boardEl = document.getElementById('game-board');
        boardEl.innerHTML = '';

        const gridSize = this.puzzle.size;
        boardEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        boardEl.style.gap = '2px';

        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;

            if (this.puzzle.clues[i] !== undefined) {
                // Clue cell
                cell.classList.add('clue', `clue-${this.puzzle.clues[i]}`);
                cell.textContent = this.puzzle.clues[i];
            } else if (this.gameResult && this.puzzle.xs.has(i)) {
                // Reveal all X positions on game end
                cell.classList.add('revealed', 'is-x');
                if (this.marked.has(i)) {
                    cell.classList.add('correct');
                }
            } else if (this.gameResult && i === this.incorrectCellIdx) {
                // The wrong cell the player clicked
                cell.classList.add('revealed', 'incorrect');
            } else if (this.marked.has(i)) {
                cell.classList.add('marked');
            }

            if (!this.gameActive || this.puzzle.clues[i] !== undefined) {
                cell.style.cursor = 'default';
            }

            cell.addEventListener('click', () => this.handleCellClick(i));
            boardEl.appendChild(cell);
        }
    }

    /**
     * Handle cell click
     */
    handleCellClick(index) {
        if (!this.gameActive || this.puzzle.clues[index] !== undefined || this.marked.has(index)) {
            return;
        }

        // Start timer on first mark
        if (!this.timerStarted) {
            this.timerStarted = true;
            this.timerInterval = setInterval(() => this.updateTimer(), 10);
        }

        // Check if this cell is an X
        if (!this.puzzle.xs.has(index)) {
            // Wrong cell — loss
            this.incorrectCellIdx = index;
            this.endGame('loss');
            return;
        }

        // Correct X marked
        this.marked.add(index);
        this.updateUI();
        this.renderBoard();

        // Check if all X's are found
        if (this.marked.size === this.puzzle.xs.size) {
            this.endGame('win');
        }
    }

    /**
     * Give up
     */
    giveUp() {
        if (!this.gameActive) return;
        this.endGame('giveup');
    }

    /**
     * End game
     */
    endGame(result) {
        this.gameActive = false;
        this.gameResult = result;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        document.getElementById('face-button').textContent = result === 'win' ? '😎' : '😵';

        const timeStr = this.formatTime(this.timerMs);
        this.recordGame(result, timeStr);

        // Reveal the board (show all X positions)
        this.renderBoard();
        this.updateStats();
    }

    /**
     * Record game result to stats
     */
    recordGame(result, timeStr) {
        const modeKey = this.mode === '4x4' ? '4x4' : '6x6';
        const timeMs = this.timerMs;

        const game = {
            mode: modeKey,
            result: result,
            time: timeStr,
            timestamp: Date.now()
        };

        this.stats.history.unshift(game);
        this.stats.history = this.stats.history.slice(0, 100);

        const modeStats = this.stats[modeKey];
        modeStats.totalGames++;

        if (result === 'win') {
            modeStats.totalWins++;
            if (!modeStats.bestTime || timeMs < modeStats.bestTime) {
                modeStats.bestTime = timeMs;
            }
        } else {
            modeStats.totalLosses++;
        }

        this.saveStats();
    }

    /**
     * Update timer display
     */
    updateTimer() {
        this.timerMs += 10;
        const seconds = Math.floor(this.timerMs / 1000);
        const ms = Math.floor((this.timerMs % 1000) / 10);

        if (seconds < 60) {
            const display = String(seconds).padStart(2, '0') + String(ms).padStart(2, '0');
            document.getElementById('timer').textContent = display;
        } else {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            const display = String(minutes).padStart(2, '0') + String(secs).padStart(2, '0');
            document.getElementById('timer').textContent = display;
        }
    }

    /**
     * Format time for display
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins > 0) {
            return `${mins}:${String(secs).padStart(2, '0')}`;
        }
        return `${secs}s`;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        const xsRemaining = this.puzzle.xs.size - this.marked.size;
        const xsDisplay = String(xsRemaining).padStart(3, '0');
        document.getElementById('x-counter').textContent = xsDisplay;
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const totalGames = this.stats['4x4'].totalGames + this.stats['6x6'].totalGames;
        const totalWins = this.stats['4x4'].totalWins + this.stats['6x6'].totalWins;
        const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        document.getElementById('total-games').textContent = totalGames;
        document.getElementById('overall-win-rate').textContent = `${overallWinRate}%`;

        this.updateModeStats('4x4');
        this.updateModeStats('6x6');
        this.updateHistoryTable();
    }

    /**
     * Update stats for specific mode
     */
    updateModeStats(mode) {
        const stats = this.stats[mode];
        const modeId = mode === '4x4' ? '4x4' : '6x6';

        document.getElementById(`games-${modeId}`).textContent = stats.totalGames;
        document.getElementById(`wins-losses-${modeId}`).textContent = 
            `${stats.totalWins} / ${stats.totalLosses}`;

        const winRate = stats.totalGames > 0 
            ? Math.round((stats.totalWins / stats.totalGames) * 100)
            : 0;
        document.getElementById(`win-rate-${modeId}`).textContent = `${winRate}%`;

        const bestTimeEl = document.getElementById(`best-time-${modeId}`);
        bestTimeEl.textContent = stats.bestTime ? this.formatTime(stats.bestTime) : '—';
    }

    /**
     * Update game history table
     */
    updateHistoryTable() {
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';

        for (const game of this.stats.history.slice(0, 20)) {
            const row = document.createElement('tr');

            const modeCell = document.createElement('td');
            modeCell.textContent = game.mode;

            const resultCell = document.createElement('td');
            resultCell.textContent = game.result === 'giveup' ? 'Gave Up' : 
                                     game.result === 'win' ? 'Win' : 'Loss';

            const timeCell = document.createElement('td');
            timeCell.textContent = game.time;

            row.appendChild(modeCell);
            row.appendChild(resultCell);
            row.appendChild(timeCell);
            tbody.appendChild(row);
        }
    }

    /**
     * Load stats from localStorage
     */
    loadStats() {
        const stored = localStorage.getItem('no-guess-stats');
        if (stored) {
            return JSON.parse(stored);
        }

        return {
            '4x4': {
                totalGames: 0,
                totalWins: 0,
                totalLosses: 0,
                bestTime: null
            },
            '6x6': {
                totalGames: 0,
                totalWins: 0,
                totalLosses: 0,
                bestTime: null
            },
            history: []
        };
    }

    /**
     * Save stats to localStorage
     */
    saveStats() {
        localStorage.setItem('no-guess-stats', JSON.stringify(this.stats));
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new NoGuessGame();
});
