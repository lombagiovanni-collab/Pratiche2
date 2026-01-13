
export type Status = 'In corso' | 'Completato' | 'In attesa';

export interface Assignee {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  pratica: string;
  assegnatari: string[]; // IDs of team members
  altri: string;
  scadenza: string;
  stato: Status;
  note: string;
}

export type SheetType = 'TASKS' | 'DUE DILIGENCE' | 'INSIGHT' | 'LEXOLOGY' | 'ATTIVITA MKT' | 'BUSINESS DEVELOPMENT' | 'PRICING TOOL' | 'NORMATIVA' | 'CUSTOM';

export interface Sheet {
  id: string;
  name: string;
  type: SheetType;
  data: any[];
  lastUpdated: number; // Per gestione conflitti cloud
}

export type SortField = 'scadenza' | 'assegnatario' | 'pratica';
export type SortOrder = 'asc' | 'desc';

export interface AppState {
  sheets: Sheet[];
  team: Assignee[];
  version: number;
}
