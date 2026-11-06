import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, RotateCcw, ShieldCheck, Target } from 'lucide-react';
import bank from '../data/exam_bank.json';

type Question = { id:string; q:string; o:string[]; a:number; e:string; src:string; url:string };
type Module = { id:string; subject:string; title:string; examTags:string[]; difficulty:string; questions:Question[] };
type Props = { onBack:()=>void };

const modules = bank as Module[];
const exams = ['All exams','SSC','Railway','Banking','State PCS','State Police'];

export const ExamLibraryScreen: React.FC<Props> = ({ onBack }) => {
  const [exam,setExam] = useState('All exams');
  const [active,setActive] = useState<string | null>(null);
  const [index,setIndex] = useState(0);
  const [choice,setChoice] = useState<number | null>(null);
  const [answers,setAnswers] = useState<Record<string,number>>({});
  const [showResult,setShowResult] = useState(false);
  const visible = useMemo(()=>modules.filter(m=>exam==='All exams'||m.examTags.includes(exam)),[exam]);
  const current = modules.find(m=>m.id===active);
  const question = current?.questions[index];
  const score = current ? current.questions.filter(q=>answers[q.id]===q.a).length : 0;
  const start = (id:string) => { setActive(id); setIndex(0); setChoice(null); setAnswers({}); setShowResult(false); };
  const next = () => {
    if (!question || choice===null) return;
    const updated={...answers,[question.id]:choice}; setAnswers(updated); setChoice(null);
    if (index+1 >= (current?.questions.length||0)) setShowResult(true); else setIndex(v=>v+1);
  };
  return <main className="min-h-screen bg-[#F7F2EA] text-[#1F3A4D] px-4 py-5 max-w-4xl mx-auto">
    <header className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white border border-[#1F3A4D]/10 flex items-center justify-center"><ArrowLeft className="w-5 h-5"/></button>
      <div><p className="text-xs uppercase tracking-widest font-bold text-[#B66B3D]">Exam-ready learning</p><h1 className="text-2xl font-bold">Study Library</h1></div>
    </header>
    {!current ? <>
      <section className="rounded-3xl p-5 bg-[#1F3A4D] text-white mb-5">
        <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/> Curated starter bank</div>
        <h2 className="text-xl font-bold mt-2">Learn concepts. Practice with purpose.</h2>
        <p className="text-sm text-white/75 mt-1">Topic-wise MCQs with explanations, exam tags and reference links.</p>
        <div className="flex gap-2 flex-wrap mt-4">{['6 modules','30 questions','Source-linked'].map(x=><span key={x} className="text-xs rounded-full bg-white/10 px-3 py-1">{x}</span>)}</div>
      </section>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">{exams.map(x=><button key={x} onClick={()=>setExam(x)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border ${exam===x?'bg-[#1F3A4D] text-white border-[#1F3A4D]':'bg-white border-[#1F3A4D]/10'}`}>{x}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">{visible.map(m=><button key={m.id} onClick={()=>start(m.id)} className="text-left rounded-2xl bg-white border border-[#1F3A4D]/10 p-4 shadow-sm hover:shadow-md transition">
        <div className="flex justify-between items-center"><span className="text-xs font-bold text-[#B66B3D]">{m.subject}</span><span className="text-[10px] rounded-full bg-[#F7F2EA] px-2 py-1">{m.difficulty}</span></div>
        <h3 className="font-bold mt-2">{m.title}</h3><p className="text-xs text-[#1F3A4D]/60 mt-2">{m.questions.length} practice questions · {m.examTags.join(' · ')}</p>
        <div className="mt-4 flex items-center justify-between text-sm font-semibold"><span>Start learning</span><ChevronRight className="w-4 h-4"/></div>
      </button>)}</div>
      <p className="text-xs text-[#1F3A4D]/55 mt-5">Starter content only. Verify time-sensitive rules and exam notifications from the relevant official authority.</p>
    </> : showResult ? <section className="bg-white rounded-3xl p-6 border border-[#1F3A4D]/10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center"><Target className="w-7 h-7"/></div>
      <p className="text-xs uppercase tracking-widest text-[#B66B3D] font-bold mt-4">Practice complete</p><h2 className="text-3xl font-bold mt-1">{score}/{current.questions.length}</h2><p className="text-sm text-[#1F3A4D]/60 mt-1">Correct answers</p>
      <div className="mt-5 flex gap-2 justify-center"><button onClick={()=>start(current.id)} className="rounded-xl bg-[#1F3A4D] text-white px-4 py-3 text-sm font-bold flex gap-2 items-center"><RotateCcw className="w-4 h-4"/> Retry</button><button onClick={()=>{setActive(null);setShowResult(false)}} className="rounded-xl bg-[#F7F2EA] px-4 py-3 text-sm font-bold">All topics</button></div>
    </section> : question && <section className="bg-white rounded-3xl p-5 border border-[#1F3A4D]/10 shadow-sm">
      <div className="flex items-center justify-between gap-3"><button onClick={()=>setActive(null)} className="text-xs font-bold text-[#B66B3D]">← All topics</button><span className="text-xs font-bold text-[#1F3A4D]/55">Question {index+1} / {current.questions.length}</span></div>
      <div className="h-1.5 bg-[#F1E9DE] rounded-full mt-4 overflow-hidden"><div className="h-full bg-[#B66B3D] rounded-full" style={{width:`${((index+1)/current.questions.length)*100}%`}}/></div>
      <p className="text-xs uppercase tracking-widest font-bold text-[#B66B3D] mt-5">{current.subject} · {current.difficulty}</p>
      <h2 className="text-xl font-bold mt-2 leading-snug">{question.q}</h2>
      <div className="grid gap-2 mt-5">{question.o.map((option,i)=><button key={option} disabled={choice!==null} onClick={()=>setChoice(i)} className={`text-left rounded-xl border p-4 text-sm font-medium transition ${choice===i?'border-[#1F3A4D] bg-[#EAF0F2]': 'border-[#1F3A4D]/10 bg-white'}`}>{String.fromCharCode(65+i)}. {option}</button>)}</div>
      {choice!==null && <div className={`rounded-2xl p-4 mt-4 ${choice===question.a?'bg-emerald-50':'bg-amber-50'}`}><div className="flex items-center gap-2 font-bold text-sm">{choice===question.a?<CheckCircle2 className="w-4 h-4"/>:<BookOpen className="w-4 h-4"/>}{choice===question.a?'Correct':'Correct answer: '+question.o[question.a]}</div><p className="text-sm mt-2">{question.e}</p><a href={question.url} target="_blank" rel="noreferrer" className="inline-block text-xs underline mt-3">Reference: {question.src}</a></div>}
      <button disabled={choice===null} onClick={next} className="w-full mt-5 rounded-xl bg-[#1F3A4D] disabled:opacity-40 text-white py-3 font-bold text-sm">{index+1===current.questions.length?'Finish practice':'Next question'} <ChevronRight className="inline w-4 h-4"/></button>
    </section>}
  </main>;
};
