
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ExamAttempt, PerformanceReport } from '../types';

interface DashboardProps {
  attempts: ExamAttempt[];
  report: PerformanceReport;
  onStartStudy: () => void;
  onGoToFiles: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ attempts, report, onStartStudy, onGoToFiles }) => {
  const data = report.subjects.map(s => ({
    name: s.name.length > 12 ? s.name.substring(0, 10) + "..." : s.name,
    accuracy: Math.round(s.accuracy * 100),
    fullName: s.name
  }));

  const COLORS = ['#4f46e5', '#818cf8', '#6366f1', '#4338ca', '#312e81'];

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Boas-vindas, Candidato!</h2>
          <p className="text-gray-500">Acompanhe seu progresso e inicie novos estudos.</p>
        </div>
        <button
          onClick={onStartStudy}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
        >
          <span>🚀</span> Iniciar Novo Estudo
        </button>
      </header>

      <section className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-white/20 p-1 rounded">📖</span> Metodologia Estratégica:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="text-xl font-bold block mb-1">Peso Real</span>
              <p className="text-xs text-indigo-100">IA calcula a relevância baseada na pontuação do edital, não apenas em páginas.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="text-xl font-bold block mb-1">Pareto 80/20</span>
              <p className="text-xs text-indigo-100">Foque nas matérias que garantem o grosso da sua nota primeiro.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="text-xl font-bold block mb-1">Ciclos Curtos</span>
              <p className="text-xs text-indigo-100">Use simulados e flashcards para cobrir o conteúdo de forma dinâmica.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Precisão Média</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-indigo-600">{Math.round(report.overallAccuracy * 100)}%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Itens Respondidos</p>
          <p className="text-4xl font-black text-gray-800 mt-2">{report.totalQuestionsAnswered}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sessões de Estudo</p>
          <p className="text-4xl font-black text-gray-800 mt-2">{attempts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
          <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase text-[10px] tracking-widest text-gray-400 font-black">Domínio por Disciplina</h3>
          <div className="flex-1 w-full min-h-[300px] min-w-0 relative">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10}} 
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}} 
                    formatter={(value: number, name: string, props: any) => [`${value}% de acerto`, props.payload.fullName]}
                  />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} barSize={32}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-50 rounded-xl">
                <span className="text-2xl mb-2">📊</span>
                <p className="text-xs font-bold uppercase tracking-widest">Aguardando seu 1º Simulado</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase text-[10px] tracking-widest text-gray-400 font-black">
            <span>✨</span> Mentoria Estratégica (IA)
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {report.aiRecommendations && report.aiRecommendations !== 'Analizando seu histórico...' ? (
              report.aiRecommendations.split('\n').filter(l => l.trim().length > 5).map((line, i) => (
                <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all shadow-sm group">
                  <span className="text-indigo-500 font-black text-xs mt-1 group-hover:scale-110 transition-transform">0{i+1}</span>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{line.replace(/^[•#-\s*12345.]+/, '')}</p>
                </div>
              ))
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">IA gerando seu plano...</p>
              </div>
            )}
          </div>
          {report.subjects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <p className="text-[9px] text-gray-400 font-bold uppercase">Baseado no seu desempenho em {report.subjects.length} disciplinas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
