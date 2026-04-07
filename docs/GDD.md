# Game Design Document: Territorial Drop Chess (TDC)

**Territorial Drop Chess (TDC)** is a simultaneous-turn, multi-player strategy game for 4–8 players on a shared 15×15 board. Players command chess-like armies, compete for territory, capture enemy pieces, and drop captured pieces (Shogi-style) to reinforce their positions.

### Core Pillars
- **Simultaneous turns**: All players submit actions secretly, then resolve at once
- **Territory control**: Control squares to score points and enable drops
- **Drop mechanics**: Captured pieces join your reserve and can be deployed
- **Convergent design**: All mechanics push toward the center

### Match Parameters
| Parameter | Value |
|-----------|-------|
| Players | 4–8 |
| Board | 15×15 |
| Rounds | Max 40 |
| Turn timer | 30 seconds |
| Pieces/player | 10 |

---

## 2. Board

### 2.1 Dimensions
The board is a **15×15 grid** (columns A–O, rows 1–15).

### 2.2 Zones

#### Center Zone (5×5)
- Squares F6–J10 (columns 6–10, rows 6–10)
- **+1 point per turn** if a player controls ≥3 center squares
- Pawns entering the center promote to **Veteran (V)**

#### Corner Zones (4×4 each)
Starting positions for 4-player games:
- **NW**: A12–D15 (Player 1)
- **NE**: L12–O15 (Player 2)
- **SE**: L1–O4 (Player 3)
- **SW**: A1–D4 (Player 4)

#### Edge Zones (for 5–8 players)
Additional starting positions on edges:
- **N**: F13–J15 (Player 5)
- **E**: L6–O10 (Player 6)
- **S**: F1–J3 (Player 7)
- **W**: A6–D10 (Player 8)

#### Border Zones
All remaining squares between corners/edges and center.

---

## 3. Pieces

### 3.1 Starting Army (per player)

| Piece | Symbol | Count | Point Value |
|-------|--------|-------|-------------|
| King | K | 1 | 7 |
| Guard | G | 1 | 3 |
| Rook | R | 1 | 2 |
| Knight | N | 1 | 1 |
| Bishop | B | 1 | 1 |
| Pawn | P | 5 | 1 |
| **Total** | | **10** | **16** |

### 3.2 Movement Rules

#### King (K)
- Moves 1 square in any direction (8 directions)
- **Cannot be dropped** 

#### Guard (G)
- Moves 1–2 squares in any direction
- Cannot jump over pieces

#### Rook (R)
- Slides any number of squares horizontally or vertically

#### Bishop (B)
- Slides any number of squares diagonally

#### Knight (N)
- Moves in an L-shape (2+1 squares)
- **Can jump** over other pieces

#### Pawn (P)
- Moves **1 square toward the board center** (radial direction)
- **Captures diagonally** relative to movement direction
- **Promotes to Veteran (V)** upon entering the center 5×5 zone

#### Veteran (V) — Promoted Pawn
- Moves 1 square in any direction
- Worth 2 points (instead of 1)

### 3.3 Starting Positions (4 Players)

**Player 1 (NW Corner)**
Row 15: P P P P (A15–D15)
Row 14: . . . P (D14)
Row 13: . K G . (B13, C13)
Row 12: R N B . (A12, B12, C12)

**Player 2 (NE Corner)**
Row 15: P P P P (L15–O15)
Row 14: P . . . (L14)
Row 13: . G K . (M13, N13)
Row 12: . B N R (M12, N12, O12)

**Player 3 (SE Corner)**
Row 4: . B N R (M4, N4, O4)
Row 3: . G K . (M3, N3)
Row 2: P . . . (L2)
Row 1: P P P P (L1–O1)

**Player 4 (SW Corner)**
Row 4: R N B . (A4, B4, C4)
Row 3: . K G . (B3, C3)
Row 2: . . . P (D2)
Row 1: P P P P (A1–D1)

---

## 4. Turn Structure
**(Same simultaneous logic, 30s timer, conflicts resolved by piece value)**

## 5. Conflict Resolution
1. **Higher value piece wins** (King 7 > Guard 3 > Rook 2 > Minor 1 > Pawn 1)
2. **Equal value**: bounce back.

## 6. Anti-Focus-Fire Rule
A move is **illegal** if it would place your piece on a square where it is **immediately capturable by ≥2 distinct opponents**.

## 7. Drops
1 per turn. Cooldown 1 turn. Drop targets: own territory or neutral squares. No dropping Kings.

## 8. Territory & Scoring
Control if occupied or reachable in 1 move uniquely.
Win condition: 40 rounds or 1 King left.
