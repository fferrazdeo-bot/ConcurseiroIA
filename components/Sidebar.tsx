
import React, { useState, useRef, useEffect } from 'react';
import { StudyProject } from '../types';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  projects: StudyProject[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  onAddProject: (name: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setTab, 
  projects, 
  activeProjectId, 
  setActiveProjectId,
  onAddProject,
  onRenameProject,
  onDeleteProject
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [tempName, setTempName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((editingId || isAddingNew) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId, isAddingNew]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'files', label: 'Materiais (PDF)', icon: '📁' },
    { id: 'study', label: 'Simulado', icon: '✍️' },
    { id: 'reports', label: 'Desempenho', icon: '📈' },
  ];

  const handleStartEdit = (e: React.MouseEvent, proj: StudyProject) => {
    e.stopPropagation();
    setEditingId(proj.id);
    setTempName(proj.name);
  };

  const handleSaveEdit = () => {
    if (editingId && tempName.trim() !== "") {
      onRenameProject(editingId, tempName.trim());
    }
    setEditingId(null);
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setTempName("");
  };

  const handleSaveAdd = () => {
    if (tempName.trim() !== "") {
      onAddProject(tempName.trim());
    }
    setIsAddingNew(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'edit' | 'add') => {
    if (e.key === 'Enter') {
      type === 'edit' ? handleSaveEdit() : handleSaveAdd();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setIsAddingNew(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, proj: StudyProject) => {
    e.stopPropagation();
    if (window.confirm(`Excluir "${proj.name}"? Materiais e simulados serão perdidos.`)) {
      onDeleteProject(proj.id);
    }
  };

  return (
    <aside className="w-64 bg-white border-r h-screen sticky top-0 hidden md:flex flex-col shadow-sm">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
          <span>🎯</span> ConcurseiroAI
        </h1>
      </div>

      <div className="px-6 mb-6">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Meus Concursos</label>
        <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
          {projects.map(proj => (
            <div key={proj.id} className="group relative">
              {editingId === proj.id ? (
                <input
                  ref={inputRef}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => handleKeyDown(e, 'edit')}
                  className="w-full px-3 py-2 rounded-lg text-sm border-2 border-indigo-500 outline-none shadow-inner"
                />
              ) : (
                <>
                  <button
                    onClick={() => setActiveProjectId(proj.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 pr-12 ${
                      activeProjectId === proj.id 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeProjectId === proj.id ? 'bg-white' : ''}`} style={{ backgroundColor: activeProjectId === proj.id ? 'white' : proj.color }}></span>
                    <span className="truncate">{proj.name}</span>
                  </button>
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleStartEdit(e, proj)}
                      className={`p-1 rounded hover:bg-black/10 transition-colors ${activeProjectId === proj.id ? 'text-white' : 'text-gray-400'}`}
                    >
                      <span className="text-xs">✏️</span>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(e, proj)}
                      className={`p-1 rounded hover:bg-red-500/20 transition-colors ${activeProjectId === proj.id ? 'text-white' : 'text-red-400'}`}
                    >
                      <span className="text-xs">🗑️</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {isAddingNew ? (
            <input
              ref={inputRef}
              placeholder="Nome do concurso..."
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSaveAdd}
              onKeyDown={(e) => handleKeyDown(e, 'add')}
              className="w-full px-3 py-2 rounded-lg text-sm border-2 border-indigo-500 outline-none shadow-inner mt-2"
            />
          ) : (
            <button 
              onClick={handleStartAdd}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 font-bold border-2 border-dashed border-indigo-100 mt-2 transition-colors"
            >
              + Novo Concurso
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-2">Menu Principal</label>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              currentTab === item.id
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-inner'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-6 border-t mt-auto">
        <div className="bg-slate-900 p-4 rounded-xl text-white text-xs">
          <p className="font-bold mb-1">Status da IA</p>
          <div className="flex items-center gap-2 text-green-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            Tutor Ativo
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
