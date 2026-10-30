import React, { useState, useMemo, useCallback, type JSX } from 'react';
import { useLanguage } from '../../lib/i18n/useLanguage';

type QuizCategory = 'historia' | 'personajes' | 'geografia' | 'quechua' | 'cultura' | 'mitologia';
type QuizDifficulty = 'facil' | 'medio' | 'dificil';

interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  explanation: string;
}

interface CategoryInfo {
  key: QuizCategory;
  label: string;
  color: string;
}

interface Props {
  questions: QuizQuestion[];
  categories: CategoryInfo[];
}

type Phase = 'setup' | 'playing' | 'results';

interface AnswerRecord {
  questionId: number;
  selected: number;
  correct: boolean;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizEngine({ questions, categories }: Props): JSX.Element {
  const { t } = useLanguage();

  // Setup state
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedCategories, setSelectedCategories] = useState<Set<QuizCategory>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Playing state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Results state
  const [showReview, setShowReview] = useState(false);

  const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
    facil: t('quiz.easy'),
    medio: t('quiz.medium'),
    dificil: t('quiz.hard'),
  };

  const filteredPool = useMemo(() => {
    let pool = [...questions];
    if (selectedCategories.size > 0) {
      pool = pool.filter((q) => selectedCategories.has(q.category));
    }
    if (selectedDifficulty) {
      pool = pool.filter((q) => q.difficulty === selectedDifficulty);
    }
    return pool;
  }, [questions, selectedCategories, selectedDifficulty]);

  const toggleCategory = useCallback((cat: QuizCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  function startQuiz() {
    const shuffled = shuffle(filteredPool);
    const count = questionCount === 0 ? shuffled.length : Math.min(questionCount, shuffled.length);
    setQuizQuestions(shuffled.slice(0, count));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setAnswers([]);
    setShowReview(false);
    setPhase('playing');
  }

  function checkAnswer() {
    if (selectedAnswer === null) return;
    const current = quizQuestions[currentIndex];
    const correct = selectedAnswer === current.correctIndex;
    if (correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, { questionId: current.id, selected: selectedAnswer, correct }]);
    setIsRevealed(true);
  }

  function nextQuestion() {
    if (currentIndex + 1 >= quizQuestions.length) {
      setPhase('results');
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsRevealed(false);
    }
  }

  function resetQuiz() {
    setPhase('setup');
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setAnswers([]);
    setShowReview(false);
  }

  const catColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.key, c.color));
    return map;
  }, [categories]);

  function getCatLabel(key: string): string {
    return categories.find((c) => c.key === key)?.label || key;
  }

  // ---- SETUP PHASE ----
  if (phase === 'setup') {
    return (
      <div className="space-y-8">
        <h2
          className="text-2xl text-center text-[#d4a843]"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Pachacuti Quiz
        </h2>

        {/* Category selection */}
        <div>
          <p className="text-sm text-[rgba(240,230,211,0.7)] mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
            {t('quiz.categories')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => {
              const active = selectedCategories.has(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className="rounded-lg px-3 py-3 text-sm border transition-colors text-center"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    borderColor: active ? cat.color : `${cat.color}33`,
                    backgroundColor: active ? `${cat.color}25` : 'transparent',
                    color: active ? cat.color : 'rgba(240,230,211,0.7)',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty selection */}
        <div>
          <p className="text-sm text-[rgba(240,230,211,0.7)] mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
            {t('quiz.difficulty')}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedDifficulty(null)}
              className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                selectedDifficulty === null
                  ? 'bg-[#d4a843]/20 border-[#d4a843] text-[#d4a843]'
                  : 'border-[#d4a843]/20 text-[rgba(240,230,211,0.7)] hover:border-[#d4a843]/40'
              }`}
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {t('quiz.all')}
            </button>
            {(['facil', 'medio', 'dificil'] as QuizDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  selectedDifficulty === d
                    ? 'bg-[#d4a843]/20 border-[#d4a843] text-[#d4a843]'
                    : 'border-[#d4a843]/20 text-[rgba(240,230,211,0.7)] hover:border-[#d4a843]/40'
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div>
          <p className="text-sm text-[rgba(240,230,211,0.7)] mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
            {t('quiz.questions')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {[10, 20, 0].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  questionCount === count
                    ? 'bg-[#d4a843]/20 border-[#d4a843] text-[#d4a843]'
                    : 'border-[#d4a843]/20 text-[rgba(240,230,211,0.7)] hover:border-[#d4a843]/40'
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {count === 0 ? t('quiz.all') : count}
              </button>
            ))}
          </div>
        </div>

        {/* Available count + Start */}
        <div className="text-center space-y-4">
          <p className="text-sm text-[rgba(240,230,211,0.4)]" style={{ fontFamily: "'Crimson Text', serif" }}>
            {t('quiz.available', { n: filteredPool.length })}
          </p>
          <button
            onClick={startQuiz}
            disabled={filteredPool.length === 0}
            className="px-8 py-3 rounded-lg bg-[#d4a843] text-[#1a0800] font-bold text-lg transition-colors hover:bg-[#f5d16c] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {t('quiz.start')}
          </button>
        </div>
      </div>
    );
  }

  // ---- PLAYING PHASE ----
  if (phase === 'playing') {
    const current = quizQuestions[currentIndex];
    const total = quizQuestions.length;
    const progress = ((currentIndex + (isRevealed ? 1 : 0)) / total) * 100;

    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[rgba(240,230,211,0.4)]">
            <span style={{ fontFamily: "'Cinzel', serif" }}>
              {t('quiz.questionOf', { current: currentIndex + 1, total })}
            </span>
            <span>{t('quiz.correct', { n: score })}</span>
          </div>
          <div className="h-1.5 bg-[#3a2a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d4a843] transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Category + difficulty badges */}
        <div className="flex gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{
              borderColor: catColorMap.get(current.category) || '#d4a843',
              color: catColorMap.get(current.category) || '#d4a843',
            }}
          >
            {getCatLabel(current.category)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-[#d4a843]/20 text-[rgba(240,230,211,0.4)]">
            {DIFFICULTY_LABELS[current.difficulty]}
          </span>
        </div>

        {/* Question */}
        <p
          className="text-xl text-[#f0e6d3] leading-relaxed"
          style={{ fontFamily: "'Crimson Text', serif" }}
        >
          {current.question}
        </p>

        {/* Answer options */}
        <div className="grid gap-3 sm:grid-cols-2">
          {current.options.map((option, i) => {
            let classes = 'border border-[#d4a843]/20 bg-[#3a2a1a]/30 text-[#f0e6d3]';

            if (isRevealed) {
              if (i === current.correctIndex) {
                classes = 'border-green-500 bg-green-500/10 text-green-300';
              } else if (i === selectedAnswer && i !== current.correctIndex) {
                classes = 'border-red-500 bg-red-500/10 text-red-300';
              } else {
                classes = 'border-[#d4a843]/10 bg-[#3a2a1a]/20 text-[rgba(240,230,211,0.4)]';
              }
            } else if (selectedAnswer === i) {
              classes = 'border-[#d4a843] bg-[#d4a843]/10 text-[#f0e6d3]';
            }

            return (
              <button
                key={i}
                onClick={() => !isRevealed && setSelectedAnswer(i)}
                disabled={isRevealed}
                className={`min-h-[56px] rounded-lg px-4 py-3 text-left transition-colors ${classes}`}
                style={{ fontFamily: "'Crimson Text', serif" }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Check / Next button */}
        {!isRevealed && selectedAnswer !== null && (
          <button
            onClick={checkAnswer}
            className="w-full py-3 rounded-lg bg-[#d4a843] text-[#1a0800] font-bold transition-colors hover:bg-[#f5d16c]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {t('quiz.check')}
          </button>
        )}

        {/* Explanation + Next */}
        {isRevealed && (
          <div className="space-y-4">
            <div className="bg-[#3a2a1a]/20 p-4 rounded-lg">
              <p
                className="text-[rgba(240,230,211,0.7)] italic leading-relaxed"
                style={{ fontFamily: "'Crimson Text', serif" }}
              >
                {current.explanation}
              </p>
            </div>
            <button
              onClick={nextQuestion}
              className="w-full py-3 rounded-lg bg-[#d4a843] text-[#1a0800] font-bold transition-colors hover:bg-[#f5d16c]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {currentIndex + 1 >= total ? t('quiz.seeResults') : t('quiz.next')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- RESULTS PHASE ----
  const total = quizQuestions.length;
  const percentage = Math.round((score / total) * 100);
  const percentColor = percentage >= 80 ? '#d4a843' : percentage >= 50 ? 'rgba(240,230,211,0.7)' : '#f87171';

  // Per-category breakdown
  const catBreakdown = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    answers.forEach((a, i) => {
      const q = quizQuestions[i];
      if (!q) return;
      const cat = q.category;
      const entry = map.get(cat) || { correct: 0, total: 0 };
      entry.total++;
      if (a.correct) entry.correct++;
      map.set(cat, entry);
    });
    return Array.from(map.entries());
  }, [answers, quizQuestions]);

  return (
    <div className="space-y-8 text-center">
      {/* Score */}
      <div>
        <p
          className="text-5xl font-bold mb-2"
          style={{ fontFamily: "'Cinzel', serif", color: '#d4a843' }}
        >
          {score} / {total}
        </p>
        <p
          className="text-2xl font-bold"
          style={{ fontFamily: "'Cinzel', serif", color: percentColor }}
        >
          {percentage}%
        </p>
      </div>

      {/* Category breakdown */}
      {catBreakdown.length > 1 && (
        <div className="space-y-2 max-w-sm mx-auto">
          {catBreakdown.map(([cat, data]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span
                className="text-[rgba(240,230,211,0.7)]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {getCatLabel(cat)}
              </span>
              <span style={{ color: catColorMap.get(cat) || '#d4a843' }}>
                {data.correct}/{data.total}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={resetQuiz}
          className="px-6 py-3 rounded-lg bg-[#d4a843] text-[#1a0800] font-bold transition-colors hover:bg-[#f5d16c]"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {t('quiz.tryAgain')}
        </button>
        <button
          onClick={() => setShowReview(!showReview)}
          className="px-6 py-3 rounded-lg border border-[#d4a843]/30 text-[#d4a843] transition-colors hover:bg-[#d4a843]/10"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {showReview ? t('quiz.hideReview') : t('quiz.reviewAnswers')}
        </button>
      </div>

      {/* Review */}
      {showReview && (
        <div className="space-y-4 text-left mt-6">
          {quizQuestions.map((q, i) => {
            const a = answers[i];
            if (!a) return null;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  a.correct ? 'border-green-500/30' : 'border-red-500/30'
                }`}
              >
                <p
                  className="text-[#f0e6d3] mb-2"
                  style={{ fontFamily: "'Crimson Text', serif" }}
                >
                  {i + 1}. {q.question}
                </p>
                <p className="text-sm text-green-400">
                  {t('quiz.correctAnswer')} {q.options[q.correctIndex]}
                </p>
                {!a.correct && (
                  <p className="text-sm text-red-400">
                    {t('quiz.yourAnswer')} {q.options[a.selected]}
                  </p>
                )}
                <p
                  className="text-sm text-[rgba(240,230,211,0.4)] mt-2 italic"
                  style={{ fontFamily: "'Crimson Text', serif" }}
                >
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
