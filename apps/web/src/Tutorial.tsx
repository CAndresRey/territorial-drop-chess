import React, { useState } from 'react';
import { HelpCircle, X, ChevronLeft, ChevronRight, Crown, Swords, Shield, Target, Zap, ArrowDownCircle } from 'lucide-react';

const SLIDES = [
  {
    icon: <Crown size={40} />,
    title: '¡Bienvenido a TDC!',
    subtitle: 'Territorial Drop Chess',
    content: [
      'Un juego de estrategia para 1–8 jugadores en un tablero de 15×15.',
      'Todos los jugadores actúan al mismo tiempo — los turnos se resuelven simultáneamente.',
      'Tu objetivo: controlar el centro del tablero y eliminar a tus oponentes.',
    ]
  },
  {
    icon: <Target size={40} />,
    title: 'Cómo Jugar',
    subtitle: 'Interacción básica',
    content: [
      '1. Haz clic en una de tus piezas (color propio).',
      '2. Las casillas válidas se iluminarán.',
      '3. Haz clic en una casilla iluminada para mover.',
      '4. Tu acción se envía al servidor y espera a que todos jueguen.',
      '5. Al expirar el timer (o cuando todos envían), se resuelve el turno.',
    ]
  },
  {
    icon: <Swords size={40} />,
    title: 'Tus Piezas',
    subtitle: 'Ejército de 10 unidades',
    content: [
      'K — Rey: 1 casilla cualquier dirección. ¡Si lo pierdes, quedas eliminado!',
      'G — Guardia: 1-2 casillas cualquier dirección (no salta).',
      'R — Torre: Líneas rectas (horizontal/vertical).',
      'B — Alfil: Líneas diagonales.',
      'N — Caballo: Salto en "L" (puede saltar piezas).',
      'P — Peón: Avanza 1 casilla siempre hacia el centro del tablero.',
    ]
  },
  {
    icon: <Zap size={40} />,
    title: 'Mecánicas Especiales',
    subtitle: 'Lo que hace único a TDC',
    content: [
      '⭐ Promoción: Un Peón que entra al centro 5×5 se convierte en Veterano (V).',
      '⚔️ Conflictos: Si dos piezas van a la misma casilla, gana la de mayor valor.',
      '🚫 Anti-Focus Fire: No puedes mover una pieza a donde 2+ oponentes la amenacen.',
      '⏱️ Timer 30s: Si no actúas, pierdes -0.5 puntos por turno.',
    ]
  },
  {
    icon: <ArrowDownCircle size={40} />,
    title: 'Drops y Reserva',
    subtitle: 'Sistema tipo Shogi',
    content: [
      'Cuando capturas una pieza enemiga, va a tu Reserva (barra derecha).',
      'En tu siguiente turno, puedes "soltar" (drop) una pieza de tu reserva.',
      'Para hacer un Drop: haz clic en la pieza de tu reserva, luego en una casilla vacía.',
      'Solo puedes soltar en territorio propio o neutral.',
      'Límite: 1 drop por turno, con 1 turno de cooldown.',
    ]
  },
  {
    icon: <Shield size={40} />,
    title: 'Puntuación y Victoria',
    subtitle: 'Cómo ganar',
    content: [
      '🏆 Capturar piezas otorga puntos según su valor (Rey=7, Guardia=3, Torre=2, etc.).',
      '📍 Controla ≥3 casillas del centro 5×5 para ganar +1 punto por turno.',
      '👑 Si pierdes tu Rey, quedas eliminado.',
      '🔚 La partida termina a la ronda 40 o cuando solo quede un jugador.',
      '🥇 Gana quien tenga más puntos al final.',
    ]
  }
];

interface TutorialProps {
  onClose: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal glass-panel" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="tutorial-close" onClick={onClose}><X size={20} /></button>

        {/* Progress dots */}
        <div className="tutorial-dots">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`tutorial-dot ${i === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="tutorial-icon">{slide.icon}</div>
        <h2 className="tutorial-title">{slide.title}</h2>
        <p className="tutorial-subtitle">{slide.subtitle}</p>
        <ul className="tutorial-content">
          {slide.content.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        {/* Navigation */}
        <div className="tutorial-nav">
          <button
            className="btn tutorial-btn"
            disabled={isFirst}
            onClick={() => setCurrentSlide(c => c - 1)}
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          {isLast ? (
            <button className="btn tutorial-btn tutorial-btn-play" onClick={onClose}>
              ¡A Jugar! 🎮
            </button>
          ) : (
            <button
              className="btn tutorial-btn"
              onClick={() => setCurrentSlide(c => c + 1)}
            >
              Siguiente <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Small floating help button */
export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button className="help-float-btn" onClick={onClick} title="Tutorial / Ayuda">
    <HelpCircle size={22} />
  </button>
);
