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
        this.timerInterval = null;
        this.timerMs = 0;
        this.gameResult = null; // 'win', 'loss', 'giveup'
        this.incorrectCellIdx = null;
        this.stats = this.loadStats();

        this.initializeUI();
        this.loadNextPuzzle(); // pre-load first puzzle into this.nextPuzzle
    }

    // ── UI Setup ─────────────────────────────────────────────────────────────

    initializeUI() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        document.getElementById('new-puzzle-btn').addEventListener('click', () => this.newPuzzle());
        document.getElementById('give-up-btn').addEventListener('click', () => this.giveUp());
        document.getElementById('face-button').addEventListener('click', () => this.newPuzzle());

        this.updateStats();
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        if (tabName === 'stats') this.updateStats();
    }

    async switchMode(newMode) {
        if (this.gameActive && !confirm('End current game?')) return;
        this.mode = newMode;
        this.nextPuzzle = null; // discard any pre-loaded puzzle for the old mode
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === newMode);
        });
        await this.newPuzzle();
    }

    // ── Puzzle Loading ────────────────────────────────────────────────────────

    /**
     * Pre-load the next puzzle into this.nextPuzzle.
     * NEVER writes to this.puzzle — that's the current game's puzzle.
     */
    async loadNextPuzzle() {
        this.nextPuzzle = await this.generator.getNextPuzzle(this.mode);
    }

    // ── Game Flow ─────────────────────────────────────────────────────────────

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
        this.gameResult = null;
        this.incorrectCellIdx = null;

        // Reset and start the timer immediately when the puzzle appears
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerMs = 0;
        document.getElementById('timer').textContent = '0000';
        this.timerInterval = setInterval(() => this.updateTimer(), 10);

        document.getElementById('face-button').textContent = '🙂';
        document.getElementById('new-puzzle-btn').disabled = false;
        document.getElementById('give-up-btn').disabled = false;

        this.renderBoard();
        this.updateUI();

        // Pre-load next puzzle in background — goes into this.nextPuzzle, never this.puzzle
        setTimeout(() => this.loadNextPuzzle(), 100);
    }

    handleCellClick(index) {
        if (!this.gameActive || this.puzzle.clues[index] !== undefined || this.marked.has(index)) {
            return;
        }

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

        if (this.marked.size === this.puzzle.xs.size) {
            this.endGame('win');
        }
    }

    giveUp() {
        if (!this.gameActive) return;
        this.endGame('giveup');
    }

    endGame(result) {
        this.gameActive = false;
        this.gameResult = result;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        document.getElementById('face-button').textContent = result === 'win' ? '😎' : '😵';

        this.recordGame(result, this.formatTime(this.timerMs));
        this.renderBoard(); // re-render to reveal all X positions
        this.updateStats();
    }

    // ── Board Rendering ───────────────────────────────────────────────────────

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
                // Clue cell — always visible
                cell.classList.add('clue', `clue-${this.puzzle.clues[i]}`);
                cell.textContent = this.puzzle.clues[i];

            } else if (this.gameResult && this.puzzle.xs.has(i)) {
                // Game over: reveal all X positions
                cell.classList.add('revealed', 'is-x');
                if (this.marked.has(i)) {
                    cell.classList.add('correct'); // player got this one right
                }

            } else if (this.gameResult && i === this.incorrectCellIdx) {
                // The wrong cell the player clicked on a loss
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

    // ── Timer ─────────────────────────────────────────────────────────────────

    updateTimer() {
        this.timerMs += 10;
        const seconds = Math.floor(this.timerMs / 1000);
        const ms = Math.floor((this.timerMs % 1000) / 10);

        let display;
        if (seconds < 60) {
            display = String(seconds).padStart(2, '0') + String(ms).padStart(2, '0');
        } else {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            display = String(minutes).padStart(2, '0') + String(secs).padStart(2, '0');
        }
        document.getElementById('timer').textContent = display;
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
    }

    // ── UI Updates ────────────────────────────────────────────────────────────

    updateUI() {
        const xsRemaining = this.puzzle.xs.size - this.marked.size;
        document.getElementById('x-counter').textContent = String(xsRemaining).padStart(3, '0');
    }

    updateStats() {
        const totalGames = this.stats['4x4'].totalGames + this.stats['6x6'].totalGames;
        const totalWins  = this.stats['4x4'].totalWins  + this.stats['6x6'].totalWins;
        const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        document.getElementById('total-games').textContent = totalGames;
        document.getElementById('overall-win-rate').textContent = `${overallWinRate}%`;

        this.updateModeStats('4x4');
        this.updateModeStats('6x6');
        this.updateHistoryTable();
    }

    updateModeStats(mode) {
        const stats = this.stats[mode];
        document.getElementById(`games-${mode}`).textContent = stats.totalGames;
        document.getElementById(`wins-losses-${mode}`).textContent = `${stats.totalWins} / ${stats.totalLosses}`;
        const winRate = stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0;
        document.getElementById(`win-rate-${mode}`).textContent = `${winRate}%`;
        document.getElementById(`best-time-${mode}`).textContent = stats.bestTime ? this.formatTime(stats.bestTime) : '—';
    }

    updateHistoryTable() {
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';
        for (const game of this.stats.history.slice(0, 20)) {
            const row = document.createElement('tr');
            const resultLabel = game.result === 'giveup' ? 'Gave Up' : game.result === 'win' ? 'Win' : 'Loss';
            [game.mode, resultLabel, game.time].forEach(text => {
                const td = document.createElement('td');
                td.textContent = text;
                row.appendChild(td);
            });
            tbody.appendChild(row);
        }
    }

    // ── Stats Persistence ─────────────────────────────────────────────────────

    recordGame(result, timeStr) {
        const modeKey = this.mode;
        this.stats.history.unshift({ mode: modeKey, result, time: timeStr, timestamp: Date.now() });
        this.stats.history = this.stats.history.slice(0, 100);

        const s = this.stats[modeKey];
        s.totalGames++;
        if (result === 'win') {
            s.totalWins++;
            if (!s.bestTime || this.timerMs < s.bestTime) s.bestTime = this.timerMs;
        } else {
            s.totalLosses++;
        }
        this.saveStats();
    }

    loadStats() {
        const stored = localStorage.getItem('no-guess-stats');
        if (stored) return JSON.parse(stored);
        return {
            '4x4': { totalGames: 0, totalWins: 0, totalLosses: 0, bestTime: null },
            '6x6': { totalGames: 0, totalWins: 0, totalLosses: 0, bestTime: null },
            history: []
        };
    }

    saveStats() {
        localStorage.setItem('no-guess-stats', JSON.stringify(this.stats));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new NoGuessGame();
});
