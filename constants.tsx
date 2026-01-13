
import { Assignee, Sheet } from './types';

export const INITIAL_TEAM: Assignee[] = [
  { id: '1', name: 'Aurora Agostini', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: '2', name: 'Giulietta Minucci', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: '3', name: 'Alessandro Carlini', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: '4', name: 'Giovanni Lombardi', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: '5', name: 'Beatrice Pedroni', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

export const STATUS_COLORS: Record<string, string> = {
  'In corso': 'bg-blue-500',
  'Completato': 'bg-green-500',
  'In attesa': 'bg-amber-500',
};

const now = Date.now();
export const INITIAL_SHEETS: Sheet[] = [
  { id: 'sheet-1', name: 'TASKS', type: 'TASKS', data: [], lastUpdated: now },
  { id: 'sheet-2', name: 'DUE DILIGENCE', type: 'DUE DILIGENCE', data: [], lastUpdated: now },
  { id: 'sheet-3', name: 'INSIGHT', type: 'INSIGHT', data: [], lastUpdated: now },
  { id: 'sheet-4', name: 'LEXOLOGY', type: 'LEXOLOGY', data: [], lastUpdated: now },
  { id: 'sheet-5', name: 'ATTIVITA MKT', type: 'ATTIVITA MKT', data: [], lastUpdated: now },
  { id: 'sheet-6', name: 'BUSINESS DEVELOPMENT', type: 'BUSINESS DEVELOPMENT', data: [], lastUpdated: now },
  { id: 'sheet-7', name: 'PRICING TOOL', type: 'PRICING TOOL', data: [], lastUpdated: now },
  { id: 'sheet-8', name: 'NORMATIVA', type: 'NORMATIVA', data: [], lastUpdated: now },
];
