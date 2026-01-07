
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileManager from './components/FileManager';
import Quiz from './components/Quiz';
import { AppFile, ExamAttempt, PerformanceReport, SubjectAnalysis, StudyProject } from './types';
import { geminiService } from './services/geminiService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  // Inicialização Preguiçosa: Carrega direto do localStorage para garantir persistência imediata
  const [currentTab, setCurrentTab] = useState(() => localStorage.getItem('conc_current_tab') || 'dashboard');
  
  const [projects, setProjects] = useState<StudyProject[]>(() => {
    const saved = localStorage.getItem('conc_projects');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Meu Primeiro Concurso', color: '#4f46e5' }];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem('conc_active_project_id');
  });

  const [attempts, setAttempts] = useState<ExamAttempt[]>(() => {
    const saved = localStorage.getItem('conc_attempts');
    return saved ? JSON.parse(saved) : [];
  });

  const [files, setFiles] = useState<AppFile[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [report, setReport] = useState<PerformanceReport>({
    overallAccuracy: 0,
    totalQuestionsAnswered: 0,
    subjects: [],
    aiRecommendations: 'Analizando seu histórico...'
  });

  // Persistência automática da UI (Tab e Projeto Ativo)
  useEffect(() => {
    localStorage.setItem('conc_current_tab', currentTab);
  }, [currentTab]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('conc_active_project_id', activeProjectId);
    }
  }, [activeProjectId]);

  // Carregamento de arquivos (Async do IndexedDB)
  useEffect(() => {
    const initStorage = async () => {
      try {
        const loadedFiles = await storageService.getAllFiles();
        setFiles(loadedFiles);
        
        // Garantir que temos um projeto ativo se houver projetos e nada selecionado
        if (!activeProjectId && projects.length > 0) {
          const firstId = projects[0].id;
          setActiveProjectId(firstId);
          localStorage.setItem('conc_active_project_id', firstId);
        }
      } catch (e) {
        console.error("Erro ao carregar arquivos:", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    initStorage();
  }, [projects, activeProjectId]);

  // Filtros de Contexto
  const filteredFiles = useMemo(() => {
    const targetId = activeProjectId?.trim();
    return files.filter(f => f.projectId?.trim() === targetId);
  }, [files, activeProjectId]);

  const filteredAttempts = useMemo(() => {
    const targetId = activeProjectId?.trim();
    return attempts.filter(a => a.projectId?.trim() === targetId);
  }, [attempts, activeProjectId]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId);
  }, [projects, activeProjectId]);

  // Lógica de Contabilização Ultra-Robusta (Garante o carregamento do Desempenho)
  useEffect(() => {
    if (!isDataLoaded) return;

    const subjectsMap: Record<string, SubjectAnalysis> = {};
    let totalEvaluatedQs = 0; 
    let totalCorrects = 0;
    let absoluteTotal = 0;

    filteredAttempts.forEach(attempt => {
      attempt.questions.forEach(q => {
        absoluteTotal++;
        const subjName = (q.subject || "Geral").trim();
        
        if (!subjectsMap[subjName]) {
          subjectsMap[subjName] = { 
            name: subjName, 
            totalQuestions: 0, 
            correctAnswers: 0, 
            wrongAnswers: 0, 
            accuracy: 0 
          };
        }

        if (q.type === 'flashcard') return; // Flashcards não possuem gabarito para nota

        // Normalização extrema para comparação infalível
        const userRaw = attempt.answers[q.id]?.toString() || "";
        const userAns = userRaw.replace(/[.)\s]/g, '').toUpperCase();
        
        const correctRaw = q.correctOptionId?.toString() || "";
        const correctAns = correctRaw.replace(/[.)\s]/g, '').toUpperCase();
        
        if (!userAns || !correctAns) return;

        const isCorrect = userAns === correctAns;
        
        totalEvaluatedQs++;
        subjectsMap[subjName].totalQuestions++;
        
        if (isCorrect) {
          totalCorrects++;
          subjectsMap[subjName].correctAnswers++;
        } else {
          subjectsMap[subjName].wrongAnswers++;
        }
      });
    });

    const subjectsArray = Object.values(subjectsMap).map(s => ({
      ...s,
      accuracy: s.totalQuestions > 0 ? s.correctAnswers / s.totalQuestions : 0
    })).sort((a, b) => b.totalQuestions - a.totalQuestions);

    setReport(prev => ({
      ...prev,
      overallAccuracy: totalEvaluatedQs > 0 ? totalCorrects / totalEvaluatedQs : 0,
      totalQuestionsAnswered: absoluteTotal,
      subjects: subjectsArray
    }));

    // IA Recomendação (Agora passa os subjects detalhados)
    if (filteredAttempts.length > 0) {
      const getRecommendations = async () => {
        try {
          const recs = await geminiService.getAiRecommendations(subjectsArray);
          setReport(prev => ({ ...prev, aiRecommendations: recs }));
        } catch (e) { console.error(e); }
      };
      getRecommendations();
    } else {
      setReport(prev => ({ ...prev, aiRecommendations: 'Finalize seu primeiro simulado para receber mentoria personalizada da IA!' }));
    }
  }, [filteredAttempts, activeProjectId, isDataLoaded]);

  // Handlers com Persistência Imediata (Auto-save garantido)
  const handleAddProject = useCallback((name: string) => {
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const newProj = { id: Math.random().toString(36).substr(2, 9), name, color: colors[projects.length % colors.length] };
    
    setProjects(prev => {
      const updated = [...prev, newProj];
      localStorage.setItem('conc_projects', JSON.stringify(updated));
      return updated;
    });
    
    setActiveProjectId(newProj.id);
    localStorage.setItem('conc_active_project_id', newProj.id);
  }, [projects]);

  const handleRenameProject = useCallback((id: string, newName: string) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name: newName } : p);
      localStorage.setItem('conc_projects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (!window.confirm("Isso apagará permanentemente todos os materiais e simulados deste concurso. Continuar?")) return;
    
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    localStorage.setItem('conc_projects', JSON.stringify(updatedProjects));

    await storageService.deleteFilesByProject(id);
    setFiles(prev => prev.filter(f => f.projectId !== id));
    
    const updatedAttempts = attempts.filter(a => a.projectId !== id);
    setAttempts(updatedAttempts);
    localStorage.setItem('conc_attempts', JSON.stringify(updatedAttempts));
    
    if (activeProjectId === id) {
      const nextId = updatedProjects[0]?.id || null;
      setActiveProjectId(nextId);
      if (nextId) localStorage.setItem('conc_active_project_id', nextId);
      else localStorage.removeItem('conc_active_project_id');
    }
  }, [projects, attempts, activeProjectId]);

  const handleAddFile = useCallback(async (file: AppFile) => {
    const fileWithProject = { ...file, projectId: activeProjectId?.trim() || 'default' };
    await storageService.saveFile(fileWithProject);
    setFiles(prev => [...prev, fileWithProject]);
  }, [activeProjectId]);

  const handleFinishAttempt = useCallback((attempt: ExamAttempt) => {
    const attemptWithProject = { ...attempt, projectId: activeProjectId?.trim() || 'default' };
    setAttempts(prev => {
      const updated = [attemptWithProject, ...prev];
      localStorage.setItem('conc_attempts', JSON.stringify(updated));
      return updated;
    });
    setCurrentTab('dashboard');
  }, [activeProjectId]);

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="font-black text-indigo-900 uppercase tracking-widest text-xs">Sincronizando Dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar 
        currentTab={currentTab} setTab={setCurrentTab} projects={projects}
        activeProjectId={activeProjectId} setActiveProjectId={setActiveProjectId}
        onAddProject={handleAddProject} onRenameProject={handleRenameProject} onDeleteProject={handleDeleteProject}
      />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto pb-20">
          {activeProject && (
            <div className="mb-6 flex items-center gap-3 animate-fadeIn">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: activeProject.color }}></span>
              <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Contexto Ativo: {activeProject.name}</h1>
            </div>
          )}
          
          {currentTab === 'dashboard' && <Dashboard attempts={filteredAttempts} report={report} onStartStudy={() => setCurrentTab('study')} onGoToFiles={() => setCurrentTab('files')} />}
          {currentTab === 'files' && <FileManager files={filteredFiles} onAddFile={handleAddFile} activeProjectId={activeProjectId} />}
          {currentTab === 'study' && <Quiz key={activeProjectId} files={filteredFiles} onFinish={handleFinishAttempt} onGoToFiles={() => setCurrentTab('files')} />}
          
          {currentTab === 'reports' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8 animate-fadeIn">
              <header className="flex justify-between items-end border-b pb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-800">Análise de Rendimento</h2>
                  <p className="text-gray-500 text-sm">Estatísticas filtradas para {activeProject?.name || "Geral"}</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-indigo-600">{Math.round(report.overallAccuracy * 100)}%</span>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Acerto Geral</p>
                </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {report.subjects.length > 0 ? report.subjects.map(s => (
                  <div key={s.name} className="p-6 border border-gray-100 rounded-2xl bg-slate-50/30 hover:bg-white transition-all">
                    <h4 className="font-bold text-gray-800 mb-4 truncate" title={s.name}>{s.name}</h4>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className={s.accuracy >= 0.7 ? 'text-green-600' : 'text-indigo-600'}>{Math.round(s.accuracy * 100)}% acerto</span>
                      <span className="text-slate-400">{s.correctAnswers}/{s.totalQuestions} questões</span>
                    </div>
                    <div className="h-2.5 bg-slate-200/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${s.accuracy >= 0.7 ? 'bg-green-500' : s.accuracy >= 0.5 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{ width: `${s.accuracy * 100}%` }}></div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center">
                    <span className="text-5xl mb-4">📈</span>
                    <p className="font-medium max-w-xs leading-relaxed text-sm">
                      Ainda não temos dados para gerar o relatório deste concurso. <br/>
                      <span className="text-indigo-600 font-bold cursor-pointer" onClick={() => setCurrentTab('study')}>Realize um simulado agora →</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
