import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import { TUTORIAL_STEPS } from './tutorial-content';

interface TutorialProps {
  onClose: () => void;
}

export const Tutorial = ({ onClose }: TutorialProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = TUTORIAL_STEPS[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === TUTORIAL_STEPS.length - 1;
  const progress = useMemo(
    () => `${currentSlide + 1}/${TUTORIAL_STEPS.length}`,
    [currentSlide],
  );

  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal glass-panel" onClick={(event) => event.stopPropagation()}>
        <button className="tutorial-close" onClick={onClose} aria-label="Close tutorial">
          <X size={20} />
        </button>

        <div className="tutorial-progress">Tutorial {progress}</div>
        <h2 className="tutorial-title">{slide.title}</h2>
        <p className="tutorial-subtitle">{slide.subtitle}</p>
        <ul className="tutorial-content">
          {slide.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="tutorial-nav">
          <button
            className="btn tutorial-btn"
            disabled={isFirst}
            onClick={() => setCurrentSlide((value) => Math.max(0, value - 1))}
          >
            <ChevronLeft size={16} /> Back
          </button>
          {isLast ? (
            <button className="btn tutorial-btn tutorial-btn-play" onClick={onClose}>
              Start Playing
            </button>
          ) : (
            <button
              className="btn tutorial-btn"
              onClick={() =>
                setCurrentSlide((value) => Math.min(TUTORIAL_STEPS.length - 1, value + 1))
              }
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const HelpButton = ({ onClick }: { onClick: () => void }) => (
  <button className="help-float-btn" onClick={onClick} title="How to play">
    <HelpCircle size={22} />
  </button>
);
