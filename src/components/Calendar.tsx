import React, { useMemo } from 'react';
import { DesignPlan } from '../types';

interface Props {
  plans: DesignPlan[];
  currentDate?: Date;
}

const Calendar: React.FC<Props> = ({ plans, currentDate = new Date() }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday

  const days = useMemo(() => {
    const d = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      d.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      d.push(new Date(year, month, i));
    }
    return d;
  }, [year, month, daysInMonth, firstDay]);

  const getPlansForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return plans.filter(p => p.date === dateStr);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">
        {year}年 {month + 1}月
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
        <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-8"></div>;
          
          const dayPlans = getPlansForDate(date);
          const hasPlan = dayPlans.length > 0;
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div 
              key={date.toISOString()} 
              className={`h-10 flex flex-col items-center justify-center rounded relative group cursor-default
                ${isToday ? 'bg-blue-100 font-bold text-blue-700' : 'hover:bg-slate-50'}
                ${hasPlan ? 'border border-blue-200' : ''}
              `}
            >
              <span className="text-sm">{date.getDate()}</span>
              {hasPlan && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5"></div>
              )}
              
              {/* Tooltip for milestones */}
              {hasPlan && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 bg-slate-800 text-white text-xs p-2 rounded z-50 hidden group-hover:block shadow-lg">
                  <div className="font-bold mb-1">{date.toLocaleDateString()}</div>
                  <ul className="list-disc list-inside">
                    {dayPlans.map(p => (
                      <li key={p.id} className="truncate">{p.name}</li>
                    ))}
                  </ul>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;