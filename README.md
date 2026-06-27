# No Guess - Logic Puzzle Game

A browser-based logic puzzle game combining elements of Sudoku and Minesweeper. Solve purely through deductive reasoning with no guessing required.

## Game Concept

**No Guess** is a treasure-hunting themed puzzle where you must find hidden X's marked on a grid using only the visibility clues provided. Each numbered clue tells you how many free (non-X) cells it can "see" in the four cardinal directions before hitting an X or grid boundary.

### Key Features

- 🎮 **Two Game Modes**: 4×4 Mini (4 X's) and 6×6 Standard (10 X's)
- 🧩 **Pure Logic**: Every puzzle is uniquely solvable with no guessing
- 📊 **Statistics Tracking**: Track wins, losses, best times per mode
- 🎨 **Classic Design**: Inspired by minesweeper.online with Windows 95-era aesthetics
- 📱 **Responsive**: Works on desktop and mobile devices
- 🔄 **Background Generation**: Next puzzle pre-generates while you play
- ⏱️ **Real-time Gameplay**: Timer starts on first mark, instant feedback on incorrect guesses

## How to Play

1. **Understand the Clues**: Each numbered cell shows how many free cells it can see in all four cardinal directions combined
2. **Mark X's**: Click cells you believe contain treasure (X's)
3. **Win Condition**: Mark all hidden X's correctly to win
4. **Lose Condition**: Mark a free cell incorrectly and lose immediately
5. **Give Up**: Reveal the solution at any time (counts as loss)

### Vision Rules

- Vision travels outward in each cardinal direction (up, down, left, right)
- It counts consecutive free cells until hitting an X or grid boundary
- The X itself is NOT counted
- A clue of 0 means there's an X immediately adjacent in every direction

**Example**: A clue showing "6" might mean:
- 2 cells up before hitting X
- 1 cell down before hitting X
- 0 cells left (X adjacent)
- 3 cells right before hitting X
- Total: 2+1+0+3 = 6

## Puzzle Generation

- Puzzles are **randomly generated on demand**
- Every puzzle is verified to be **uniquely solvable** before presentation
- Uses backtracking constraint solver to ensure validity
- **4×4 Mode**: 4–5 numbered clues with 4 hidden X's
- **6×6 Mode**: 10–12 numbered clues with 10 hidden X's

## Statistics

Track your progress with persistent local statistics:
- Best time per mode
- Total games played and win rate
- Complete game history (last 100 games)
- Mode-specific performance metrics

## Technical Details

### Architecture

- **puzzle.js**: Puzzle generation with random X placement and backtracking solver
- **solver.js**: Constraint-based puzzle solver for verification and hints
- **game.js**: Main game engine, UI management, statistics system
- **styles.css**: Responsive design with Minesweeper-inspired styling
- **index.html**: Game interface and layout

### Key Algorithms

1. **Puzzle Generation**:
   - Random X placement
   - Random clue cell selection
   - Visibility calculation
   - Backtracking verification for unique solvability

2. **Constraint Solving**:
   - Visibility calculation from any position
   - Consistency checking
   - Constraint propagation

3. **Game Flow**:
   - Real-time validation on cell marking
   - Immediate win/loss detection
   - Background puzzle pre-generation

### Statistics Storage

All statistics are stored in browser localStorage under the key `no-guess-stats` as JSON:

```json
{
  "4x4": {
    "totalGames": number,
    "totalWins": number,
    "totalLosses": number,
    "bestTime": milliseconds or null
  },
  "6x6": { ... },
  "history": [
    { "mode": "4x4", "result": "win|loss|giveup", "time": "mm:ss", "timestamp": unix_ms }
  ]
}
```

## Responsive Design

- **Desktop**: Optimized for 6×6 gameplay with clear visibility
- **Tablet**: Scaled cells for comfortable touch input
- **Mobile**: Minimum 40×40px cells, responsive LCD displays
- All controls scale gracefully on narrow screens

## UI Design Elements

### Top Bar
- **Left Panel**: Red LCD-style X counter (remaining X's to find)
- **Center**: Smiley face button (🙂 playing, 😎 win, 😵 loss)
- **Right Panel**: Red LCD-style timer (ss.ms or mm:ss format)

### Game Board
- Classic Windows 95-style 3D inset borders on cells
- Gray raised appearance for hidden cells
- Marked cells show bold ✕ symbol
- Clue cells display number with Minesweeper color coding
- On loss: red highlighting for incorrect cell, green for correct X's, gray for unfound X's
- On win: subtle gold/green tint on correctly marked cells

### Controls
- Mode selector (4×4 vs 6×6)
- New Puzzle button
- Give Up button (subtle styling)
- Tab navigation (Play / Statistics)

## Color Scheme

Minesweeper-inspired number colors:
- 1: Blue
- 2: Green
- 3: Red
- 4: Dark Blue
- 5: Maroon
- 6: Teal
- 7: Black
- 8: Gray

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Hint system with constraint analysis
- Undo/redo functionality
- Daily challenge mode
- Leaderboard system
- Custom difficulty levels
- Puzzle import/export
- Dark mode theme
- Sound effects and notifications

## Development Notes

### Puzzle Uniqueness

Puzzles are verified using a backtracking algorithm that:
1. Tests each possible X placement against clue constraints
2. Prunes branches early if visibility already exceeds target
3. Confirms exactly one solution exists

### Performance Optimization

- Puzzle generation runs in background to maintain responsive UI
- Queue keeps 1+ pre-generated puzzle per mode ready
- Constraint solver uses early pruning to minimize search space

### Statistics Persistence

All game data persists between browser sessions via localStorage. Clear browser storage to reset statistics.

## License

This project is provided as-is for educational and recreational purposes.

## Credits

Game design inspired by:
- Sudoku logic puzzles
- Minesweeper gameplay
- minesweeper.online aesthetics
