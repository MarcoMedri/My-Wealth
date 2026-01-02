import { useEffect, useRef, useCallback } from 'react';
import Shepherd from 'shepherd.js';
import { useTranslation } from 'react-i18next';
import { getTutorialSteps } from '../lib/tutorialSteps';
import { useSettingsStore } from '../store/useSettingsStore';
import 'shepherd.js/dist/css/shepherd.css';

/**
 * Hook to manage the onboarding tutorial
 * Automatically starts for first-time users
 * Can be manually triggered from Help menu
 */
export function useTutorial() {
  const { t } = useTranslation();
  const tourRef = useRef<Shepherd.Tour | null>(null);
  const { hasCompletedTutorial, setHasCompletedTutorial } = useSettingsStore();

  useEffect(() => {
    // Initialize tour
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true
        }
      }
    });

    // Add steps
    const steps = getTutorialSteps(t);
    steps.forEach(step => tour.addStep(step));

    // Handle completion
    tour.on('complete', () => {
      setHasCompletedTutorial(true);
    });

    tour.on('cancel', () => {
      setHasCompletedTutorial(true);
    });

    tourRef.current = tour;

    return () => {
      if (tourRef.current) {
        tourRef.current.complete();
      }
    };
  }, [t, setHasCompletedTutorial]);

  const startTutorial = useCallback(() => {
    if (tourRef.current) {
      tourRef.current.start();
    }
  }, []);

  return { startTutorial, hasCompletedTutorial };
}
