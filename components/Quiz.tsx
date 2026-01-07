
import React, { useState, useEffect, useMemo } from 'react';
import { Question, ExamAttempt, AppFile, StudyTopic, QuestionType } from '../types';
import { geminiService } from '../services/geminiService';

interface QuizProps {
  files: AppFile[];
  onFinish: (attempt: ExamAttempt) => void;
  onGoToFiles: () => void;
}

const Quiz: React.FC<QuizProps> = ({ files, onFinish, onGoToFiles }) => {
  const [step, setStep] = useState<'config' | 'loading' | 'active' | 'review'>('config');
  const [mode, setMode] = useState<QuestionType>('multiple');
  const [selectedFile, setSelectedFile] = useState<AppFile | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length === 1 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);

  const sortedTopics = useMemo(() => {
    if (!selectedFile?.parsedTopics) return [];
    return [...selectedFile.parsedTopics].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [selectedFile]);

  const startQuiz = async () => {
    if (!selectedFile) return;
    setError(null);
    setStep('loading');
    try {
      const qs = await geminiService.generateStudyMaterial(
        { base64: selectedFile.base64, type: selectedFile.type }, 
        selectedSubject, 
        mode, 
        questionCount
      );
      if (!qs || qs.length === 0) throw new Error("Não foi possível gerar questões.");
      
      // FORÇAR: Garantir que o nome da matéria seja idêntico ao selecionado para agrupar corretamente no Desempenho
      const normalizedQs = qs.map(q => ({ ...q, subject: selectedSubject }));
      
      setQuestions(normalizedQs);
      setStep('active');
    } catch (err: any) {
      setError(err.message);
      setStep('config');
    }
  };

  const handleAnswer = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx].id]: optionId }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setShowExplanation(false);
      setIsFlipped(false);
    } else {
      finish();
    }
  };

  const finish = () => {
    // Cálculo local apenas para o modal/feedback, o App.tsx recalculará para o histórico
    const validQs = questions.filter(q => q.type !== 'flashcard');
    const correctCount = validQs.reduce((acc, q) => acc + (answers[q.id]?.toString().toUpperCase() === q.correctOptionId?.toString().toUpperCase() ? 1 : 0), 0);

    const attempt: ExamAttempt = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: selectedFile?.projectId || '', 
      timestamp: Date.now(),
      questions,
      answers,
      score: validQs.length > 0 ? (correctCount / validQs.length) * 100 : 100,
      mode
    };
    onFinish(attempt);
  };

  if (files.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center bg-white p-10 rounded-3xl shadow-sm border">
        <div className="text-4xl mb-4">📂</div>
        <h2 className="text-xl font-bold text-gray-800">Nenhum material disponível</h2>
        <button onClick={onGoToFiles} className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Adicionar PDF</button>
      </div>
    );
  }

  if (step === 'config') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-800">Configurar Simulado</h2>
          <p className="text-gray-500">Escolha o modo e a disciplina para começar.</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">⚠️ {error}</div>}

        <div className="grid grid-cols-3 gap-4">
          {['multiple', 'boolean', 'flashcard'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as QuestionType)}
              className={`p-4 rounded-2xl border-2 transition-all ${mode === m ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="text-xl">{m === 'multiple' ? '📝' : m === 'boolean' ? '⚖️' : '🎴'}</div>
              <div className="font-bold text-gray-800 text-xs mt-1 capitalize">{m === 'multiple' ? 'Múltipla' : m === 'boolean' ? 'Certo/Errado' : 'Flashcard'}</div>
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-6">
          <select 
            className="w-full p-3 bg-slate-50 rounded-xl border-none font-medium"
            onChange={(e) => {
              const file = files.find(f => f.id === e.target.value);
              setSelectedFile(file || null);
              setSelectedSubject('');
            }}
            value={selectedFile?.id || ""}
          >
            <option value="">Selecione a fonte...</option>
            {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          {selectedFile && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Disciplina</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                {sortedTopics.map(topic => (
                  <button
                    key={topic.subject}
                    onClick={() => setSelectedSubject(topic.subject)}
                    className={`p-3 rounded-xl text-left text-sm transition-all flex justify-between items-center ${selectedSubject === topic.subject ? 'bg-indigo-600 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span className="font-bold">{topic.subject}</span>
                    <span className="text-[10px] opacity-70">{topic.relevanceScore}% da nota</span>
                  </button>
                ))}
              </div>
              <div className="pt-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade: {questionCount}</label>
                <input type="range" min="1" max="20" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full accent-indigo-600" />
              </div>
            </div>
          )}

          <button
            onClick={startQuiz}
            disabled={!selectedFile || !selectedSubject}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black disabled:opacity-30"
          >
            Começar Agora 🚀
          </button>
        </div>
      </div>
    );
  }

  if (step === 'loading') return <div className="text-center py-20"><div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div><p className="font-bold text-gray-700">IA está preparando seu material...</p></div>;

  const currentQ = questions[currentIdx];

  if (mode === 'flashcard') {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="cursor-pointer h-80 w-full" onClick={() => setIsFlipped(!isFlipped)}>
          <div className="bg-white rounded-3xl shadow-sm border p-12 flex flex-col items-center justify-center text-center h-full">
            {!isFlipped ? (
              <p className="text-xl font-bold">{currentQ.statement}</p>
            ) : (
              <div className="animate-fadeIn">
                <p className="text-indigo-600 font-bold mb-4">Resposta:</p>
                <p className="text-gray-700">{currentQ.explanation}</p>
                <button onClick={(e) => { e.stopPropagation(); nextQuestion(); }} className="mt-8 bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold">Próximo</button>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-gray-400 text-xs mt-4">Clique no card para virar</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border">
        <span className="text-xs font-black text-gray-400">Questão {currentIdx + 1} de {questions.length}</span>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold uppercase">{currentQ.subject}</span>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border space-y-8">
        <p className="text-xl font-bold text-gray-800">{currentQ.statement}</p>

        <div className="space-y-3">
          {mode === 'boolean' ? (
            <div className="grid grid-cols-2 gap-4">
              {['C', 'E'].map(opt => {
                const isSelected = answers[currentQ.id] === opt;
                const isCorrect = opt.toUpperCase() === currentQ.correctOptionId?.toUpperCase();
                let cls = "p-5 rounded-2xl font-black border-2 transition-all ";
                if (showExplanation) {
                  if (isCorrect) cls += "bg-green-500 text-white border-transparent";
                  else if (isSelected) cls += "bg-red-500 text-white border-transparent";
                  else cls += "opacity-30 border-gray-100";
                } else {
                  cls += isSelected ? "bg-indigo-600 text-white border-transparent" : "border-gray-100 hover:border-indigo-200";
                }
                return <button key={opt} disabled={showExplanation} onClick={() => handleAnswer(opt)} className={cls}>{opt === 'C' ? 'CERTO' : 'ERRADO'}</button>;
              })}
            </div>
          ) : (
            currentQ.options?.map(opt => {
              const isSelected = answers[currentQ.id] === opt.id;
              const isCorrect = opt.id.toUpperCase() === currentQ.correctOptionId?.toUpperCase();
              let cls = "w-full text-left p-4 rounded-2xl border-2 transition-all flex gap-3 ";
              if (showExplanation) {
                if (isCorrect) cls += "bg-green-500 text-white border-transparent";
                else if (isSelected) cls += "bg-red-500 text-white border-transparent";
                else cls += "opacity-30 border-gray-100";
              } else {
                cls += isSelected ? "bg-indigo-600 text-white border-transparent shadow-lg" : "border-gray-50 hover:border-indigo-100";
              }
              return (
                <button key={opt.id} disabled={showExplanation} onClick={() => handleAnswer(opt.id)} className={cls}>
                  <span className="font-black opacity-50">{opt.id}.</span>
                  <span className="font-medium text-sm">{opt.text}</span>
                </button>
              );
            })
          )}
        </div>

        {showExplanation && (
          <div className="p-6 bg-slate-900 text-white rounded-2xl animate-slideUp">
            <h4 className="text-indigo-400 font-black text-[10px] uppercase mb-2">Comentário da IA</h4>
            <p className="text-sm opacity-90 leading-relaxed mb-6">{currentQ.explanation}</p>
            <button onClick={nextQuestion} className="w-full bg-white text-slate-900 py-3 rounded-xl font-black">Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
