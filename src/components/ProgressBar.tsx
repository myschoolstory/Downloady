import React from 'react';

interface ProgressBarProps {
  progress: number;
  message: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  message, 
  color = 'blue',
  className = '' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{message}</span>
        <span className="text-sm font-medium text-gray-500">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out rounded-full relative overflow-hidden`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;