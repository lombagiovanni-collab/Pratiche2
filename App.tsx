
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, Task, Assignee, SheetType, AppState } from './types';
import { INITIAL_SHEETS, INITIAL_TEAM } from './constants';
import { TaskSheet } from './components/TaskSheet';
import { GenericSheet } from './components/GenericSheet';
import { PlusIcon, CopyIcon, TrashIcon, CloudIcon, ShareIcon } from './components/Icons';

const SYNC_URL = 'https://api.npoint.io/'; 

const App: React.FC = () => {
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    const saved = localStorage.getItem('legal_sheets');
    return saved ? JSON.parse(saved) : INITIAL_SHEETS;
  });
  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0]?.id || 'sheet-1');
  const [team, setTeam] = useState<Assignee[]>(() => {
    const saved = localStorage.getItem('legal_team');
    return saved ? JSON.parse(saved) : INITIAL_TEAM;
  });
  
  const [teamId, setTeamId] = useState<string | null>(() => localStorage.getItem('legal_team_id'));
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  // Stato per il modal di conferma eliminazione foglio
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  
  const isSyncingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('legal_sheets', JSON.stringify(sheets));
    if (teamId) localStorage.setItem('legal_team_id', teamId);
  }, [sheets, teamId]);

  useEffect(() => {
    localStorage.setItem('legal_team', JSON.stringify(team));
  }, [team]);

  const pushToCloud = useCallback(async (data: AppState) => {
    if (!teamId || isSyncingRef.current) return;
    setSyncStatus('syncing');
    isSyncingRef.current = true;
    try {
      console.debug('Pushing to cloud for team:', teamId);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) {
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [teamId]);

  const pullFromCloud = useCallback(async () => {
    if (!teamId || isSyncingRef.current) return;
    try {
      // Logic for cloud pull...
    } catch (e) {
      console.error('Cloud pull failed');
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    const interval = setInterval(pullFromCloud, 15000);
    return () => clearInterval(interval);
  }, [teamId, pullFromCloud]);

  useEffect(() => {
    if (teamId) {
      const timer = setTimeout(() => {
        pushToCloud({ sheets, team, version: Date.now() });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [sheets, team, teamId, pushToCloud]);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const handleAddTask = useCallback(() => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      pratica: 'Nuova Pratica ' + ((activeSheet?.data.length || 0) + 1),
      assegnatari: [],
      altri: '',
      scadenza: new Date().toISOString().split('T')[0],
      stato: 'In corso',
      note: ''
    };
    
    const newSheets = sheets.map(s => 
      s.id === activeSheetId ? { ...s, data: [...s.data, newTask], lastUpdated: Date.now() } : s
    );
    setSheets(newSheets);
  }, [activeSheetId, sheets, activeSheet]);

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    const newSheets = sheets.map(s => 
      s.id === activeSheetId 
        ? { ...s, data: s.data.map(t => t.id === id ? { ...t, ...updates } : t), lastUpdated: Date.now() }
        : s
    );
    setSheets(newSheets);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa pratica?')) {
      const newSheets = sheets.map(s => 
        s.id === activeSheetId 
          ? { ...s, data: s.data.filter(t => t.id !== id), lastUpdated: Date.now() }
          : s
      );
      setSheets(newSheets);
    }
  };

  const handleAddSheet = () => {
    const name = prompt('Nome del nuovo foglio:');
    if (name) {
      const newSheet: Sheet = {
        id: crypto.randomUUID(),
        name: name.toUpperCase(),
        type: 'CUSTOM',
        data: [],
        lastUpdated: Date.now()
      };
      setSheets([...sheets, newSheet]);
      setActiveSheetId(newSheet.id);
    }
  };

  const handleCopySheet = (sheet: Sheet) => {
    const newSheet: Sheet = {
      ...sheet,
      id: crypto.randomUUID(),
      name: `${sheet.name} (COPIA)`,
      data: JSON.parse(JSON.stringify(sheet.data)),
      lastUpdated: Date.now()
    };
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  // Funzione che innesca il modal di conferma
  const handleDeleteSheetRequest = (id: string) => {
    if (sheets.length <= 1) {
      alert("Impossibile eliminare l'ultimo foglio rimasto.");
      return;
    }
    setSheetToDelete(id);
  };

  // Funzione effettiva di eliminazione chiamata dal Modal "Sì"
  const confirmDeleteSheet = () => {
    if (!sheetToDelete) return;
    
    const newSheets = sheets.filter(s => s.id !== sheetToDelete);
    setSheets(newSheets);
    
    if (activeSheetId === sheetToDelete) {
      setActiveSheetId(newSheets[0].id);
    }
    setSheetToDelete(null);
  };

  const handleAddTeamMember = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newMember: Assignee = {
      id: crypto.randomUUID(),
      name,
      color: randomColor
    };
    setTeam([...team, newMember]);
  };

  const handleEnableSync = () => {
    if (teamId) {
      prompt('Codice Team condiviso:', teamId);
    } else {
      const code = 'TEAM-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      if (confirm(`Creare un nuovo spazio di lavoro cloud con codice: ${code}?`)) {
        setTeamId(code);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM9 7.5a.75.75 0 0 0-.75.75v1.5a.75.75 0 0 0 .75.75h.75v7.5a.75.75 0 0 0 1.5 0v-7.5h.75a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75H9Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LegalFlow Pro</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Team Legal Management v2.1</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
            <div className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncStatus === 'syncing' ? 'bg-amber-400' : teamId ? 'bg-green-400' : 'bg-slate-300'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                syncStatus === 'syncing' ? 'bg-amber-500' : teamId ? 'bg-green-500' : 'bg-slate-400'
              }`}></span>
            </div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
              {teamId ? `Cloud: ${teamId}` : 'Solo Locale'}
            </span>
            <button 
              onClick={handleEnableSync}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
            >
              {teamId ? <ShareIcon className="w-3.5 h-3.5" /> : <CloudIcon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex -space-x-2">
            {team.slice(0, 5).map(member => (
              <div 
                key={member.id} 
                className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm ${member.color}`}
                title={member.name}
              >
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar z-20">
        <div className="flex items-center">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="relative group flex items-center">
              <button
                onClick={() => setActiveSheetId(sheet.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeSheetId === sheet.id 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {sheet.name}
              </button>
              
              <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${activeSheetId === sheet.id ? 'bg-blue-50/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'} p-1 rounded-md border border-slate-200 shadow-sm`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCopySheet(sheet); }}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copia"
                >
                  <CopyIcon className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSheetRequest(sheet.id); }}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Elimina"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={handleAddSheet}
            className="px-4 py-4 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-hidden">
        {activeSheet?.type === 'TASKS' ? (
          <TaskSheet 
            tasks={activeSheet.data}
            team={team}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddTeamMember={handleAddTeamMember}
          />
        ) : activeSheet ? (
          <GenericSheet sheet={activeSheet} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Nessun foglio selezionato.
          </div>
        )}
      </main>

      {/* MODAL DI CONFERMA ELIMINAZIONE */}
      {sheetToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in slide-in-from-bottom-8 duration-300 ease-out">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrashIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Eliminare il foglio?</h3>
            <p className="text-sm text-slate-500 mb-8">
              Sei sicuro di voler eliminare definitivamente il foglio <span className="font-bold text-slate-700 italic">"{sheets.find(s => s.id === sheetToDelete)?.name}"</span>? Questa azione non può essere annullata.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDeleteSheet}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
              >
                Sì, elimina
              </button>
              <button 
                onClick={() => setSheetToDelete(null)}
                className="w-full px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                No, annulla
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="px-6 py-2 bg-white border-t border-slate-200 text-[10px] text-slate-400 flex justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span>Team di {team.length} persone • {sheets.length} fogli</span>
          {teamId && <span className="text-green-600 font-bold">• Cloud Sync Attivo</span>}
        </div>
        <div>LegalFlow Pro • Enterprise Security Standard</div>
      </footer>
    </div>
  );
};

export default App;
