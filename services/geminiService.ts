
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, StudyTopic, ExamProfile, CargoData, SubjectAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async analyzeEdital(pdfBase64: string): Promise<CargoData[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
            { 
              text: `Você é um Engenheiro de Dados especializado em Editais de Concurso.
              Sua tarefa é extrair o DNA matemático deste concurso.
              
              INSTRUÇÕES CRÍTICAS:
              1. Localize a seção de "QUADRO DE PROVAS", "DA PROVA OBJETIVA" ou tabelas de pontuação.
              2. Para cada CARGO identificado, extraia:
                 - Nome da Disciplina.
                 - Quantidade de Questões (Items).
                 - Peso/Valor de cada questão.
                 - Classificação (Conhecimentos Gerais vs. Específicos).
              3. CALCULE O relevanceScore: (Questões da Matéria * Peso) / (Total de Pontos da Prova) * 100.
              4. Mapeie os subtopics (tópicos a estudar) para cada disciplina.
              
              Retorne um JSON: Array<{name: string, topics: Array<StudyTopic>}>.` 
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              topics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    relevanceScore: { type: Type.INTEGER },
                    isParetoPriority: { type: Type.BOOLEAN },
                    questionCount: { type: Type.INTEGER },
                    knowledgeType: { type: Type.STRING, enum: ["Geral", "Específico"] }
                  },
                  required: ["subject", "subtopics", "relevanceScore", "isParetoPriority", "knowledgeType"]
                }
              }
            },
            required: ["name", "topics"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Erro na extração matemática do edital:", e);
      return [];
    }
  },

  async analyzeExam(pdfBase64: string): Promise<{topics: StudyTopic[], profile: ExamProfile}> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
            { 
              text: `Analise esta prova anterior. Identifique os temas cobrados e o perfil da banca. Retorne JSON.` 
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  relevanceScore: { type: Type.INTEGER },
                  isParetoPriority: { type: Type.BOOLEAN }
                },
                required: ["subject", "subtopics", "relevanceScore", "isParetoPriority"]
              }
            },
            profile: {
              type: Type.OBJECT,
              properties: {
                difficulty: { type: Type.STRING },
                styleDescription: { type: Type.STRING },
                predominantSubjects: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["difficulty", "styleDescription", "predominantSubjects"]
            }
          },
          required: ["topics", "profile"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{"topics":[], "profile":{}}');
    } catch (e) {
      return { topics: [], profile: { difficulty: 'Média', styleDescription: '', predominantSubjects: [] } };
    }
  },

  async generateStudyMaterial(file: { base64: string, type: 'edital' | 'prova' }, subject: string, mode: QuestionType, count: number = 5): Promise<Question[]> {
    const modeDesc = mode === 'multiple' ? 'múltipla escolha' : mode === 'boolean' ? 'certo/errado (Use estritamente "C" para Certo e "E" para Errado no correctOptionId)' : 'flashcard';
    
    let prompt = `Gere ${count} itens de ${modeDesc} sobre "${subject}" baseando-se no documento anexo. 
    REGRAS IMPORTANTES:
    1. Se for múltipla escolha, as opções devem ter IDs 'A', 'B', 'C', 'D', 'E'.
    2. Se for certo/errado, use APENAS 'C' ou 'E' no campo correctOptionId.
    3. Retorne a explicação detalhada do porquê a resposta está correta.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ inlineData: { data: file.base64, mimeType: 'application/pdf' } }, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              subject: { type: Type.STRING },
              topic: { type: Type.STRING },
              statement: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    id: { type: Type.STRING }, 
                    text: { type: Type.STRING } 
                  } 
                } 
              },
              correctOptionId: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["id", "subject", "topic", "statement", "explanation", "options", "correctOptionId"]
          }
        }
      }
    });

    try {
      const results = JSON.parse(response.text || "[]");
      return results.map((r: any) => ({ ...r, type: mode }));
    } catch (e) {
      console.error("Erro ao gerar questões via Gemini:", e);
      return [];
    }
  },

  async getAiRecommendations(subjects: SubjectAnalysis[]): Promise<string> {
    const statsSummary = subjects
      .map(s => `${s.name}: ${Math.round(s.accuracy * 100)}% de acerto (${s.totalQuestions} questões)`)
      .join('\n');

    const prompt = `Você é um Tutor de Concursos de Elite. Analise o desempenho do aluno e forneça orientações estratégicas.
    
    DADOS DO ALUNO:
    ${statsSummary}

    Sua tarefa:
    1. Identifique as matérias com desempenho CRÍTICO (abaixo de 70%).
    2. Para cada matéria crítica, cite o nome dela e dê um conselho pedagógico prático (ex: "Em Português seu desempenho está em 60%. Foque em Sintaxe do Período Composto e faça 20 questões da banca por dia").
    3. Se o desempenho for excelente em tudo (>85%), sugira técnicas de manutenção como Flashcards e revisões espaçadas.
    4. Seja direto, motivador e técnico.
    
    Retorne uma lista de sugestões curtas (máximo 4 itens).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Continue focado nos seus simulados!";
  }
};
