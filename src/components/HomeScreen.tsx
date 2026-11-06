import React, { useState } from 'react';
import { Place, SRSRecord, StateBoundary, Topic, UserRewards } from '../types';
import { IndiaSilhouette } from './IndiaSilhouette';
import { getRankForXp } from '../utils/srsEngine';
import { InteractiveProgressBar } from './InteractiveProgressBar';
import { isSoundEnabled, toggleSound } from '../utils/soundEffects';
import { AdBannerWidget } from './AdBannerWidget';
import { BannerAd } from './BannerAd';
import { LeaderboardTeaserCard } from './LeaderboardTeaserCard';
import { DailyFlashcardCard } from './DailyFlashcardCard';
import { SyllabusPathRoadmap } from './SyllabusPathRoadmap';
import { DeepWorkFocusTimer } from './DeepWorkFocusTimer';
import {
  Zap,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Award,
  Flame,
  Clock,
  ShieldCheck,
  Map,
  Compass,
  Sparkles,
  Layers,
  Volume2,
  VolumeX,
  Search,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Target
} from 'lucide-react';

interface HomeScreenProps {
  topics: Topic[];
  states: StateBoundary[];
  masteryMap: Record<string, number>;
  srsRecords: Record<string, SRSRecord>;
  rewards: UserRewards;
  dueCount: number;
  topicStats: Record<string, { answered: number; correct: number; best: number }>;
  onSelectTopic: (topic: Topic) => void;
  onSelectTopicPlace?: (topic: Topic, place: Place) => void;
  onStartDailyQuiz: () => void;
  onStartSRSReview: () => void;
  onStartClueInvestigator?: () => void;
  onStartDetectiveRiddle?: () => void;
  onResetProgress: () => void;
  onOpenAndroidViewer: () => void;
  onOpenBadges: () => void;
  onEarnXpBonus?: (amount?: number) => void;
  onOpenLeaderboard: () => void;
  onReviewFlashcard?: (topicId: string, placeName: string, passed: boolean) => void;
  onOpenDidYouKnow?: () => void;
  onOpenPyqAtlas?: () => void;
  onOpenMainsCompendium?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  topics = [],
  states = [],
  masteryMap = {},
  srsRecords = {},
  rewards = { xp: 0, streakDays: 0, lastActiveDate: '', badges: {} },
  dueCount = 0,
  topicStats = {},
  onSelectTopic,
  onSelectTopicPlace,
  onStartDailyQuiz,
  onStartSRSReview,
  onStartClueInvestigator,
  onStartDetectiveRiddle,
  onResetProgress,
  onOpenAndroidViewer,
  onOpenBadges,
  onEarnXpBonus,
  onOpenLeaderboard,
  onReviewFlashcard,
  onOpenDidYouKnow,
  onOpenPyqAtlas,
  onOpenMainsCompendium
}) => {
  const [homeMode, setHomeMode] = useState<'LEARN' | 'TEST'>('LEARN');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [searchTopicQuery, setSearchTopicQuery] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem('upsc_guide_expanded') === 'true';
    } catch {
      return false;
    }
  });
  const syllabusGroups = [
    'All',
    '⚡ Coal & Energy',
    '🌊 Rivers & Dams',
    '🌿 Ecology & Wetlands',
    '🏛️ History & Culture',
    '🌳 Parks & Wildlife',
    '🏔️ Passes & Rivers'
  ];

  const rank = getRankForXp(rewards?.xp || 0);

  // Overall stats
  let totalAnswered = 0;
  let totalCorrect = 0;
  Object.values(topicStats || {}).forEach((s) => {
    if (s) {
      totalAnswered += s.answered || 0;
      totalCorrect += s.correct || 0;
    }
  });
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect * 100) / totalAnswered) : 0;

  const filteredTopics = topics.filter((t) => {
    let matchGroup = true;
    if (selectedGroup === '⚡ Coal & Energy') {
      matchGroup = ['coal_fields', 'oil_refineries', 'nuclear_power', 'iron_ore', 'bauxite', 'copper_mines'].includes(t.id);
    } else if (selectedGroup === '🌊 Rivers & Dams') {
      matchGroup = ['major_dams', 'ssc_major_dams', 'ssc_major_rivers'].includes(t.id) || t.title.toLowerCase().includes('dam') || t.title.toLowerCase().includes('river');
    } else if (selectedGroup === '🌿 Ecology & Wetlands') {
      matchGroup = ['ramsar_sites', 'national_parks', 'tiger_reserves', 'biosphere_reserves'].includes(t.id);
    } else if (selectedGroup === '🏛️ History & Culture') {
      matchGroup = ['unesco_world_heritage', 'harappan_sites', 'classical_dances', 'major_ports'].includes(t.id);
    } else if (selectedGroup === '🌳 Parks & Wildlife') {
      matchGroup = ['national_parks', 'tiger_reserves', 'biosphere_reserves', 'ssc_national_parks', 'ssc_tiger_reserves'].includes(t.id);
    } else if (selectedGroup === '🏔️ Passes & Rivers') {
      matchGroup = ['mountain_passes', 'ssc_mountain_passes', 'ssc_major_rivers', 'major_dams', 'ssc_major_dams'].includes(t.id) || t.title.toLowerCase().includes('river');
    }

    const matchSearch =
      !searchTopicQuery.trim() ||
      t.title.toLowerCase().includes(searchTopicQuery.toLowerCase()) ||
      t.noun.toLowerCase().includes(searchTopicQuery.toLowerCase()) ||
      t.syllabus.toLowerCase().includes(searchTopicQuery.toLowerCase()) ||
      t.blurb.toLowerCase().includes(searchTopicQuery.toLowerCase());

    return matchGroup && matchSearch;
  });

  // Auto-complete suggestions for Home Screen search bar
  const homeSearchResults = React.useMemo(() => {
    const query = searchTopicQuery.trim().toLowerCase();
    if (!query || query.length < 2) {
      return { topics: [], places: [], states: [] };
    }

    // 1. Matching Topics
    const matchingTopics = topics.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.noun.toLowerCase().includes(query) ||
        t.syllabus.toLowerCase().includes(query) ||
        t.blurb.toLowerCase().includes(query)
    );

    // 2. Matching Places across all topics
    const matchingPlaces: { place: Place; topic: Topic }[] = [];
    const seenPlaces = new Set<string>();

    topics.forEach((t) => {
      t.places.forEach((p) => {
        if (seenPlaces.has(p.name.toLowerCase())) return;
        if (
          p.name.toLowerCase().includes(query) ||
          p.state.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.fact.toLowerCase().includes(query)
        ) {
          seenPlaces.add(p.name.toLowerCase());
          matchingPlaces.push({ place: p, topic: t });
        }
      });
    });

    // 3. Matching States
    const matchingStates = states
      .map((s) => s.name)
      .filter((stName) => stName.toLowerCase().includes(query));

    return {
      topics: matchingTopics.slice(0, 4),
      places: matchingPlaces.slice(0, 8),
      states: matchingStates.slice(0, 4)
    };
  }, [searchTopicQuery, topics, states]);

  const handleToggleAudio = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#1F3A4D] px-4 py-5 max-w-4xl mx-auto pb-28">
      {/* Top Banner Navigation Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#1F3A4D] flex items-center justify-center text-white text-lg shadow-sm">
            🗺️
          </div>
          <div>
            <span className="font-serif-title font-bold text-lg tracking-tight block leading-tight">
              India Map Trainer
            </span>
            <span className="text-[10px] text-[#1F3A4D]/60 font-semibold tracking-wide uppercase">
              SSC · Railway · One-Day Exams
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Orientation & Guide Toggle Button */}
          <button
            onClick={() => {
              setShowGuide((v) => {
                const next = !v;
                try {
                  localStorage.setItem('upsc_guide_dismissed', String(!next));
                } catch {}
                return next;
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs active:scale-95 transition ${
              showGuide
                ? 'bg-[#1F3A4D] text-white border-transparent'
                : 'bg-[#FFFDF9] hover:bg-white text-[#1F3A4D] border-[#1F3A4D]/15'
            }`}
            title="App Orientation & Navigation Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Orientation Guide</span>
          </button>

          {/* Did You Know Fact Popup Button */}
          {onOpenDidYouKnow && (
            <button
              onClick={onOpenDidYouKnow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFFDF9] hover:bg-white text-[#1F3A4D] border border-[#1F3A4D]/15 shadow-xs active:scale-95 transition"
              title="Daily Geography Fact Popup"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Did You Know?</span>
            </button>
          )}

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={handleToggleAudio}
            className="w-8 h-8 rounded-full bg-[#FFFDF9] hover:bg-white text-xs font-bold text-[#1F3A4D] border border-[#1F3A4D]/15 shadow-xs flex items-center justify-center active:scale-95 transition"
            title={soundOn ? 'Sound On (Click to Mute)' : 'Sound Muted (Click to Unmute)'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-[#1F3A4D]/40" />}
          </button>

          {/* Cadet Rank & Badges Button */}
          <button
            onClick={onOpenBadges}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF9] hover:bg-white text-xs font-bold text-[#1F3A4D] border border-[#1F3A4D]/15 shadow-sm active:scale-95 transition"
            title="View Badges & Rewards"
          >
            <span>{rank.badgeEmoji}</span>
            <span className="hidden sm:inline">{rank.name}</span>
            <span className="text-[#E07A3F] font-bold">· {rewards?.xp || 0} XP</span>
            {(rewards?.streakDays || 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[#E07A3F] ml-1">
                <Flame className="w-3.5 h-3.5 fill-[#E07A3F]" />
                {rewards.streakDays}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAndroidViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF9] hover:bg-white text-xs font-semibold text-[#1F3A4D] border border-[#1F3A4D]/15 shadow-sm active:scale-95 transition"
            title="View Native Android Codebase"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#E07A3F]" />
            <span className="hidden sm:inline">Android Code</span>
          </button>
        </div>
      </div>

      {/* Aspirant's Orientation Guide & Navigation Section */}
      {showGuide ? (
        <div className="mb-5 rounded-[26px] bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#F5ECE0] border border-[#1F3A4D]/15 shadow-sm p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#1F3A4D]/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-bold text-sm shadow-xs">
                🧭
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#E07A3F] font-mono block">
                  Aspirant's Orientation Guide
                </span>
                <h2 className="font-serif-title font-bold text-base sm:text-lg text-[#1F3A4D]">
                  How to Navigate the UPSC Map Trainer & Master Geography
                </h2>
              </div>
            </div>

            <button
              onClick={() => {
                setShowGuide(false);
                try {
                  localStorage.setItem('upsc_guide_dismissed', 'true');
                } catch {}
              }}
              className="self-end sm:self-auto text-xs font-semibold text-[#1F3A4D]/60 hover:text-[#1F3A4D] px-2.5 py-1 rounded-lg hover:bg-black/5 transition"
            >
              ✕ Dismiss Guide
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* Feature 1: Interactive Vector Map & States */}
            <div className="p-3.5 rounded-2xl bg-white/85 border border-[#1F3A4D]/10 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-[#1F3A4D]">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs">1</span>
                  <span>🗺️ Interactive Map & State Boundaries</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed mb-1.5">
                  <strong>What it does:</strong> Accurately plots 226 verified coordinates across 16 UPSC syllabus modules on an Equirectangular canvas.
                </p>
                <p className="text-[#1F3A4D]/70 leading-relaxed font-sans">
                  <strong>How to navigate:</strong> Click or tap any Indian state (e.g. Jharkhand, Kerala, Assam) to view all syllabus landmarks clustered in that administrative jurisdiction. Toggle between Vector SVG (crisp, zoomable, state clickable) and Canvas renderer.
                </p>
              </div>
              <button
                onClick={() => topics.length > 0 && onSelectTopic(topics[0])}
                className="mt-3 py-1.5 px-3 rounded-lg bg-[#1F3A4D]/5 hover:bg-[#1F3A4D]/10 text-[#1F3A4D] font-bold text-[11px] self-start transition flex items-center gap-1"
              >
                <span>Explore Map</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Feature 2: UPSC Teaching Dossiers */}
            <div className="p-3.5 rounded-2xl bg-white/85 border border-[#1F3A4D]/10 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-[#1F3A4D]">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">2</span>
                  <span>📖 Complete Teaching Dossiers</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed mb-1.5">
                  <strong>What it does:</strong> In-depth GS Paper 1 & GS Paper 3 notes on geological origin, coalification epochs (Gondwana vs Tertiary), why found there, national production/trade balance, and Prelims trap alerts.
                </p>
                <p className="text-[#1F3A4D]/70 leading-relaxed font-sans">
                  <strong>How to navigate:</strong> Open any topic and tap the <strong>"📖 Teaching"</strong> header tab to access 5 structured modules (Geological Genesis, Economy & Trade, Policies, Prelims Traps, and Place Dossiers).
                </p>
              </div>
              <button
                onClick={() => topics.length > 0 && onSelectTopic(topics[0])}
                className="mt-3 py-1.5 px-3 rounded-lg bg-[#1F3A4D]/5 hover:bg-[#1F3A4D]/10 text-[#1F3A4D] font-bold text-[11px] self-start transition flex items-center gap-1"
              >
                <span>Open Teaching Dossier</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Feature 3: Prelims Clue Investigator */}
            <div className="p-3.5 rounded-2xl bg-white/85 border border-[#1F3A4D]/10 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-[#1F3A4D]">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">3</span>
                  <span>🕵️‍♂️ Prelims Clue Investigator</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed mb-1.5">
                  <strong>What it does:</strong> Reverse deduction mode modelled after UPSC Prelims questions that give 2–3 descriptive statements and ask you to identify the site.
                </p>
                <p className="text-[#1F3A4D]/70 leading-relaxed font-sans">
                  <strong>How to navigate:</strong> Read the classified identity statements, deduce the landmark (asking for -25 pt clues if needed), pinpoint it on the map (within 150 km), and unlock advanced Mains policy facts!
                </p>
              </div>
              {(onStartClueInvestigator || onStartDetectiveRiddle) && (
                <button
                  onClick={onStartClueInvestigator || onStartDetectiveRiddle}
                  className="mt-3 py-1.5 px-3 rounded-lg bg-[#E07A3F]/10 hover:bg-[#E07A3F]/20 text-[#E07A3F] font-bold text-[11px] self-start transition flex items-center gap-1"
                >
                  <span>Launch Clue Investigator</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Feature 4: Spaced Repetition (SRS) & Smart Quizzes */}
            <div className="p-3.5 rounded-2xl bg-white/85 border border-[#1F3A4D]/10 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-[#1F3A4D]">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs">4</span>
                  <span>🔁 Spaced Repetition (SRS) & Quizzes</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed mb-1.5">
                  <strong>What it does:</strong> Automatically schedules items across optimal memory intervals (1d, 3d, 7d, 16d, 35d). Weak locations (mastery 0–2) appear in your Due Queue.
                </p>
                <p className="text-[#1F3A4D]/70 leading-relaxed font-sans">
                  <strong>How to navigate:</strong> Click <strong>"Daily Sprint"</strong> to test recall across 5 question formats. If stuck on any question, tap the <strong>"💡 UPSC Clue Hint"</strong> button (-5 XP penalty).
                </p>
              </div>
              <button
                onClick={onStartDailyQuiz}
                className="mt-3 py-1.5 px-3 rounded-lg bg-[#1F3A4D]/5 hover:bg-[#1F3A4D]/10 text-[#1F3A4D] font-bold text-[11px] self-start transition flex items-center gap-1"
              >
                <span>Start Practice Quiz</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            setShowGuide(true);
            try {
              localStorage.setItem('upsc_guide_dismissed', 'false');
            } catch {}
          }}
          className="mb-4 bg-white/70 hover:bg-white rounded-2xl p-3 border border-[#1F3A4D]/10 flex items-center justify-between transition cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2 text-xs text-[#1F3A4D]">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">New to the app?</span>
            <span className="text-[#1F3A4D]/60 hidden sm:inline">Read the Aspirant's Orientation Guide & Navigation Manual</span>
          </div>
          <button className="text-xs font-bold text-[#E07A3F] flex items-center gap-1">
            <span>Open Guide</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AdSense & AdMob Monetization Banner Bar */}
      <AdBannerWidget onEarnXpBonus={onEarnXpBonus} />

      {/* 🏆 Live All-India Cadet Leaderboard Teaser Card */}
      <LeaderboardTeaserCard
        rewards={rewards}
        onOpenLeaderboard={onOpenLeaderboard}
        onWatchAdForXp={onEarnXpBonus}
      />

      {/* 🧠 Spaced Repetition Daily Flashcard System */}
      <DailyFlashcardCard
        topics={topics}
        srsRecords={srsRecords}
        onReviewCard={(topicId, placeName, passed) => {
          if (onReviewFlashcard) onReviewFlashcard(topicId, placeName, passed);
          if (onEarnXpBonus) onEarnXpBonus(10);
        }}
        onOpenTopicMap={(t, p) => {
          if (onSelectTopicPlace) onSelectTopicPlace(t, p);
          else onSelectTopic(t);
        }}
      />

      {/* ⏳ Deep Work Focus Timer for Map-Based Revision */}
      <DeepWorkFocusTimer
        topics={topics}
        onEarnXpBonus={onEarnXpBonus}
        onOpenTopicMap={(topic) => onSelectTopic(topic)}
        className="mb-5"
      />

      {/* 🏛️ FLAGSHIP 15-YEAR UPSC PYQs SOLVED ATLAS & MAINS DIAGRAM PAD */}
      <div className="mb-5 bg-gradient-to-br from-[#1F3A4D] via-[#2A4C63] to-[#1F3A4D] rounded-[24px] p-4 sm:p-5 text-white shadow-xl border-2 border-amber-400/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-2xl shadow-inner flex-shrink-0">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-[#1F3A4D] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Flagship Module (2011–2025)
                </span>
                <span className="bg-white/10 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  OMR Simulator + Mains Pad
                </span>
              </div>
              <h3 className="font-serif-title font-bold text-lg sm:text-xl text-white mt-1">
                15-Year UPSC PYQs Geospatial Solved Atlas
              </h3>
              <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
                Prelims Geography questions with Official UPSC Keys, Topper Elimination Techniques, Digital OMR Answer Sheet Simulator & Mains GS1 Map Drawing Canvas Pad.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {onOpenMainsCompendium && (
              <button
                type="button"
                onClick={onOpenMainsCompendium}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>📖 Mains Answers</span>
              </button>
            )}

            {onOpenPyqAtlas && (
              <button
                type="button"
                onClick={onOpenPyqAtlas}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-[#E07A3F] hover:from-amber-300 hover:to-[#f08548] text-[#1F3A4D] font-black text-xs sm:text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>Launch 15-Yr Atlas & OMR</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🧭 CLEAR TOP-LEVEL LEARN vs TEST MODE SELECTOR           */}
      {/* ======================================================== */}
      <div className="mb-5 bg-[#FFFDF9] p-1.5 rounded-[24px] border-2 border-[#1F3A4D]/15 shadow-sm flex items-center gap-1.5">
        <button
          onClick={() => setHomeMode('LEARN')}
          className={`flex-1 py-3 px-3 sm:px-5 rounded-[18px] text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            homeMode === 'LEARN'
              ? 'bg-[#1F3A4D] text-white shadow-md scale-[1.01]'
              : 'text-[#1F3A4D]/75 hover:bg-black/5 hover:text-[#1F3A4D]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="tracking-wide">📖 LEARN MODE</span>
          <span className="hidden sm:inline text-[11px] font-normal opacity-80">(Explore & Study Atlas)</span>
        </button>

        <button
          onClick={() => setHomeMode('TEST')}
          className={`flex-1 py-3 px-3 sm:px-5 rounded-[18px] text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            homeMode === 'TEST'
              ? 'bg-[#E07A3F] text-white shadow-md scale-[1.01]'
              : 'text-[#1F3A4D]/75 hover:bg-black/5 hover:text-[#1F3A4D]'
          }`}
        >
          <Target className="w-4 h-4 text-amber-200" />
          <span className="tracking-wide">🎯 TEST MODE</span>
          <span className="hidden sm:inline text-[11px] font-normal opacity-80">(Quizzes, Clues & SRS)</span>
          {dueCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse ml-1" />
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 📖 LEARN MODE HERO & FAST HUBS                           */}
      {/* ======================================================== */}
      {homeMode === 'LEARN' ? (
        <div className="space-y-4 mb-5 animate-in fade-in duration-200">
          {/* Learn Hero Card with Silhouette */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#F3EDE2] border border-emerald-900/15 shadow-sm p-5 sm:p-7">
            <div className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none opacity-20">
              <IndiaSilhouette states={states} fillColor="#1F3A4D" strokeColor="#1F3A4D" />
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-md mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Syllabus Atlas & Knowledge Base</span>
              </div>

              <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#1F3A4D] leading-tight">
                UPSC Civil Services Map Atlas
              </h1>

              <p className="text-xs sm:text-sm text-[#1F3A4D]/80 mt-1.5 leading-relaxed">
                Explore 226 verified syllabus locations, interactive state boundaries, and complete coaching dossiers covering geological origins (Gondwana vs Tertiary), mineral trade balances, and Prelims trap alerts.
              </p>

              {/* Quick Action Buttons for Learn Mode */}
              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <button
                  onClick={() => {
                    if (topics.length > 0) onSelectTopic(topics[0]);
                  }}
                  className="h-11 px-5 rounded-xl bg-[#1F3A4D] hover:bg-[#152734] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
                >
                  <Map className="w-4 h-4 text-emerald-400" />
                  <span>Open Interactive Map Canvas</span>
                </button>

                {topics.length > 0 && (
                  <button
                    onClick={() => onSelectTopic(topics[0])}
                    className="h-11 px-4 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>Read Teaching Dossiers</span>
                  </button>
                )}
              </div>

              {/* Key Metric Pills */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-[#1F3A4D]/10 text-xs font-semibold text-[#1F3A4D]/75">
                <span>📍 <strong>226</strong> Verified Places</span>
                <span className="text-[#1F3A4D]/25">•</span>
                <span>🗺️ <strong>16</strong> Syllabus Modules</span>
                <span className="text-[#1F3A4D]/25">•</span>
                <span>🔬 <strong>Fact-Checked</strong> Coaching Data</span>
              </div>
            </div>
          </div>

          {/* 3 Learn Mode Pillars (Interactive Map, Teaching Dossiers, State Atlas) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => topics.length > 0 && onSelectTopic(topics[0])}
              className="p-4 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#1F3A4D]/30 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm mb-2">
                  🗺️
                </div>
                <h3 className="font-serif-title font-bold text-sm text-[#1F3A4D]">
                  Interactive Vector Map
                </h3>
                <p className="text-xs text-[#1F3A4D]/75 mt-1 leading-relaxed">
                  226 pins plotted on Equirectangular canvas. Tap pins for instant UPSC dossiers on geology, river basins, and PSUs.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-blue-700 flex items-center gap-1">
                <span>Launch Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => topics.length > 0 && onSelectTopic(topics[0])}
              className="p-4 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#1F3A4D]/30 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm mb-2">
                  📖
                </div>
                <h3 className="font-serif-title font-bold text-sm text-[#1F3A4D]">
                  Comprehensive Dossiers
                </h3>
                <p className="text-xs text-[#1F3A4D]/75 mt-1 leading-relaxed">
                  GS Paper 1 & 3 notes: Gondwana vs Tertiary epochs, coalification stages, blast furnace coking coal, and mine fires.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-emerald-700 flex items-center gap-1">
                <span>Study Notes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => topics.length > 0 && onSelectTopic(topics[0])}
              className="p-4 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#1F3A4D]/30 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm mb-2">
                  🏛️
                </div>
                <h3 className="font-serif-title font-bold text-sm text-[#1F3A4D]">
                  State-by-State Atlas
                </h3>
                <p className="text-xs text-[#1F3A4D]/75 mt-1 leading-relaxed">
                  Tap any Indian state (e.g. Jharkhand, Assam, Tamil Nadu) to inspect every syllabus landmark clustered in that state.
                </p>
              </div>
              <span className="mt-3 text-xs font-bold text-purple-700 flex items-center gap-1">
                <span>Browse States</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 🗺️ UPSC Syllabus Path Journey Roadmap */}
          <SyllabusPathRoadmap
            topics={topics}
            masteryMap={masteryMap}
            onSelectTopic={onSelectTopic}
          />

          {/* First-Time Aspirant Primer: Coal, Rivers & Physical Geology */}
          <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-r from-amber-50/90 via-amber-100/40 to-orange-50/80 border border-amber-300/80 shadow-xs text-[#1F3A4D]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-xs">
                💡
              </div>
              <h3 className="font-serif-title font-bold text-sm sm:text-base text-[#1F3A4D]">
                First-Timer Master Note: Coal Fields, Rivers & Physical Geology
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed mt-2">
              <div className="p-3 rounded-xl bg-white/80 border border-amber-200/80">
                <span className="font-bold text-[#E07A3F] block mb-1">
                  ⛏️ Gondwana Coal & River Graben Basins (~98% of reserves)
                </span>
                <p className="text-[#1F3A4D]/85">
                  Formed ~250 million years ago in downfaulted rift valleys along major peninsular rivers:
                  <br />• <strong>Damodar Valley</strong>: Jharia (sole prime coking coal), Bokaro, Raniganj.
                  <br />• <strong>Son & Mahanadi Valleys</strong>: Singrauli (thick seam), Talcher, Korba, Ib Valley.
                  <br />• <strong>Godavari Valley</strong>: Kothagudem (Singareni).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 border border-amber-200/80">
                <span className="font-bold text-[#E07A3F] block mb-1">
                  🌊 Tertiary Lignite & Physical Map Layers (~2% of reserves)
                </span>
                <p className="text-[#1F3A4D]/85">
                  Geologically younger brown coal formed ~15–50 million years ago in ancient coastal & desert basins:
                  <br />• <strong>Neyveli</strong> in the Cauvery coastal plain (Tamil Nadu).
                  <br />• <strong>Palana</strong> in the Thar Desert (Rajasthan).
                  <br />• <em>UPSC Tip</em>: Turn on the <strong>Physical Geography Layer</strong> on the map to trace the blue Damodar River line right through Jharia, Bokaro & Raniganj!
                </p>
              </div>
            </div>
          </div>

          {/* 📚 Offline Study Tips & Map Strategy Guidance */}
          <div className="p-4 sm:p-5 rounded-[24px] bg-[#FFFDF9] border border-[#1F3A4D]/15 shadow-sm text-[#1F3A4D]">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#1F3A4D]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shadow-xs">
                  🎓
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    High-Value UPSC Guidance
                  </span>
                  <h3 className="font-serif-title font-bold text-base sm:text-lg text-[#1F3A4D]">
                    Offline Study Tips & Map Strategy for GS Paper 1 & 3
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Coaching Dossier
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Tip 1 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#E07A3F]/40 transition">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F3A4D] mb-1.5">
                  <span className="text-emerald-700 font-mono font-bold">01.</span>
                  <span>🌊 River-Landmark Spatial Overlay</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed">
                  Always correlate mineral belts, dams, and biosphere reserves with their river drainage basins.
                  <br />• <em>Damodar Valley</em>: Jharia, Bokaro, Raniganj.
                  <br />• <em>Cauvery Delta</em>: Neyveli Lignite.
                </p>
              </div>

              {/* Tip 2 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#E07A3F]/40 transition">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F3A4D] mb-1.5">
                  <span className="text-emerald-700 font-mono font-bold">02.</span>
                  <span>🕵️ Multi-Statement Elimination</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed">
                  UPSC Prelims statements often mix geological formation epochs (Gondwana vs Tertiary) with state borders. Use reverse deduction clues to eliminate wrong options without guessing.
                </p>
              </div>

              {/* Tip 3 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#E07A3F]/40 transition">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F3A4D] mb-1.5">
                  <span className="text-emerald-700 font-mono font-bold">03.</span>
                  <span>🔁 Spaced Repetition (SRS) Intervals</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed">
                  Review weak locations (mastery 0–2) on scheduled review days (1d, 3d, 7d, 16d). Spaced active recall locks coordinates into long-term memory before exam day.
                </p>
              </div>

              {/* Tip 4 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#E07A3F]/40 transition">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F3A4D] mb-1.5">
                  <span className="text-emerald-700 font-mono font-bold">04.</span>
                  <span>✍️ 30-Second GS Mains Maps</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed">
                  Practice sketching rapid peninsular India outlines in GS Paper 1 answers. Plotting 3–4 accurate mineral or river nodes scores +1.5 bonus marks per question!
                </p>
              </div>

              {/* Tip 5 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#E07A3F]/40 transition">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F3A4D] mb-1.5">
                  <span className="text-emerald-700 font-mono font-bold">05.</span>
                  <span>🎯 Offline Active Recall Workflow</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed">
                  Use offline mode during commutes or zero-connectivity study blocks. Daily 10-Question Sprints keep your streak alive and Cadet Rank advancing without internet distraction.
                </p>
              </div>

              {/* Tip 6 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#1F3A4D]/10 shadow-2xs hover:border-[#E07A3F]/40 transition">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F3A4D] mb-1.5">
                  <span className="text-emerald-700 font-mono font-bold">06.</span>
                  <span>💡 Trap Warning: Border Confusion</span>
                </div>
                <p className="text-[#1F3A4D]/80 leading-relaxed">
                  Watch out for near-boundary sites (e.g., Singrauli spans MP/UP; Korba is in CG, NOT MP). Tap state outlines on the vector map to clarify jurisdictional boundaries.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 🎯 TEST MODE HERO & ACTIVE RECALL ENGINES                */
        /* ======================================================== */
        <div className="space-y-4 mb-5 animate-in fade-in duration-200">
          {/* Test Hero Card */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FFFDF9] via-[#FAF4EE] to-[#F6EDE2] border border-[#E07A3F]/25 shadow-sm p-5 sm:p-7">
            <div className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none opacity-20">
              <IndiaSilhouette states={states} fillColor="#E07A3F" strokeColor="#E07A3F" />
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-[#E07A3F] bg-[#E07A3F]/15 px-3 py-1 rounded-md mb-2">
                <Target className="w-3.5 h-3.5" />
                <span>Prelims Exam Simulation & Active Recall</span>
              </div>

              <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#1F3A4D] leading-tight">
                Prelims Test & Clue Arena
              </h1>

              <p className="text-xs sm:text-sm text-[#1F3A4D]/80 mt-1.5 leading-relaxed">
                Simulate authentic UPSC exam pressure with multi-statement reverse clue deduction, daily speed sprints with UPSC hints (-5 XP penalty), and automated Spaced Repetition (SRS).
              </p>

              {/* Action Buttons for Test Mode */}
              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <button
                  onClick={onStartDailyQuiz}
                  className="h-11 px-5 rounded-xl bg-[#E07A3F] hover:bg-[#d46a30] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start Daily Sprint (10 Qs)</span>
                </button>

                {(onStartClueInvestigator || onStartDetectiveRiddle) && (
                  <button
                    onClick={onStartClueInvestigator || onStartDetectiveRiddle}
                    className="h-11 px-5 rounded-xl bg-[#1F3A4D] hover:bg-[#152734] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
                    title="Reverse Deduction: Deduce places from UPSC multi-statement clues and pinpoint them on the map"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>🕵️‍♂️ Launch Clue Investigator</span>
                  </button>
                )}

                {dueCount > 0 && (
                  <button
                    onClick={onStartSRSReview}
                    className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition animate-pulse"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Review {dueCount} Due Items</span>
                  </button>
                )}
              </div>

              {/* Test Metric Stats */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-[#1F3A4D]/10 text-xs font-semibold text-[#1F3A4D]/75">
                <span>🎯 <strong>{accuracy}%</strong> Overall Accuracy</span>
                <span className="text-[#1F3A4D]/25">•</span>
                <span>⚡ <strong>{totalAnswered}</strong> Questions Solved</span>
                <span className="text-[#1F3A4D]/25">•</span>
                <span>🔁 <strong>{dueCount}</strong> SRS Reviews Due</span>
              </div>
            </div>
          </div>

          {/* Spaced Repetition (SRS) Review Queue Card in Test Mode */}
          <div className="bg-[#FFFDF9] rounded-[24px] border border-[#1F3A4D]/10 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${
                  dueCount > 0 ? 'bg-[#E07A3F]/15 text-[#E07A3F]' : 'bg-[#2E7D32]/15 text-[#2E7D32]'
                }`}
              >
                {dueCount > 0 ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif-title font-bold text-base text-[#1F3A4D]">
                    Spaced Repetition Review (SRS)
                  </span>
                  {dueCount > 0 && (
                    <span className="text-[10px] font-bold text-white bg-[#C62828] px-2 py-0.5 rounded-full animate-pulse">
                      {dueCount} Due Now
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#1F3A4D]/75 mt-0.5 leading-relaxed">
                  {dueCount > 0
                    ? `${dueCount} locations need review to reinforce long-term memory. Weak items with mastery 0–2 are prioritized!`
                    : 'All reviews are up to date! Items automatically resurface at optimal intervals (1d, 3d, 7d, 16d, 35d).'}
                </p>
              </div>
            </div>

            {dueCount > 0 ? (
              <button
                onClick={onStartSRSReview}
                className="h-10 px-4 rounded-xl bg-[#E07A3F] hover:bg-[#d46a30] active:scale-95 text-white font-bold text-xs whitespace-nowrap shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Review {dueCount} Places</span>
              </button>
            ) : (
              <button
                onClick={onStartDailyQuiz}
                className="h-10 px-4 rounded-xl bg-[#1F3A4D]/5 hover:bg-[#1F3A4D]/10 text-[#1F3A4D] font-bold text-xs whitespace-nowrap transition flex items-center justify-center gap-1.5"
              >
                <span>Practice Sprint</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Milestone Progress Bar Component */}
      <InteractiveProgressBar
        topics={topics}
        masteryMap={masteryMap}
        srsRecords={srsRecords}
        rewards={rewards}
        dueCount={dueCount}
        onSelectTopicPlace={onSelectTopicPlace}
        onOpenBadges={onOpenBadges}
      />

      {/* Syllabus Group Filters & Topic Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="font-serif-title font-bold text-lg text-[#1F3A4D]">
          Prelims Topic Modules
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick topic search input with auto-complete overlay */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#1F3A4D]/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topics, places, states..."
              value={searchTopicQuery}
              onChange={(e) => setSearchTopicQuery(e.target.value)}
              className="pl-7 pr-7 py-1 rounded-full text-xs bg-[#FFFDF9] border border-[#1F3A4D]/20 text-[#1F3A4D] placeholder-[#1F3A4D]/40 outline-none focus:border-[#E07A3F] focus:ring-2 focus:ring-[#E07A3F]/20 w-44 sm:w-60 transition-all"
            />
            {searchTopicQuery && (
              <button
                onClick={() => setSearchTopicQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#1F3A4D]/40 hover:text-[#1F3A4D] font-bold"
                title="Clear search"
              >
                ✕
              </button>
            )}

            {/* Live Auto-Suggest Overlay Dropdown */}
            {searchTopicQuery.trim().length >= 2 && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[380px] overflow-y-auto bg-white border border-[#1F3A4D]/20 rounded-2xl shadow-xl z-50 p-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* 1. Topic Modules Section */}
                {homeSearchResults.topics.length > 0 && (
                  <div className="mb-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#1F3A4D]/50 px-2 mb-1">
                      📚 Topic Modules
                    </div>
                    {homeSearchResults.topics.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTopic(t);
                          setSearchTopicQuery('');
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-[#1F3A4D]/5 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{t.emoji}</span>
                          <div className="truncate">
                            <div className="text-xs font-bold text-[#1F3A4D] group-hover:text-[#E07A3F] truncate">
                              {t.title}
                            </div>
                            <div className="text-[10px] text-[#1F3A4D]/60 truncate">
                              {t.places.length} {t.noun}s
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#1F3A4D]/30 group-hover:text-[#E07A3F] flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Locations & Landmarks Section */}
                {homeSearchResults.places.length > 0 && (
                  <div className="mb-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#1F3A4D]/50 px-2 mb-1">
                      📍 Syllabus Landmarks ({homeSearchResults.places.length})
                    </div>
                    {homeSearchResults.places.map(({ place, topic }) => (
                      <button
                        key={`${topic.id}-${place.name}`}
                        onClick={() => {
                          if (onSelectTopicPlace) {
                            onSelectTopicPlace(topic, place);
                          } else {
                            onSelectTopic(topic);
                          }
                          setSearchTopicQuery('');
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#1F3A4D] group-hover:text-emerald-800">
                              {place.name}
                            </span>
                            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                              {place.state}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#1F3A4D]/65 line-clamp-1 mt-0.5">
                            {topic.emoji} {topic.title} · {place.category}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                          Focus Pin 📍
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. States & Union Territories Section */}
                {homeSearchResults.states.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#1F3A4D]/50 px-2 mb-1">
                      🏛️ States & UTs
                    </div>
                    {homeSearchResults.states.map((stateName) => {
                      const matchTopic =
                        topics.find((t) =>
                          t.places.some(
                            (p) =>
                              p.state.toLowerCase() === stateName.toLowerCase() ||
                              ((stateName === 'Jammu & Kashmir' || stateName === 'Ladakh') &&
                                (p.state === 'Jammu & Kashmir' || p.state === 'Ladakh'))
                          )
                        ) || topics[0];

                      return (
                        <button
                          key={stateName}
                          onClick={() => {
                            if (matchTopic) {
                              onSelectTopic(matchTopic);
                            }
                            setSearchTopicQuery('');
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-purple-50 transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🏛️</span>
                            <span className="text-xs font-bold text-[#1F3A4D] group-hover:text-purple-800">
                              {stateName}
                            </span>
                          </div>
                          <span className="text-[10px] text-purple-700 font-semibold">
                            Explore State Landmarks →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {homeSearchResults.topics.length === 0 &&
                  homeSearchResults.places.length === 0 &&
                  homeSearchResults.states.length === 0 && (
                    <div className="py-4 text-center text-xs text-[#1F3A4D]/60 font-medium">
                      No matching topics or syllabus landmarks found for "{searchTopicQuery}".
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {syllabusGroups.map((group) => {
              const isSelected = selectedGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#1F3A4D] text-white shadow-sm'
                      : 'bg-[#FFFDF9] text-[#1F3A4D]/80 hover:bg-white border border-[#1F3A4D]/10'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Topics 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredTopics.map((topic) => {
          const stats = topicStats[topic.id] || { answered: 0, correct: 0, best: 0 };
          const sumMastery = topic.places.reduce((acc, p) => {
            const key = `${topic.id}|${p.name}`;
            return acc + (masteryMap[key] || 0);
          }, 0);
          const maxMastery = topic.places.length * 5;
          const progressPercent = maxMastery > 0 ? Math.round((sumMastery / maxMastery) * 100) : 0;

          // Check if any places in this topic are due
          const dueInThisTopic = topic.places.filter((p) => {
            const key = `${topic.id}|${p.name}`;
            const rec = srsRecords[key];
            return rec && rec.nextReviewAt <= Date.now();
          }).length;

          return (
            <div
              key={topic.id}
              onClick={() => onSelectTopic(topic)}
              className="group cursor-pointer rounded-[22px] bg-[#FFFDF9] p-4 border border-[#1F3A4D]/10 shadow-sm hover:shadow-md hover:border-[#E07A3F]/50 transition-all active:scale-[0.98] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[#1F3A4D]/5 flex items-center justify-center text-xl shadow-inner">
                    {topic.emoji}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dueInThisTopic > 0 && (
                      <span className="text-[10px] font-bold text-[#C62828] bg-[#FFEBEE] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {dueInThisTopic} Due
                      </span>
                    )}
                    {stats.best > 0 && (
                      <span className="text-[11px] font-bold text-[#E07A3F] bg-[#E07A3F]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {stats.best}% Best
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-serif-title font-bold text-base mt-2.5 text-[#1F3A4D] group-hover:text-[#E07A3F] transition-colors">
                  {topic.title}
                </h3>
                <p className="text-[11px] text-[#1F3A4D]/70 font-medium">
                  {topic.places.length} {topic.noun}s · {topic.syllabus.split('·')[1]?.trim() || 'Geography'}
                </p>
                <p className="text-xs text-[#1F3A4D]/80 line-clamp-2 mt-1.5 leading-relaxed">
                  {topic.blurb}
                </p>

                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {homeMode === 'LEARN' ? (
                    <>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        📖 Study Dossiers
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                        🗺️ Explore Map Pins
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E07A3F]/15 text-[#E07A3F] border border-[#E07A3F]/30">
                        🎯 Take 10-Q Quiz
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                        🕵️‍♂️ Clue Investigator
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1F3A4D]/5 flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <div className="flex items-center justify-between text-[10px] text-[#1F3A4D]/60 mb-1">
                    <span>SRS Mastery</span>
                    <span className="font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1F3A4D]/10 overflow-hidden">
                    <div
                      className="h-full bg-[#E07A3F] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#1F3A4D]/5 group-hover:bg-[#E07A3F] group-hover:text-white flex items-center justify-center transition">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Reset Action */}
      <div className="mt-12 text-center border-t border-[#1F3A4D]/10 pt-6">
        <p className="text-xs text-[#1F3A4D]/65 max-w-lg mx-auto">
          Equirectangular Projection: <code>x = (lon - 67.5) * cos(22°), y = 38 - lat</code>.
          Zero external tile requests · 100% Offline SharedPreferences & Web LocalStorage.
        </p>

        <button
          onClick={onResetProgress}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#1F3A4D]/60 hover:text-[#C62828] transition py-1 px-3 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Progress Data</span>
        </button>
      </div>

      {/* Standard AdMob Fixed Bottom Banner for Android */}
      <AdBannerWidget position="FIXED_BOTTOM" onEarnXpBonus={onEarnXpBonus} />
      <BannerAd position="BOTTOM" />
    </div>
  );
};
