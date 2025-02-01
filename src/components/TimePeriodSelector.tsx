import React from 'react';
import { Clock } from 'lucide-react';

export type TimePeriod = 30 | 60 | 90 | 120;

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (days: TimePeriod) => void;
}

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Clock className="w-4 h-4 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as TimePeriod)}
        className="form-select block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
      >
        <option value={30}>Last 30 days</option>
        <option value={60}>Last 60 days</option>
        <option value={90}>Last 90 days</option>
        <option value={120}>Last 120 days</option>
      </select>
    </div>
  );
};
