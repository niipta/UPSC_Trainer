import React, { useEffect, useState, useMemo } from 'react';
import { Badge, Place, QuizMode, QuizQuestion, QuizResultItem, SRSRecord, StateBoundary, Topic, UserRewards } from './types';
import { HomeScreen } from './components/HomeScreen';
import { TopicMapScreen } from './components/TopicMapScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { AndroidProjectViewer } from './components/AndroidProjectViewer';
import { BadgesModal } from './components/BadgesModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { DidYouKnowPopupModal } from './components/DidYouKnowPopupModal';
import { CelebrationEffects } from './components/CelebrationEffects';
import { generateQuiz, generateStateQuiz } from './utils/quizEngine';
import {
  calculateNextReview,
  generateSRSReviewQuiz,
  getDuePlaces,
  processRewardsAfterQuiz
} from './utils/srsEngine';
import { playFanfare } from './utils/soundEffects';
import { PYQAtlasScreen } from './components/PYQAtlasScreen';
import { MainsCompendiumModal } from './components/MainsCompendiumModal';
import initialStates from './data/india_states.json';
import initialTopics from './data/topics.json';
import { ExamLibraryScreen } from './components/ExamLibraryScreen';

type ActiveScreen = 'HOME' | 'TOPIC_MAP' | 'QUIZ' | 'RESULT' | 'PYQ_ATLAS' | 'EXAM_LIBRARY';

const DEFAULT_REWARDS: UserRewards = {
  xp: 0,
  streakDays: 0,
  lastActiveDate: '',
  badges: {}
};

export default function App() {
  const [states, setStates] = useState<StateBoundary[]>(initialStates as unknown as StateBoundary[]);
  const [topics, setTopics] = useState<Topic[]>(initialTopics as unknown as Topic[]);
  const [loading, setLoading] = useState(false);

  // Navigation State
  const [screen, setScreen] = useState<ActiveScreen>('HOME');
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [initialTopicMode, setInitialTopicMode] = useState<'MAP' | 'TEACHING' | 'DETECTIVE'>('MAP');
  const [initialTopicPlace, setInitialTopicPlace] = useState<Place | null>(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResultItem[]>([]);

  // Persistent Mastery & Stats Map
  const [masteryMap, setMasteryMap] = useState<Record<string, number>>({});
  const [topicStats, setTopicStats] = useState<
    Record<string, { answered: number; correct: number; best: number }>
  >({});

  // Spaced Repetition System (SRS) Records
  const [srsRecords, setSrsRecords] = useState<Record<string, SRSRecord>>({});

  // Rewards, XP & Badges
  const [rewards, setRewards] = useState<UserRewards>(DEFAULT_REWARDS);
  const [lastXpEarned, setLastXpEarned] = useState<number>(0);
  const [lastUnlockedBadges, setLastUnlockedBadges] = useState<Badge[]>([]);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Modals
  const [showAndroidViewer, setShowAndroidViewer] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showDidYouKnowPopup, setShowDidYouKnowPopup] = useState<boolean>(false);
  const [showMainsCompendium, setShowMainsCompendium] = useState<boolean>(false);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setShowDidYouKnowPopup(true);
    }, 4000);

    const interval = setInterval(() => {
      setShowDidYouKnowPopup(true);
    }, 80000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // Compute Due Places for Spaced Repetition Queue
  const duePlaces = useMemo(() => {
    return getDuePlaces(srsRecords, topics);
  }, [srsRecords, topics]);

  // Load LocalStorage synchronously with robust error recovery (100% offline, zero network requests)
  useEffect(() => {
    setLoading(false);

    // Load LocalStorage safely
    try {
      const storedMastery = localStorage.getItem('upsc_map_mastery');
      if (storedMastery) {
        const parsed = JSON.parse(storedMastery);
        if (parsed && typeof parsed === 'object') setMasteryMap(parsed);
      }

      const storedStats = localStorage.getItem('upsc_map_stats');
      if (storedStats) {
        const parsed = JSON.parse(storedStats);
        if (parsed && typeof parsed === 'object') setTopicStats(parsed);
      }

      const storedSRS = localStorage.getItem('upsc_map_srs');
      if (storedSRS) {
        const parsed = JSON.parse(storedSRS);
        if (parsed && typeof parsed === 'object') setSrsRecords(parsed);
      }

      const storedRewards = localStorage.getItem('upsc_map_rewards');
      if (storedRewards) {
        const parsed = JSON.parse(storedRewards);
        if (parsed && typeof parsed === 'object') {
          setRewards({
            ...DEFAULT_REWARDS,
            ...parsed,
            badges: parsed.badges && typeof parsed.badges === 'object' ? parsed.badges : {}
          });
        }
      }
    } catch (e) {
      console.warn('Storage read failed:', e);
    }
  }, []);

  const saveStorage = (
    newMastery: Record<string, number>,
    newStats: typeof topicStats,
    newSRS: Record<string, SRSRecord>,
    newRewards: UserRewards
  ) => {
    setMasteryMap(newMastery);
    setTopicStats(newStats);
    setSrsRecords(newSRS);
    setRewards(newRewards);
    try {
      localStorage.setItem('upsc_map_mastery', JSON.stringify(newMastery));
      localStorage.setItem('upsc_map_stats', JSON.stringify(newStats));
      localStorage.setItem('upsc_map_srs', JSON.stringify(newSRS));
      localStorage.setItem('upsc_map_rewards', JSON.stringify(newRewards));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  };

  const handleStartQuiz = (topic: Topic, mode: QuizMode = 'MIXED', length: number = 10) => {
    const questions = generateQuiz(topic, length, mode, masteryMap);
    setCurrentTopic(topic);
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizStreak(0);
    setQuizResults([]);
    setLastXpEarned(0);
    setLastUnlockedBadges([]);
    setScreen('QUIZ');
  };

  const handleStartStateQuiz = (
    stateName: string,
    topic: Topic,
    mode: QuizMode = 'MIXED',
    length: number = 10
  ) => {
    const questions = generateStateQuiz(stateName, topic, topics, length, mode, masteryMap);
    setCurrentTopic(topic);
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizStreak(0);
    setQuizResults([]);
    setLastXpEarned(0);
    setLastUnlockedBadges([]);
    setScreen('QUIZ');
  };

  const handleStartDailyQuiz = () => {
    if (topics.length === 0) return;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    handleStartQuiz(randomTopic, 'MIXED', 10);
  };

  // Launch Spaced Repetition Due Review
  const handleStartSRSReview = () => {
    if (duePlaces.length === 0) {
      handleStartDailyQuiz();
      return;
    }
    const questions = generateSRSReviewQuiz(duePlaces, topics, 10);
    const primaryTopic = duePlaces[0].topic;
    setCurrentTopic(primaryTopic);
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizStreak(0);
    setQuizResults([]);
    setLastXpEarned(0);
    setLastUnlockedBadges([]);
    setScreen('QUIZ');
  };

  // Launch Clue Investigator directly
  const handleStartClueInvestigator = () => {
    if (topics.length === 0) return;
    const coalTopic = topics.find((t) => t.id === 'coal_fields') || topics[0];
    setCurrentTopic(coalTopic);
    setInitialTopicMode('DETECTIVE');
    setInitialTopicPlace(null);
    setScreen('TOPIC_MAP');
  };

  // Direct location selection from Interactive Progress Bar drilldown
  const handleSelectTopicPlace = (topic: Topic, place: Place) => {
    setCurrentTopic(topic);
    setInitialTopicMode('MAP');
    setInitialTopicPlace(place);
    setScreen('TOPIC_MAP');
  };

  // Record Clue Investigator Quiz Progress
  const handleRecordDetectiveResult = (placeKey: string, isCorrect: boolean, score: number) => {
    const parts = placeKey.split('|');
    const tId = parts[0];
    const placeName = parts[1] || '';

    const updatedMastery = { ...masteryMap };
    const currentVal = updatedMastery[placeKey] || 0;
    updatedMastery[placeKey] = isCorrect ? Math.min(5, currentVal + 1) : Math.max(0, currentVal - 1);
    setMasteryMap(updatedMastery);

    const now = Date.now();
    const updatedSRS = { ...srsRecords };
    const existingSRS = updatedSRS[placeKey];
    const newSRS = calculateNextReview(existingSRS, tId, placeName, isCorrect, now);
    updatedSRS[placeKey] = newSRS;
    setSrsRecords(updatedSRS);

    // Add XP and save rewards
    const xpBonus = Math.max(10, Math.round(score / 5));
    const newRewards = { ...rewards, xp: (rewards?.xp || 0) + xpBonus };
    setRewards(newRewards);

    saveStorage(updatedMastery, topicStats, updatedSRS, newRewards);

    if (isCorrect && score >= 120) {
      setShowCelebration(true);
    }
  };

  const handleAnswerSubmit = (
    userOptionIndex: number,
    userTapLat: number | null,
    userTapLon: number | null,
    isCorrect: boolean,
    distanceKm: number | null,
    hintsUsed?: number,
    hintPenalty?: number
  ) => {
    const q = quizQuestions[quizIndex];
    const item: QuizResultItem = {
      question: q,
      userOptionIndex,
      userTapLat: userTapLat ?? undefined,
      userTapLon: userTapLon ?? undefined,
      isCorrect,
      distanceKm: distanceKm ?? undefined,
      hintsUsed: hintsUsed ?? 0,
      hintPenalty: hintPenalty ?? 0
    };

    const nextResults = [...quizResults, item];
    setQuizResults(nextResults);
    setQuizStreak(isCorrect ? quizStreak + 1 : 0);

    if (quizIndex + 1 >= quizQuestions.length) {
      // Quiz finished - Update mastery, Spaced Repetition intervals & Badges
      const tId = currentTopic ? currentTopic.id : q.topicId;
      const updatedMastery = { ...masteryMap };
      const updatedSRS = { ...srsRecords };

      const now = Date.now();

      nextResults.forEach((res) => {
        const place = res.question.targetPlace;
        if (place) {
          const key = `${tId}|${place.name}`;
          const currentVal = updatedMastery[key] || 0;
          updatedMastery[key] = res.isCorrect
            ? Math.min(5, currentVal + 1)
            : Math.max(0, currentVal - 1);

          // Update SRS Schedule
          const existingSRS = updatedSRS[key];
          const newSRS = calculateNextReview(existingSRS, tId, place.name, res.isCorrect, now);
          updatedSRS[key] = newSRS;
        }
      });

      const currentStats = topicStats[tId] || { answered: 0, correct: 0, best: 0 };
      const sessionCorrect = nextResults.filter((r) => r.isCorrect).length;
      const sessionPercent = Math.round((sessionCorrect * 100) / nextResults.length);

      const updatedStats = {
        ...topicStats,
        [tId]: {
          answered: currentStats.answered + nextResults.length,
          correct: currentStats.correct + sessionCorrect,
          best: Math.max(currentStats.best, sessionPercent)
        }
      };

      // Total all-time correct hits
      const totalAllTimeHits = Object.values(updatedStats).reduce((acc, s) => acc + s.correct, 0);

      // Total hints penalty deducted
      const totalSessionHintPenalty = nextResults.reduce((sum, r) => sum + (r.hintPenalty || 0), 0);

      // Process Badges and Rewards with hint penalty subtracted
      const { updatedRewards, newlyUnlockedBadges, xpEarned } = processRewardsAfterQuiz(
        rewards,
        nextResults,
        totalAllTimeHits,
        updatedSRS,
        topics,
        now,
        totalSessionHintPenalty
      );

      setLastXpEarned(xpEarned);
      setLastUnlockedBadges(newlyUnlockedBadges);

      if (newlyUnlockedBadges.length > 0 || sessionPercent === 100) {
        setShowCelebration(true);
        playFanfare();
      }

      saveStorage(updatedMastery, updatedStats, updatedSRS, updatedRewards);
      setScreen('RESULT');
    } else {
      setQuizIndex(quizIndex + 1);
    }
  };

  const handleRetryMissed = () => {
    const missed = quizResults.filter((r) => !r.isCorrect).map((r) => r.question);
    if (missed.length > 0) {
      setQuizQuestions(missed);
      setQuizIndex(0);
      setQuizStreak(0);
      setQuizResults([]);
      setScreen('QUIZ');
    } else {
      setScreen('HOME');
    }
  };

  const handleResetProgress = () => {
    if (confirm('Are you sure you want to reset all topic mastery, SRS schedules, and rewards?')) {
      setMasteryMap({});
      setTopicStats({});
      setSrsRecords({});
      setRewards(DEFAULT_REWARDS);
      try {
        localStorage.removeItem('upsc_map_mastery');
        localStorage.removeItem('upsc_map_stats');
        localStorage.removeItem('upsc_map_srs');
        localStorage.removeItem('upsc_map_rewards');
      } catch {}
      setScreen('HOME');
    }
  };

  const handleEarnXpBonus = (amount: number = 25) => {
    const updated = {
      ...rewards,
      xp: (rewards?.xp || 0) + amount
    };
    setRewards(updated);
    saveStorage(masteryMap, topicStats, srsRecords, updated);
    setShowCelebration(true);
  };

  const handleReviewFlashcard = (topicId: string, placeName: string, passed: boolean) => {
    const srsKey = `${topicId}|${placeName}`;
    const existing = srsRecords[srsKey];
    const nextRec = calculateNextReview(existing, topicId, placeName, passed);
    const updatedRecords = { ...srsRecords, [srsKey]: nextRec };
    setSrsRecords(updatedRecords);

    const placeKey = `${topicId}|${placeName}`;
    const curMastery = masteryMap[placeKey] || 0;
    const newMastery = passed ? Math.min(5, curMastery + 1) : Math.max(0, curMastery - 1);
    const updatedMastery = { ...masteryMap, [placeKey]: newMastery };
    setMasteryMap(updatedMastery);

    saveStorage(updatedMastery, topicStats, updatedRecords, rewards);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F2EA] flex flex-col items-center justify-center text-[#1F3A4D]">
        <div className="w-12 h-12 rounded-full border-4 border-[#1F3A4D]/15 border-t-[#E07A3F] animate-spin mb-4" />
        <h2 className="font-serif-title text-xl font-bold">UPSC Map Trainer</h2>
        <p className="text-xs text-[#1F3A4D]/60 mt-1">Loading offline boundary polygons & topics...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F2EA] text-[#1F3A4D] font-sans">
      {/* Celebration Confetti Effects */}
      <CelebrationEffects active={showCelebration} onComplete={() => setShowCelebration(false)} />

      {screen === 'HOME' && (
        <HomeScreen
          topics={topics}
          states={states}
          masteryMap={masteryMap}
          srsRecords={srsRecords}
          rewards={rewards}
          dueCount={duePlaces.length}
          topicStats={topicStats}
          onSelectTopic={(t) => {
            setCurrentTopic(t);
            setInitialTopicMode('MAP');
            setInitialTopicPlace(null);
            setScreen('TOPIC_MAP');
          }}
          onSelectTopicPlace={handleSelectTopicPlace}
          onStartDailyQuiz={handleStartDailyQuiz}
          onStartSRSReview={handleStartSRSReview}
          onStartClueInvestigator={handleStartClueInvestigator}
          onStartDetectiveRiddle={handleStartClueInvestigator}
          onResetProgress={handleResetProgress}
          onOpenAndroidViewer={() => setShowAndroidViewer(true)}
          onOpenBadges={() => setShowBadgesModal(true)}
          onEarnXpBonus={handleEarnXpBonus}
          onOpenLeaderboard={() => setShowLeaderboardModal(true)}
          onReviewFlashcard={handleReviewFlashcard}
          onOpenDidYouKnow={() => setShowDidYouKnowPopup(true)}
          onOpenPyqAtlas={() => setScreen('PYQ_ATLAS')}
          onOpenMainsCompendium={() => setShowMainsCompendium(true)}
          onOpenStudyLibrary={() => setScreen('EXAM_LIBRARY')}
        />
      )}

      {screen === 'EXAM_LIBRARY' && <ExamLibraryScreen onBack={() => setScreen('HOME')} />}

      {screen === 'TOPIC_MAP' && currentTopic && (
        <TopicMapScreen
          topic={currentTopic}
          states={states}
          masteryMap={masteryMap}
          allTopics={topics}
          onSelectTopic={(t) => {
            setCurrentTopic(t);
            setInitialTopicPlace(null);
          }}
          onBack={() => setScreen('HOME')}
          onStartQuiz={(t, mode, len) => handleStartQuiz(t, mode, len)}
          onStartStateQuiz={handleStartStateQuiz}
          onRecordDetectiveResult={handleRecordDetectiveResult}
          initialMode={initialTopicMode}
          initialPlace={initialTopicPlace}
          onEarnXpBonus={handleEarnXpBonus}
          onOpenDidYouKnow={() => setShowDidYouKnowPopup(true)}
        />
      )}

      {screen === 'QUIZ' && currentTopic && (
        <QuizScreen
          questions={quizQuestions}
          currentIndex={quizIndex}
          streak={quizStreak}
          results={quizResults}
          states={states}
          onClose={() => setScreen('HOME')}
          onAnswerSubmit={handleAnswerSubmit}
        />
      )}

      {screen === 'RESULT' && currentTopic && (
        <ResultScreen
          topic={currentTopic}
          results={quizResults}
          xpEarned={lastXpEarned}
          newlyUnlockedBadges={lastUnlockedBadges}
          onRetryMissed={handleRetryMissed}
          onDone={() => setScreen('HOME')}
        />
      )}

      {screen === 'PYQ_ATLAS' && (
        <PYQAtlasScreen
          onBack={() => setScreen('HOME')}
          onSelectTopicPlace={handleSelectTopicPlace}
          allTopics={topics}
          onEarnXpBonus={handleEarnXpBonus}
        />
      )}

      {/* Rewards & Badges Showcase Modal */}
      {showBadgesModal && (
        <BadgesModal
          rewards={rewards}
          srsRecords={srsRecords}
          dueCount={duePlaces.length}
          onClose={() => setShowBadgesModal(false)}
          onLaunchSRSReview={handleStartSRSReview}
        />
      )}

      {/* All-India Cadet Leaderboard Modal */}
      {showLeaderboardModal && (
        <LeaderboardModal
          rewards={rewards}
          onClose={() => setShowLeaderboardModal(false)}
          onWatchAdForXp={handleEarnXpBonus}
          onStartSprint={handleStartDailyQuiz}
        />
      )}

      {/* Did You Know Fact Popup Modal */}
      {showDidYouKnowPopup && (
        <DidYouKnowPopupModal
          topics={topics}
          onClose={() => setShowDidYouKnowPopup(false)}
          onSelectTopic={(t) => {
            setCurrentTopic(t);
            setInitialTopicMode('MAP');
            setInitialTopicPlace(null);
            setScreen('TOPIC_MAP');
          }}
          onSelectTopicPlace={handleSelectTopicPlace}
        />
      )}

      {/* Android Architecture & Project Explorer */}
      {showAndroidViewer && (
        <AndroidProjectViewer onClose={() => setShowAndroidViewer(false)} />
      )}

      {/* UPSC Mains Spatial Compendium & Geomorphology Atlas Modal */}
      {showMainsCompendium && (
        <MainsCompendiumModal
          onClose={() => setShowMainsCompendium(false)}
          onOpenDiagramPad={() => {
            setShowMainsCompendium(false);
            setScreen('PYQ_ATLAS');
          }}
          onSelectPlace={(place, topic) => handleSelectTopicPlace(topic, place)}
          allTopics={topics}
        />
      )}
    </main>
  );
};
