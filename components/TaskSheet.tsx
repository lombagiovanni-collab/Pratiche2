
import React, { useState, useMemo } from 'react';
import { Task, Assignee, Status, SortField, SortOrder } from '../types';
import { STATUS_COLORS } from '../constants';
import { SearchIcon, PlusIcon, UserAddIcon } from './Icons';

interface Props {
  tasks: Task[];
  team: Assignee[];
  onAddTask: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddTeamMember: (name: string) => void;
}

export const TaskSheet: React.FC<Props> = ({ 
  tasks, 
  team, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask,
  onAddTeamMember 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('pratica'); // Default to practice (alphabetical)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      const matchesSearch = t.pratica.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAssignee = filterAssignee === 'all' || t.assegnatari.includes(filterAssignee);
      return matchesSearch && matchesAssignee;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'scadenza') {
        comparison = a.scadenza.localeCompare(b.scadenza);
      } else if (sortField === 'pratica') {
        comparison = a.pratica.localeCompare(b.pratica);
      } else if (sortField === 'assegnatario') {
        const nameA = team.find(u => u.id === a.assegnatari[0])?.name || '';
        const nameB = team.find(u => u.id === b.assegnatari[0])?.name || '';
        comparison = nameA.localeCompare(nameB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchTerm, filterAssignee, sortField, sortOrder, team]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      onAddTeamMember(newMemberName);
      setNewMemberName('');
      setShowAddMember(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cerca pratica..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Filtra:</span>
            <select 
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="all">Tutti gli assegnatari</option>
              {team.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <UserAddIcon className="w-4 h-4" />
              <span>Gestisci Team</span>
            </button>
          </div>
        </div>

        <button 
          onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-shadow shadow-md shadow-blue-200 font-medium text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nuova Pratica</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
            <tr>
              <th 
                className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group/th"
                onClick={() => toggleSort('pratica')}
              >
                Pratica {sortField === 'pratica' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assegnatari
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Altri
              </th>
              <th 
                className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group/th"
                onClick={() => toggleSort('scadenza')}
              >
                Scadenza {sortField === 'scadenza' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Stato
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Note
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400">
                  Nessuna pratica trovata con i filtri correnti.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <input 
                      className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-800"
                      value={task.pratica}
                      onChange={(e) => onUpdateTask(task.id, { pratica: e.target.value })}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {team.map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            const newAssignees = task.assegnatari.includes(member.id)
                              ? task.assegnatari.filter(id => id !== member.id)
                              : [...task.assegnatari, member.id];
                            onUpdateTask(task.id, { assegnatari: newAssignees });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                            task.assegnatari.includes(member.id)
                              ? member.color
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {member.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <input 
                      className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600"
                      placeholder="Libero..."
                      value={task.altri}
                      onChange={(e) => onUpdateTask(task.id, { altri: e.target.value })}
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="date"
                      className="bg-transparent border-none focus:ring-0 text-sm text-slate-600 cursor-pointer"
                      value={task.scadenza}
                      onChange={(e) => onUpdateTask(task.id, { scadenza: e.target.value })}
                    />
                  </td>
                  <td className="p-4">
                    <select
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 cursor-pointer"
                      value={task.stato}
                      onChange={(e) => onUpdateTask(task.id, { stato: e.target.value as Status })}
                    >
                      <option value="In corso">In corso</option>
                      <option value="Completato">Completato</option>
                      <option value="In attesa">In attesa</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <textarea 
                      rows={1}
                      className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 resize-none min-h-[32px]"
                      placeholder="Note libere..."
                      value={task.note}
                      onChange={(e) => onUpdateTask(task.id, { note: e.target.value })}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                      title="Elimina"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nuovo Membro Team</h3>
            <p className="text-sm text-slate-500 mb-6">Inserisci il nome completo per aggiungere un nuovo assegnatario.</p>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input 
                autoFocus
                type="text"
                placeholder="Nome e Cognome"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
