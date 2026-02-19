import { useEffect, useState, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { useTour } from '@/lib/tour-context';
import { Button } from '@/components/ui/button';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const DIALOG_WIDTH = 340;
const DIALOG_PADDING = 16; // gap between spotlight and dialog
const SCREEN_MARGIN = 12;  // min distance from viewport edge

function getDialogPosition(
  spot: SpotlightRect | null,
  preferredPos: string,
  dialogHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!spot || preferredPos === 'center') {
    return {
      top: Math.max(SCREEN_MARGIN, (vh - dialogHeight) / 2),
      left: Math.max(SCREEN_MARGIN, (vw - DIALOG_WIDTH) / 2),
    };
  }

  let top = 0;
  let left = 0;

  switch (preferredPos) {
    case 'bottom':
      top = spot.top + spot.height + DIALOG_PADDING;
      left = spot.left + spot.width / 2 - DIALOG_WIDTH / 2;
      break;
    case 'top':
      top = spot.top - dialogHeight - DIALOG_PADDING;
      left = spot.left + spot.width / 2 - DIALOG_WIDTH / 2;
      break;
    case 'right':
      top = spot.top + spot.height / 2 - dialogHeight / 2;
      left = spot.left + spot.width + DIALOG_PADDING;
      break;
    case 'left':
    default:
      top = spot.top + spot.height / 2 - dialogHeight / 2;
      left = spot.left - DIALOG_WIDTH - DIALOG_PADDING;
      break;
  }

  // Clamp horizontally
  left = Math.max(SCREEN_MARGIN, Math.min(left, vw - DIALOG_WIDTH - SCREEN_MARGIN));

  // Clamp vertically — flip if going off screen
  if (top + dialogHeight > vh - SCREEN_MARGIN) {
    if (preferredPos === 'bottom') {
      top = spot.top - dialogHeight - DIALOG_PADDING;
    } else {
      top = vh - dialogHeight - SCREEN_MARGIN;
    }
  }
  if (top < SCREEN_MARGIN) {
    if (preferredPos === 'top') {
      top = spot.top + spot.height + DIALOG_PADDING;
    } else {
      top = SCREEN_MARGIN;
    }
  }

  return { top, left };
}

export function TourOverlay() {
  const { isActive, step, currentStep, totalSteps, nextStep, prevStep, endTour } = useTour();
  const [spotRect, setSpotRect] = useState<SpotlightRect | null>(null);
  const [dialogPos, setDialogPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);

  const measureAndPosition = useCallback(() => {
    if (!step.targetId) {
      setSpotRect(null);
      return;
    }

    const el = document.querySelector(`[data-tour-id="${step.targetId}"]`) as HTMLElement | null;
    if (!el) {
      setSpotRect(null);
      return;
    }

    if (step.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const rect = el.getBoundingClientRect();
    const PADDING = 6;
    const spot: SpotlightRect = {
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    };
    setSpotRect(spot);
  }, [step.targetId, step.scrollIntoView]);

  // Re-measure after navigation or step change
  useEffect(() => {
    if (!isActive) return;
    // Small delay to let React re-render after navigation
    const timer = setTimeout(measureAndPosition, 120);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, measureAndPosition]);

  // Re-measure on scroll / resize
  useEffect(() => {
    if (!isActive) return;
    const handler = () => measureAndPosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isActive, measureAndPosition]);

  // Position dialog relative to spotlight
  useEffect(() => {
    const dialogHeight = dialogRef.current?.offsetHeight ?? 220;
    const pos = getDialogPosition(spotRect, step.position ?? 'center', dialogHeight);
    setDialogPos(pos);
  }, [spotRect, step.position, currentStep]);

  if (!isActive) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <>
      {/* Dark overlay — transparent when spotlight handles darkness, opaque for center steps */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ backgroundColor: spotRect ? 'transparent' : 'rgba(0,0,0,0.65)' }}
        onClick={endTour}
        aria-hidden="true"
      />

      {/* Spotlight cutout — box-shadow creates the surrounding darkness + highlighted border */}
      {spotRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: spotRect.top,
            left: spotRect.left,
            width: spotRect.width,
            height: spotRect.height,
            zIndex: 9991,
            borderRadius: '10px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            outline: '2px solid hsl(var(--primary))',
            outlineOffset: '1px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Step dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{
          position: 'fixed',
          top: dialogPos.top,
          left: dialogPos.left,
          width: DIALOG_WIDTH,
          zIndex: 9999,
        }}
        className="bg-background border border-border rounded-xl shadow-2xl p-5 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {currentStep === 0 || currentStep === totalSteps - 1
                ? 'Interactive Tour'
                : `Step ${currentStep} of ${totalSteps - 2}`}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1"
            onClick={endTour}
            aria-label="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-semibold text-[15px] leading-snug">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === currentStep
                  ? 'w-4 h-1.5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={isFirst}
            className="gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs"
            onClick={endTour}
          >
            Skip tour
          </Button>

          <Button size="sm" onClick={isLast ? endTour : nextStep} className="gap-1">
            {isLast ? 'Finish' : 'Next'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </>
  );
}
