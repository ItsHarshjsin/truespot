import React from 'react';
import { Check } from 'lucide-react';

interface StepProgressFlowProps {
  currentStep: number; // 1 to 5
  totalSteps?: number;
  onSelectStep?: (stepIndex: number) => void;
}

export const StepProgressFlow: React.FC<StepProgressFlowProps> = ({
  currentStep,
  totalSteps = 5,
  onSelectStep,
}) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center py-4 select-none">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {steps.map((step, idx) => {
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;
          const isUpcoming = step > currentStep;

          return (
            <React.Fragment key={step}>
              {/* Connecting Line between steps */}
              {idx > 0 && (
                <div
                  className={`h-[2px] w-5 sm:w-8 rounded-full transition-all duration-300 ${
                    step <= currentStep
                      ? 'bg-purple-600/80 shadow-[0_0_8px_rgba(112,66,248,0.5)]'
                      : 'bg-zinc-800'
                  }`}
                />
              )}

              {/* Step Circle */}
              <button
                type="button"
                onClick={() => onSelectStep && onSelectStep(step)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-[#7042F8] text-white border-2 border-purple-300 shadow-[0_0_20px_rgba(112,66,248,0.9)] scale-110 z-10'
                    : isCompleted
                    ? 'bg-[#181926] text-purple-300 border border-purple-500/40 hover:border-purple-400 hover:scale-105'
                    : 'bg-[#111216] text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                }`}
                title={`Go to Step ${step}`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-purple-300 stroke-[2.5]" />
                ) : (
                  <span>{step}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
