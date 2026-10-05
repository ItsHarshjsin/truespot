import React from 'react';

interface StepIndicatorProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unverifiedCount: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  activeTab,
  setActiveTab,
  unverifiedCount,
}) => {
  const steps = [
    { id: 'ask', label: 'Ask', stepNum: 1 },
    { id: 'nearby', label: 'Radar', stepNum: 2 },
    { id: 'report', label: 'Report', stepNum: 3 },
    { id: 'verify', label: 'Verify', stepNum: 4, badge: unverifiedCount },
    { id: 'state', label: 'State', stepNum: 5 },
  ];

  return (
    <div className="px-5 py-2">
      {/* Segmented Pill Selector (Organic Modern Reference) */}
      <div className="bg-white border border-emerald-950/5 rounded-full p-1 shadow-xs flex items-center justify-between">
        {steps.map((step) => {
          const isActive = activeTab === step.id;

          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={`flex-1 py-1.5 px-2 rounded-full text-xs font-semibold transition-all relative text-center ${
                isActive
                  ? 'bg-[#0F3822] text-white shadow-xs'
                  : 'text-[#6B7F72] hover:text-[#11291B]'
              }`}
            >
              <span>{step.label}</span>
              {step.badge !== undefined && step.badge > 0 && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[#7CB342]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
