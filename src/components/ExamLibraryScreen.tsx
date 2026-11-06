import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, RotateCcw, ShieldCheck, Target, Layers, Brain, ClipboardList, Eye, EyeOff } from 'lucide-react';
import bank from '../data/exam_bank.json';

type Question = { id:string; q:string; o:string[]; a:number; e:string; src:string; url:string };
type Module = { id:string; subject:string; title:string; examTags:string[]; difficulty:string; questions:Question[] };
type Props = { onBack:()=>void };
type Mode = 'STUDY'|'FLASHCARDS'|'MOCK';
type Progress = { attempts:number; correct:number; lastScore:number; lastAt:number };
const modules = bank as Module[];
const exams = ['All exams','SSC','Railway','Banking','State PCS','State Police'];
const PROGRESS_KEY='exam_library_progress_v1';
const REVISION_KEY='exam_library_revision_v1';
const readStore=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}};

export const ExamLibraryScreen: React.FC<Props> = ({ onBack }) => {
 const [exam,setExam]=useState('All exams');
 const [mode,setMode]=useState<Mode>('STUDY');
 const [active,setActive]=useState<string|null>(null);
 const [index,setIndex]=useState(0);
 const [choice,setChoice]=useState<number|null>(null);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [showResult,setShowResult]=useState(false);
 const [progress,setProgress]=useState<Record<string,Progress>>(()=>readStore(PROGRESS_KEY,{}));
 const [revision,setRevision]=useState<Record<string,{dueAt:number;reviews:number}>>(()=>readStore(REVISION_KEY,{}));
 const [revealed,setRevealed]=useState(false);
 const [mockQuestions,setMockQuestions]=useState<Question[]>([]);
 const [mockTitle,setMockTitle]=useState('');
 const [mockAnswers,setMockAnswers]=useState<Record<string,number>>({});
 const [mockIndex,setMockIndex]=useState(0);
 const [mockChoice,setMockChoice]=useState<number|null>(null);
 const [mockDone,setMockDone]=useState(false);
 const visible=useMemo(()=>modules.filter(m=>exam==='All exams'||m.examTags.includes(exam)),[exam]);
 const current=modules.find(m=>m.id===active);
 const question=current?.questions[index];
 const score=current?current.questions.filter(q=>answers[q.id]===q.a).length:0;
 const dueCards=modules.flatMap(m=>m.questions).filter(q=>(revision[q.id]?.dueAt||0)<=Date.now()).length;
 const persistProgress=(next:Record<string,Progress>)=>{setProgress(next);try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(next));}catch{}};
 const persistRevision=(next:typeof revision)=>{setRevision(next);try{localStorage.setItem(REVISION_KEY,JSON.stringify(next));}catch{}};
 const start=(id:string)=>{setActive(id);setIndex(0);setChoice(null);setAnswers({});setShowResult(false);setMode('STUDY');};
 const next=()=>{
  if(!question||choice===null||!current)return;
  const updated={...answers,[question.id]:choice};setAnswers(updated);setChoice(null);
  if(index+1>=current.questions.length){
   setShowResult(true);
   const correct=current.questions.filter(q=>updated[q.id]===q.a).length;
   const old=progress[current.id]||{attempts:0,correct:0,lastScore:0,lastAt:0};
   persistProgress({...progress,[current.id]:{attempts:old.attempts+1,correct:old.correct+correct,lastScore:Math.round(correct*100/current.questions.length),lastAt:Date.now()}});
  }else setIndex(v=>v+1);
 };
 const startMock=()=>{
  const pool=visible.flatMap(m=>m.questions);
  const shuffled=[...pool].sort(()=>Math.random()-.5).slice(0,Math.min(20,pool.length));
  if(!shuffled.length)return;
  setMockQuestions(shuffled);setMockTitle(exam==='All exams'?'Mixed exam mock':exam+' mock');setMockAnswers({});setMockIndex(0);setMockChoice(null);setMockDone(false);setMode('MOCK');setActive(null);
 };
 const mockNext=()=>{
  if(mockChoice===null)return;
  const updated={...mockAnswers,[mockQuestions[mockIndex].id]:mockChoice};setMockAnswers(updated);setMockChoice(null);
  if(mockIndex+1>=mockQuestions.length)setMockDone(true);else setMockIndex(v=>v+1);
 };
 const mockScore=mockQuestions.filter(q=>mockAnswers[q.id]===q.a).length;
 const markCard=(remembered:boolean)=>{
  if(!question)return;
  const prior=revision[question.id]?.reviews||0;
  const days=remembered?[1,3,7,14,30][Math.min(prior,4)]:0;
  persistRevision({...revision,[question.id]:{reviews:remembered?prior+1:0,dueAt:Date.now()+days*86400000}});
  setRevealed(false);setIndex(v=>(v+1)%((current?.questions.length)||1));
 };
 return <main className="min-h-screen bg-[#F7F2EA] text-[#1F3A4D] px-4 py-5 max-w-4xl mx-auto">
  <header className="flex items-center gap-3 mb-5"><button onClick={onBack} className="w-10 h-10 rounded-xl bg-white border border-[#1F3A4D]/10 flex items-center justify-center"><ArrowLeft className="w-5 h-5"/></button><div><p className="text-xs uppercase tracking-widest font-bold text-[#B66B3D]">SSC · Railway · Banking · State exams</p><h1 className="text-2xl font-bold">Study Library</h1></div></header>
  {!active&&mode!=='MOCK'&&<>
   <section className="rounded-3xl p-5 bg-[#1F3A4D] text-white mb-4"><div className="flex items-center gap-2 text-amber-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/> Exam preparation workspace</div><h2 className="text-xl font-bold mt-2">Learn. Recall. Test. Improve.</h2><p className="text-sm text-white/75 mt-1">Question explanations, source links, revision intervals and mixed mocks.</p><div className="flex flex-wrap gap-2 mt-4">{[`${modules.length} modules`,`${modules.reduce((n,m)=>n+m.questions.length,0)} questions`,`${dueCards} revision cards due`].map(x=><span key={x} className="text-xs rounded-full bg-white/10 px-3 py-1">{x}</span>)}</div></section>
   <div className="grid grid-cols-3 gap-2 mb-4">{([{id:'STUDY',label:'Topics',icon:BookOpen},{id:'FLASHCARDS',label:'Flashcards',icon:Layers},{id:'MOCK',label:'Mock test',icon:ClipboardList}] as const).map(t=><button key={t.id} onClick={()=>t.id==='MOCK'?startMock():setMode(t.id)} className={`rounded-xl p-3 text-xs font-bold flex flex-col items-center gap-1 border ${mode===t.id?'bg-[#1F3A4D] text-white border-[#1F3A4D]':'bg-white border-[#1F3A4D]/10'}`}><t.icon className="w-5 h-5"/>{t.label}</button>)}</div>
   <div className="flex gap-2 overflow-x-auto pb-3 mb-3">{exams.map(x=><button key={x} onClick={()=>setExam(x)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border ${exam===x?'bg-[#1F3A4D] text-white border-[#1F3A4D]':'bg-white border-[#1F3A4D]/10'}`}>{x}</button>)}</div>
   {mode==='FLASHCARDS'?<section className="rounded-2xl bg-white border border-[#1F3A4D]/10 p-5"><div className="flex justify-between text-xs font-bold"><span>REVISION DECK</span><span>{dueCards} due</span></div><p className="text-xs text-[#1F3A4D]/60 mt-2">Cards use questions from your selected exam bank. Mark each card based on recall.</p>{visible.flatMap(m=>m.questions).filter(q=>(revision[q.id]?.dueAt||0)<=Date.now()).slice(0,12).length===0?<p className="py-8 text-center font-semibold">No cards due. Great work!</p>:<div className="mt-4">{(()=>{const card=visible.flatMap(m=>m.questions).find(q=>(revision[q.id]?.dueAt||0)<=Date.now());if(!card)return null;return <><p className="font-bold text-lg">{card.q}</p>{revealed?<div className="rounded-xl bg-[#F7F2EA] p-4 mt-4"><p className="font-bold">{card.o[card.a]}</p><p className="text-sm mt-2">{card.e}</p></div>:<button onClick={()=>setRevealed(true)} className="w-full mt-4 rounded-xl bg-[#1F3A4D] text-white py-3 font-bold"><Eye className="inline w-4 h-4 mr-2"/>Reveal answer</button>}{revealed&&<div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>{const old=revision[card.id]?.reviews||0;persistRevision({...revision,[card.id]:{reviews:0,dueAt:Date.now()+10*60*1000}});setRevealed(false);}} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold">Need revision</button><button onClick={()=>{const old=revision[card.id]?.reviews||0;const days=[1,3,7,14,30][Math.min(old,4)];persistRevision({...revision,[card.id]:{reviews:old+1,dueAt:Date.now()+days*86400000}});setRevealed(false);}} className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-bold">Got it · { [1,3,7,14,30][Math.min(revision[card.id]?.reviews||0,4)]}d</button></div>}</>})()}</div>}</section>:<div className="grid gap-3 sm:grid-cols-2">{visible.map(m=>{const p=progress[m.id];return <button key={m.id} onClick={()=>start(m.id)} className="text-left rounded-2xl bg-white border border-[#1F3A4D]/10 p-4 shadow-sm hover:shadow-md transition"><div className="flex justify-between items-center"><span className="text-xs font-bold text-[#B66B3D]">{m.subject}</span><span className="text-[10px] rounded-full bg-[#F7F2EA] px-2 py-1">{m.difficulty}</span></div><h3 className="font-bold mt-2">{m.title}</h3><p className="text-xs text-[#1F3A4D]/60 mt-2">{m.questions.length} MCQs · {m.examTags.join(' · ')}</p><div className="mt-3 flex justify-between text-xs"><span>{p?`Last score: ${p.lastScore}%`:'Not attempted'}</span><span>{p?.attempts||0} attempts</span></div><div className="mt-2 h-1.5 bg-[#F1E9DE] rounded-full overflow-hidden"><div className="h-full bg-[#B66B3D]" style={{width:`${p?.lastScore||0}%`}}/></div></button>})}</div>}
   <p className="text-xs text-[#1F3A4D]/55 mt-5">Starter bank is expanding. Check current notifications, dates and policy details against the relevant official authority.</p>
  </>}
  {active&&current&&showResult&&<section className="bg-white rounded-3xl p-6 border border-[#1F3A4D]/10 text-center"><Target className="w-8 h-8 mx-auto text-emerald-700"/><p className="text-xs uppercase tracking-widest text-[#B66B3D] font-bold mt-4">Practice complete</p><h2 className="text-3xl font-bold mt-1">{score}/{current.questions.length}</h2><p className="text-sm text-[#1F3A4D]/60 mt-1">Correct answers · {Math.round(score*100/current.questions.length)}% accuracy</p><div className="mt-5 flex gap-2 justify-center"><button onClick={()=>start(current.id)} className="rounded-xl bg-[#1F3A4D] text-white px-4 py-3 text-sm font-bold"><RotateCcw className="inline w-4 h-4 mr-1"/> Retry</button><button onClick={()=>{setActive(null);setShowResult(false)}} className="rounded-xl bg-[#F7F2EA] px-4 py-3 text-sm font-bold">All topics</button></div></section>}
  {active&&current&&!showResult&&question&&<section className="bg-white rounded-3xl p-5 border border-[#1F3A4D]/10 shadow-sm"><div className="flex items-center justify-between"><button onClick={()=>setActive(null)} className="text-xs font-bold text-[#B66B3D]">← All topics</button><span className="text-xs font-bold text-[#1F3A4D]/55">Question {index+1}/{current.questions.length}</span></div><div className="h-1.5 bg-[#F1E9DE] rounded-full mt-4 overflow-hidden"><div className="h-full bg-[#B66B3D]" style={{width:`${((index+1)/current.questions.length)*100}%`}}/></div><p className="text-xs uppercase tracking-widest font-bold text-[#B66B3D] mt-5">{current.subject} · {current.difficulty}</p><h2 className="text-xl font-bold mt-2 leading-snug">{question.q}</h2><div className="grid gap-2 mt-5">{question.o.map((option,i)=><button key={option} disabled={choice!==null} onClick={()=>setChoice(i)} className={`text-left rounded-xl border p-4 text-sm font-medium transition ${choice===i?'border-[#1F3A4D] bg-[#EAF0F2]':'border-[#1F3A4D]/10 bg-white'}`}>{String.fromCharCode(65+i)}. {option}</button>)}</div>{choice!==null&&<div className={`rounded-2xl p-4 mt-4 ${choice===question.a?'bg-emerald-50':'bg-amber-50'}`}><div className="flex items-center gap-2 font-bold text-sm">{choice===question.a?<CheckCircle2 className="w-4 h-4"/>:<Brain className="w-4 h-4"/>}{choice===question.a?'Correct':'Correct answer: '+question.o[question.a]}</div><p className="text-sm mt-2">{question.e}</p><a href={question.url} target="_blank" rel="noreferrer" className="inline-block text-xs underline mt-3">Reference: {question.src}</a></div>}<button disabled={choice===null} onClick={next} className="w-full mt-5 rounded-xl bg-[#1F3A4D] disabled:opacity-40 text-white py-3 font-bold text-sm">{index+1===current.questions.length?'Finish practice':'Next question'} <ChevronRight className="inline w-4 h-4"/></button></section>}
  {mode==='MOCK'&&<section className="bg-white rounded-3xl p-5 border border-[#1F3A4D]/10">{mockDone?<div className="text-center py-6"><ClipboardList className="w-9 h-9 mx-auto"/><p className="text-xs uppercase font-bold tracking-widest text-[#B66B3D] mt-3">{mockTitle} complete</p><h2 className="text-4xl font-bold mt-2">{mockScore}/{mockQuestions.length}</h2><p className="text-sm text-[#1F3A4D]/60">Correct answers · {Math.round(mockScore*100/mockQuestions.length)}% accuracy</p><button onClick={()=>{setMode('STUDY');setMockDone(false)}} className="mt-5 rounded-xl bg-[#1F3A4D] text-white px-5 py-3 font-bold">Back to library</button></div>:<><div className="flex justify-between text-xs font-bold"><span>{mockTitle}</span><span>{mockIndex+1}/{mockQuestions.length}</span></div><div className="h-1.5 bg-[#F1E9DE] rounded-full mt-3"><div className="h-full bg-[#B66B3D]" style={{width:`${(mockIndex+1)/mockQuestions.length*100}%`}}/></div><h2 className="font-bold text-lg mt-5">{mockQuestions[mockIndex]?.q}</h2><div className="grid gap-2 mt-4">{mockQuestions[mockIndex]?.o.map((o,i)=><button key={o} onClick={()=>setMockChoice(i)} className={`text-left rounded-xl border p-3 text-sm ${mockChoice===i?'border-[#1F3A4D] bg-[#EAF0F2]':'border-[#1F3A4D]/10'}`}>{String.fromCharCode(65+i)}. {o}</button>)}</div><button disabled={mockChoice===null} onClick={mockNext} className="w-full mt-5 rounded-xl bg-[#1F3A4D] disabled:opacity-40 text-white py-3 font-bold">{mockIndex+1===mockQuestions.length?'Submit mock':'Next'}</button></>}</section>}
 </main>;
};
