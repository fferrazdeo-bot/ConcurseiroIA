
import React, { useState } from 'react';
import { AppFile, StudyTopic, ExamProfile, CargoData } from '../types';
import { geminiService } from '../services/geminiService';

interface FileManagerProps {
  files: AppFile[];
  onAddFile: (file: AppFile) => void;
  activeProjectId: string | null;
}

const FileManager: React.FC<FileManagerProps> = ({ files, onAddFile, activeProjectId }) => {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [pendingFile, setPendingFile] = useState<{ base64: string, name: string, cargos: CargoData[] } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'edital' | 'prova') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingText(type === 'edital' ? "Analisando cargos e matérias..." : "Mapeando DNA da prova...");
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      
      try {
        if (type === 'edital') {
          const cargos = await geminiService.analyzeEdital(base64);
          if (cargos.length > 1) {
            setPendingFile({ base64, name: file.name, cargos });
            setLoading(false);
            return;
          } else if (cargos.length === 1) {
            confirmCargo(base64, file.name, cargos[0]);
          } else {
            throw new Error("Não foi possível identificar cargos no edital.");
          }
        } else {
          const result = await geminiService.analyzeExam(base64);
          const newFile: AppFile = {
            id: Math.random().toString(36).substr(2, 9),
            projectId: activeProjectId || '',
            name: file.name,
            type: 'prova',
            base64,
            parsedTopics: result.topics,
            examProfile: result.profile
          };
          onAddFile(newFile);
        }
      } catch (err) {
        alert("Erro ao processar arquivo. Tente novamente.");
        console.error(err);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
    // Limpa o input para permitir subir o mesmo arquivo se necessário
    event.target.value = '';
  };

  const confirmCargo = (base64: string, name: string, cargo: CargoData) => {
    const newFile: AppFile = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: activeProjectId || '',
      name: name,
      type: 'edital',
      base64,
      availableCargos: pendingFile?.cargos,
      selectedCargoName: cargo.name,
      parsedTopics: cargo.topics
    };
    onAddFile(newFile);
    setPendingFile(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Materiais de Estudo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center hover:border-indigo-400 transition-colors relative">
          <input 
            type="file" 
            accept="application/pdf"
            onChange={(e) => handleFileUpload(e, 'edital')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-2">
            <span className="text-4xl">📄</span>
            <h3 className="font-bold text-gray-700">Subir Novo Edital</h3>
            <p className="text-gray-400 text-sm">IA mapeará cargos e pesos por matéria.</p>
          </div>
        </div>

        <div className="bg-white border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center hover:border-indigo-400 transition-colors relative">
          <input 
            type="file" 
            accept="application/pdf"
            onChange={(e) => handleFileUpload(e, 'prova')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-2">
            <span className="text-4xl">📝</span>
            <h3 className="font-bold text-gray-700">Subir Prova Anterior</h3>
            <p className="text-gray-400 text-sm">Gere questões no estilo e dificuldade da banca.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12 bg-indigo-50 rounded-2xl border border-indigo-100 animate-pulse">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="ml-4 text-indigo-700 font-semibold italic">{loadingText}</span>
        </div>
      )}

      {/* Modal de Seleção de Cargo */}
      {pendingFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="p-8 bg-indigo-600 text-white">
              <h3 className="text-2xl font-black">Qual o seu Cargo?</h3>
              <p className="text-indigo-100 text-sm mt-1 opacity-80">Identificamos múltiplos cargos neste edital. Escolha um para filtrar as matérias.</p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
              {pendingFile.cargos.map((cargo) => (
                <button
                  key={cargo.name}
                  onClick={() => confirmCargo(pendingFile.base64, pendingFile.name, cargo)}
                  className="w-full p-5 text-left rounded-2xl border-2 border-slate-50 hover:border-indigo-600 hover:bg-indigo-50 transition-all flex justify-between items-center group"
                >
                  <span className="font-bold text-gray-800 group-hover:text-indigo-700">{cargo.name}</span>
                  <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-black text-slate-400">{cargo.topics.length} matérias</span>
                </button>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setPendingFile(null)} 
                className="px-6 py-2 text-gray-400 font-bold hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Documento / Cargo</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Análise Estratégica</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-gray-700 font-bold">{file.name}</span>
                    {file.selectedCargoName && (
                      <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter">
                        🎯 Cargo: {file.selectedCargoName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${file.type === 'edital' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {file.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {file.type === 'prova' && file.examProfile ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-600">Dificuldade: <span className="text-indigo-600">{file.examProfile.difficulty}</span></span>
                      <p className="text-[10px] text-gray-400 leading-tight italic max-w-xs">{file.examProfile.styleDescription.substring(0, 60)}...</p>
                    </div>
                  ) : file.parsedTopics ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-600">
                        {file.parsedTopics.length} disciplinas mapeadas
                      </span>
                      <div className="flex gap-1">
                        {file.parsedTopics.filter(t => t.isParetoPriority).slice(0, 2).map(t => (
                          <span key={t.subject} className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 border border-amber-200 rounded font-black uppercase">
                            Pareto: {t.subject.substring(0, 8)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-green-600">
                  <div className="flex items-center gap-1 font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span> 
                    Otimizado
                  </div>
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum documento cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileManager;
