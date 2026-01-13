
import React from 'react';
import { Sheet } from '../types';

interface Props {
  sheet: Sheet;
}

export const GenericSheet: React.FC<Props> = ({ sheet }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800">{sheet.name}</h2>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">
          Questa sezione è in fase di sviluppo. Utilizza il pannello TASKS per gestire le attività quotidiane del team.
        </p>
      </div>
      <button className="px-6 py-2 bg-slate-800 text-white rounded-full text-sm font-medium hover:bg-slate-900 transition-colors">
        Inizia configurazione
      </button>
    </div>
  );
};
