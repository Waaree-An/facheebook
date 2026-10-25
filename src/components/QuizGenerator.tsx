import React, { useState } from 'react';
import {
  Plus, RotateCcw, Check, X, ChevronRight, ChevronLeft,
  Lightbulb, Trophy, Clock, Award, Timer, Send, Play,
} from 'lucide-react';
import { ReadingMaterial, QuizQuestion } from '../types';
import { getApiUrl } from '../utils/api';

interface QuizGeneratorProps {
  materials: ReadingMaterial[];
  onClose: () => void;
  /** Called with the XP earned and the number of quizzes completed. */
  onComplete?: (xp: number, quizzes: number) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  hard: 'bg-rose-50 border-rose-200 text-rose-800',
};

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({
  materials,
  onClose,
  onComplete,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  // Set when the server served canned content instead of real Gemini output, so
  // the UI can say so instead of implying the AI authored these questions.
  const [usedFallback, setUsedFallback] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ReadingMaterial | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);

  const generateQuiz = async () => {
    if (!selectedMaterial) return;
    setIsGenerating(true);
    setGenerateError('');
    setUsedFallback(false);

    try {
      const response = await fetch(getApiUrl('/api/ai-generate-quiz'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedMaterial.title,
          subject: selectedMaterial.subject,
          keyTakeaways: selectedMaterial.keyTakeaways,
          notes: selectedMaterial.notesMarkdown || '',
          description: selectedMaterial.description,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate quiz');
      const data = await response.json();

      const quizQuestions = data.questions.map((q: any, index: number) => {
        const type = q.type || 'multiple_choice';
        let correctAnswer = String(q.correctAnswer ?? '');
        // True/False answers may arrive as "True"/"FALSE"/"A" depending on the model.
        if (type === 'true_false') {
          const normalized = correctAnswer.trim().toLowerCase();
          if (normalized === 'true' || normalized === '0' || normalized === 'a') correctAnswer = 'true';
          else if (normalized === 'false' || normalized === '1' || normalized === 'b') correctAnswer = 'false';
        } else if (correctAnswer && !/^\d+$/.test(correctAnswer)) {
          // Match a multiple-choice answer written out as the option text.
          const optionIndex = (q.options || []).findIndex(
            (opt: string) => String(opt).trim().toLowerCase() === correctAnswer.trim().toLowerCase(),
          );
          if (optionIndex >= 0) correctAnswer = String(optionIndex);
        }

        return {
          id: `q_${index}`,
          type,
          question: q.question,
          options: q.options,
          correctAnswer,
          explanation: q.explanation || '',
          sourceMaterialId: selectedMaterial.id,
          sourceMaterialTitle: selectedMaterial.title,
          difficulty: q.difficulty || 'medium',
          points: q.points || 10,
        };
      });

      setQuestions(quizQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSessionStarted(true);
      setSessionCompleted(false);
      setShowExplanation(false);
      // The server falls back to canned questions when Gemini is unreachable.
      setUsedFallback(data?.source === 'fallback');
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!questions[currentQuestionIndex]) return;
    const question = questions[currentQuestionIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: answer }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let score = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((q) => {
      totalPoints += q.points;
      if (answers[q.id] === q.correctAnswer) {
        score += 1;
        earnedPoints += q.points;
      }
    });

    const session = {
      id: `quiz_${Date.now()}`,
      title: `Quiz: ${selectedMaterial?.title}`,
      questions,
      currentQuestionIndex: questions.length - 1,
      answers,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      score: Math.round((score / questions.length) * 100),
      totalPoints,
    };

    setQuizResults(session);
    setSessionCompleted(true);

    const xpReward = 50 + Math.round((session.score / 100) * 50);
    onComplete?.(xpReward, 1);
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSessionCompleted(false);
    setQuizResults(null);
    setShowExplanation(false);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  let correctCount = 0;
  let totalPointsEarned = 0;
  if (sessionCompleted && quizResults) {
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount += 1;
        totalPointsEarned += q.points;
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-300/20 bg-[#111619] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-700/80 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Timer className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="quiz-title" className="text-base font-extrabold leading-tight text-white sm:text-lg">
                AI Practice Quiz
              </h2>
              <p className="mt-1 truncate text-xs text-slate-400">
                Test your knowledge with AI-generated questions
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close quiz" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {/* Material Selection */}
          {!sessionStarted && !sessionCompleted && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-600">Choose study material</span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">AI Generated</span>
              </div>
              <div className="space-y-2">
                {materials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => setSelectedMaterial(mat)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
                      selectedMaterial?.id === mat.id
                        ? 'border-purple-200 bg-purple-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-25'
                    }`}
                  >
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900">{mat.title}</h3>
                      <p className="text-xs text-slate-500">{mat.subject} • {mat.keyTakeaways.length} key takeaways</p>
                    </div>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${selectedMaterial?.id === mat.id ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Play className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">Select a material to generate an AI-powered quiz from its key takeaways and notes.</p>
              {/* The material list only selects a target; the student still has to
                  start the generation, otherwise nothing is ever requested. */}
              <button
                type="button"
                onClick={generateQuiz}
                disabled={!selectedMaterial || isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isGenerating ? 'Generating…' : 'Generate Quiz'}
              </button>
            </div>
          )}

          {/* Generating */}
          {isGenerating && !sessionStarted && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 mb-4 animate-pulse">
                <Lightbulb className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-900">Generating quiz questions...</p>
              <p className="mt-1 text-xs text-slate-500">AI is crafting questions from your study material</p>
            </div>
          )}

          {/* Error */}
          {generateError && !sessionStarted && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
              <p className="text-sm text-rose-900">{generateError}</p>
              <button onClick={() => setGenerateError('')} className="mt-3 text-xs font-bold text-rose-700 underline">Try again</button>
            </div>
          )}

          {/* Active Quiz */}
          {sessionStarted && !sessionCompleted && currentQuestion && (
            <div className="space-y-4">
              {usedFallback && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  These questions are offline sample content — the AI service was unavailable.
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-600">Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{currentQuestion.difficulty}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-lg font-bold text-slate-900 leading-relaxed">{currentQuestion.question}</p>
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <div className="mt-6 space-y-2">
                    {currentQuestion.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(String(idx))}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          answers[currentQuestion.id] === String(idx)
                            ? (answers[currentQuestion.id] === currentQuestion.correctAnswer
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-800')
                            : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-10 text-slate-700'
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                        <span className="flex-1">{option}</span>
                        {answers[currentQuestion.id] === String(idx) && (
                          answers[currentQuestion.id] === currentQuestion.correctAnswer
                            ? <Check className="h-4 w-4 text-emerald-600" />
                            : <RotateCcw className="h-4 w-4 text-rose-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'true_false' && (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAnswer('true')}
                      className={`px-4 py-3 rounded-xl border transition-all ${
                        answers[currentQuestion.id] === 'true'
                          ? (answers[currentQuestion.id] === currentQuestion.correctAnswer
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800')
                          : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-10 text-slate-700'
                      }`}
                    >
                      True
                    </button>
                    <button
                      onClick={() => handleAnswer('false')}
                      className={`px-4 py-3 rounded-xl border transition-all ${
                        answers[currentQuestion.id] === 'false'
                          ? (answers[currentQuestion.id] === currentQuestion.correctAnswer
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800')
                          : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-10 text-slate-700'
                      }`}
                    >
                      False
                    </button>
                  </div>
                )}
              </div>

              {showExplanation && currentQuestion.explanation && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-800 uppercase">Explanation</span>
                  </div>
                  <p className="text-sm text-amber-900">{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="flex gap-3">
                {showExplanation ? (
                  <button
                    onClick={nextQuestion}
                    disabled={currentQuestionIndex + 1 >= questions.length}
                    className="flex-1 min-h-11 rounded-xl bg-purple-600 px-5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    {currentQuestionIndex + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowExplanation(true)}
                    className="flex-1 min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Submit Answer
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  Quit
                </button>
              </div>
            </div>
          )}

          {/* Quiz Results */}
          {sessionCompleted && quizResults && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {quizResults.score >= 80 ? <Trophy className="h-6 w-6 text-amber-500" /> : <Award className="h-6 w-6 text-purple-500" />}
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Quiz Complete!</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">You scored {quizResults.score}%</h3>
                <p className="text-sm text-slate-500">{correctCount} of {questions.length} questions correct</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Score</p>
                  <p className="text-2xl font-black text-slate-900">{quizResults.score}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Points</p>
                  <p className="text-2xl font-black text-slate-900">{totalPointsEarned} / {quizResults.totalPoints}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">XP Earned</p>
                  <p className="text-2xl font-black text-slate-900">{quizResults.score >= 80 ? '100' : quizResults.score >= 60 ? '75' : '50'} ⭐</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Review your answers</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {questions.map((q) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = userAnswer === q.correctAnswer;
                    return (
                      <div key={q.id} className={`p-3 rounded-xl border transition-all ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600">{q.question}</span>
                          <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <p className="text-xs text-slate-700 mb-1">Your answer: {q.options?.[Number(userAnswer)] || userAnswer || 'Not answered'}</p>
                        )}
                        <p className="text-xs text-emerald-800 bg-emerald-100 px-2 py-1 rounded">Correct: {q.options?.[Number(q.correctAnswer)] || q.correctAnswer}</p>
                        {q.explanation && <p className="mt-1 text-xs text-slate-500">{q.explanation}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={restartQuiz}
                  className="flex-1 min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 min-h-11 rounded-xl bg-purple-600 px-5 text-sm font-bold text-white transition hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};