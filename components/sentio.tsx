"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, AudioLines, Check, ChevronRight, CircleHelp, Ear, Headphones, Keyboard, LoaderCircle, Mic, Pause, Play, RotateCcw, Send, ShieldCheck, Sparkles, Waves, X } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { demoLines, demoMoods, moods, type Analysis, type Utterance } from "@/lib/analysis";

const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
const clock = (at: number) => new Date(at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

export function Sentio() {
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzedId, setAnalyzedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [retry, setRetry] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [input, setInput] = useState("");
  const [consented, setConsented] = useState(false);
  const [pendingAction, setPendingAction] = useState<"reset" | "demo">("reset");
  const resetDialog = useRef<HTMLDialogElement>(null);
  const guide = useRef<HTMLDialogElement>(null);
  const consent = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const demoIndex = useRef(0);
  const nearBottom = useRef(true);
  const append = useCallback((text: string, source: Utterance["source"] = "speech") => {
    const id = crypto.randomUUID();
    setUtterances(previous => [...previous, { id, text: text.slice(0, 1200), at: Date.now(), source }].slice(-200));
    return id;
  }, []);
  const speech = useSpeech(append);
  const listening = ["starting", "listening", "reconnecting"].includes(speech.status);
  const active = mode === "demo" ? demoPlaying : listening;
  const mood = moods[analysis?.mood || "unclear"];

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (mode !== "demo" || !demoPlaying) return;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      const i = demoIndex.current;
      if (i >= demoLines.length) { setDemoPlaying(false); return; }
      const id = append(demoLines[i], "demo");
      const next: Analysis = {
        mood: demoMoods[i], confidence: 0.82,
        signals: [
          { label: "긍정적인 반응", value: [0.25, 0.9, 0.87, 0.18, 0.55, 0.92][i] },
          { label: "관심과 호기심", value: [0.4, 0.64, 0.72, 0.3, 0.91, 0.69][i] },
          { label: "걱정과 망설임", value: [0.1, 0.08, 0.12, 0.85, 0.26, 0.08][i] },
        ], at: Date.now(),
      };
      setAnalysis(next); setAnalyzedId(id); setHistory(h => [...h, next]);
      demoIndex.current++;
      if (demoIndex.current >= demoLines.length) setDemoPlaying(false);
      else timer = setTimeout(advance, 3200);
    };
    timer = setTimeout(advance, demoIndex.current === 0 ? 400 : 2800);
    return () => clearTimeout(timer);
  }, [mode, demoPlaying, append]);

  useEffect(() => {
    if (mode !== "live" || !utterances.length) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAnalyzing(true); setAnalysisError("");
      try {
        const response = await fetch("/api/analyze", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: utterances.slice(-8).map(u => u.text) }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "분석을 완료하지 못했어요.");
        if (controller.signal.aborted) return;
        setAnalysis(data); setAnalyzedId(utterances.at(-1)!.id); setHistory(h => [...h, data].slice(-40));
      } catch (error) {
        if (!controller.signal.aborted) setAnalysisError(error instanceof Error ? error.message : "분석에 연결하지 못했어요.");
      } finally { if (!controller.signal.aborted) setAnalyzing(false); }
    }, 1400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [utterances, mode, retry]);

  useEffect(() => {
    if (nearBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [utterances, speech.interim]);

  const clear = () => {
    speech.stop(); setDemoPlaying(false); setUtterances([]); setAnalysis(null);
    setHistory([]); setAnalyzedId(null); setElapsed(0); setAnalysisError(""); setAnalyzing(false);
    setInput(""); demoIndex.current = 0;
  };
  const switchMode = (next: "live" | "demo") => {
    if (mode === next) return;
    if (mode === "live" && utterances.length) { setPendingAction("demo"); resetDialog.current?.showModal(); return; }
    clear(); setMode(next); if (next === "demo") setDemoPlaying(true);
  };
  const toggle = () => {
    if (mode === "demo") {
      if (demoPlaying) setDemoPlaying(false);
      else { if (demoIndex.current >= demoLines.length) clear(); setDemoPlaying(true); }
    } else if (listening) speech.stop();
    else if (!consented) consent.current?.showModal();
    else speech.start();
  };
  const submitText = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    if (!consented) { consent.current?.showModal(); return; }
    append(input.trim(), "text"); setInput("");
  };
  const statusLabel = mode === "demo" ? (demoPlaying ? "예시 재생 중" : "예시 대화") : speech.status === "starting" ? "마이크 연결 중" : speech.status === "reconnecting" ? "다시 연결 중" : listening ? "대화를 듣고 있어요" : utterances.length ? "잠시 쉬어가는 중" : "시작할 준비가 됐어요";

  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Sentio">
        <a className="brand" href="/" aria-label="Sentio 홈"><span className="brand-icon"><AudioLines size={24} strokeWidth={2.4} /></span><span>sentio<span className="brand-dot">.</span></span></a>
        <div className="rail-section-label">YOUR SPACE</div>
        <div className="rail-current"><Waves size={19} /><span>라이브 세션</span><span className="rail-active-mark" /></div>
        <div className="rail-note"><span className="tiny-star">✳</span><p>잘 듣는 것에서<br />좋은 대화가 시작돼요.</p><span>Make room for understanding.</span></div>
        <button className="guide-button" onClick={() => guide.current?.showModal()}><CircleHelp size={18} /><span>사용 가이드</span><ArrowUpRight size={16} /></button>
        <div className="rail-footer"><span className="mini-logo">s.</span><span>조금 더 가까운 대화<small>MADE FOR HUMAN CONNECTION</small></span></div>
      </aside>

      <main>
        <header className="topbar"><div className="breadcrumb"><span>내 공간</span><ChevronRight size={14} /><strong>라이브 세션</strong></div><div className="topbar-right"><span className="private-label"><ShieldCheck size={15} /> 대화 기록은 이 화면에만</span><button className="mobile-help icon-button" aria-label="사용 가이드" onClick={() => guide.current?.showModal()}><CircleHelp size={20} /></button><span className="profile-mark" aria-hidden="true">S</span></div></header>
        <div className="workspace">
          <section className="page-heading"><div><div className="eyebrow"><span /> A LITTLE CLOSER, TOGETHER</div><h1>말 사이의 마음을 읽다<span>.</span></h1><p>대화에 집중하세요. 작은 반응은 Sentio가 함께 살펴볼게요.</p></div><div className="mode-switch" aria-label="세션 모드"><button aria-pressed={mode === "live"} onClick={() => switchMode("live")}><AudioLines size={16} /> 라이브</button><button aria-pressed={mode === "demo"} onClick={() => switchMode("demo")}><Play size={14} /> 체험하기</button></div></section>

          {mode === "demo" && <div className="demo-banner"><Sparkles size={16} /><span>체험 모드 · 준비된 예시 대화와 분석입니다. 마이크를 사용하지 않아요.</span><button onClick={() => switchMode("live")}>라이브로 전환 <ArrowUpRight size={14} /></button></div>}

          <div className="session-grid">
            <section className={`emotion-panel tone-${mood.color}`} aria-labelledby="emotion-title">
              <div className="panel-top"><span className="section-label"><span className={`status-dot ${active ? "is-active" : ""}`} />{statusLabel}</span><span className="session-timer">{time(elapsed)}</span></div>
              <div className="emotion-stage">
                <div className={`orb-scene ${active ? "is-listening" : ""}`} aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orb"><div className="orb-shine" /><div className="orb-wave"><i /><i /><i /><i /><i /><i /><i /></div></div><span className="orbit-point point-one" /><span className="orbit-point point-two" /><span className="orb-spark">+</span></div>
                <div className="emotion-copy" aria-live="polite"><span className="emotion-kicker">{analysis ? mood.english : "EVERY CONVERSATION MATTERS"}</span><h2 id="emotion-title">{analysis ? mood.label : "어떤 마음이 들려올까요?"}</h2><p>{analysis ? mood.description : <>마이크를 켜고 대화를 시작해 보세요.<br />말에 담긴 반응을 함께 살펴볼게요.</>}</p></div>
                <div className="insight-badge">{analyzing ? <><LoaderCircle size={13} className="spin" /> 새로운 발언을 살펴보는 중</> : analysis ? <><Sparkles size={13} />{mode === "demo" ? "예시 분석" : analysis.mood === "unclear" ? "판단 보류 · 맥락이 더 필요해요" : "발언에 드러난 반응의 추정"}</> : <><Headphones size={14} /> 판단보다 이해를 위한 공간</>}</div>
              </div>
              <div className="signal-section"><div className="section-row"><h3>대화의 신호</h3><span>{analysis ? "최근 발언 기준" : "대화가 시작되면 표시돼요"}</span></div><div className="signals">{["긍정적인 반응", "관심과 호기심", "걱정과 망설임"].map((label, i) => {
                const value = analysis?.signals[i]?.value;
                return <div className={`signal signal-${i}`} key={label}><div className="signal-label"><span>{label}</span><strong>{value == null ? "—" : value > .7 ? "뚜렷해요" : value > .4 ? "보여요" : "적어요"}</strong></div><div className="signal-track"><span style={{ width: value == null ? "0%" : `${value * 100}%` }} /></div></div>;
              })}</div></div>
              <div className="microphone-controls"><button className={`mic-button ${active ? "recording" : ""}`} onClick={toggle} disabled={mode === "live" && speech.supported === null}>{active ? <Pause size={19} fill="currentColor" /> : mode === "demo" ? <Play size={19} /> : <Mic size={20} />}<span>{active ? "잠시 멈추기" : mode === "demo" ? demoIndex.current >= demoLines.length ? "다시 체험하기" : "예시 이어보기" : utterances.length ? "이어서 듣기" : "대화 시작하기"}</span></button><p>{mode === "demo" ? "실제 감정 분석이 아닌 체험용 예시예요" : "한국어 · 현재 기기의 마이크를 사용해요"}</p></div>
            </section>

            <section className="transcript-panel" aria-labelledby="transcript-title"><div className="transcript-header"><div><div className="section-label">LIVE TRANSCRIPT</div><h2 id="transcript-title">지금 나누는 이야기 <span>{utterances.length.toString().padStart(2, "0")}</span></h2></div><button className="icon-button" aria-label="대화 초기화" disabled={!utterances.length && !active} onClick={() => { setPendingAction("reset"); resetDialog.current?.showModal(); }}><RotateCcw size={18} /></button></div>
              <div className="transcript-log" ref={log} role="log" aria-label="대화 자막" aria-live="polite" onScroll={() => { if (log.current) nearBottom.current = log.current.scrollHeight - log.current.scrollTop - log.current.clientHeight < 60; }}>
                {!utterances.length && !speech.interim ? <div className="transcript-empty"><div className="empty-icon"><AudioLines size={28} strokeWidth={1.4} /></div><h3>좋은 대화는, 듣는 것부터.</h3><p>대화를 시작하면 이곳에<br />말 한마디 한마디가 담겨요.</p><div className="empty-line" /><span>지금 이 순간의 대화에 집중해 보세요.</span></div> : <><div className="conversation-start"><span />{mode === "demo" ? "예시 대화가 시작됐어요" : "이 순간의 대화"}<span /></div>{utterances.map((u, i) => <article className={`utterance ${i === utterances.length - 1 ? "latest" : ""}`} key={u.id}><div className="utterance-meta"><span>{u.source === "demo" ? "예시 발언" : u.source === "text" ? "입력한 발언" : "수음된 발언"}</span><time>{clock(u.at)}</time></div><p>{u.text}</p>{u.id === analyzedId && analysis && <span className={`utterance-tag tone-${mood.color}`}><span />{mode === "demo" ? "예시 · " : ""}{mood.label}</span>}</article>)}{speech.interim && <article className="utterance interim"><div className="utterance-meta"><span><span className="status-dot is-active" /> 듣고 있어요</span></div><p>{speech.interim}<span className="typing-caret" /></p></article>}</>}
              </div>
              {speech.error && mode === "live" && <div className="notice" role="alert">{speech.error}</div>}
              {speech.supported === false && mode === "live" && !speech.error && <div className="notice">이 브라우저는 음성 인식을 지원하지 않아요. 아래에서 글로 입력할 수 있어요.</div>}
              {analysisError && <div className="notice analysis-notice" role="alert"><span>{analysisError}</span><button onClick={() => setRetry(r => r + 1)} disabled={analyzing}>다시 시도</button></div>}
              {mode === "live" && (manualOpen || speech.supported === false) && <form className="manual-form" onSubmit={submitText}><label htmlFor="manual-text">분석할 발언을 입력하세요</label><div><textarea id="manual-text" value={input} maxLength={1200} onChange={e => setInput(e.target.value)} placeholder="예: 방향은 좋은데, 일정이 조금 걱정돼요." rows={2} /><button type="submit" aria-label="발언 보내기" disabled={!input.trim()}><Send size={17} /></button></div></form>}
              <div className="transcript-footer"><span><span className={`status-dot ${active ? "is-active" : ""}`} />{mode === "demo" ? "예시 데이터" : "자동으로 텍스트 변환"}</span>{mode === "live" && <button onClick={() => setManualOpen(v => !v)} aria-expanded={manualOpen}><Keyboard size={16} />{manualOpen ? "입력 닫기" : "글로 입력"}</button>}</div>
            </section>
          </div>

          <section className="flow-panel" aria-labelledby="flow-title"><div className="flow-heading"><div className="flow-icon"><Waves size={21} /></div><div><h2 id="flow-title">대화의 흐름</h2><p>마음이 움직이는 순간을 따라가요.</p></div></div><div className="flow-timeline">{history.length ? history.slice(-6).map((a, i) => <div className={`flow-item tone-${moods[a.mood].color}`} key={`${a.at}-${i}`}><div className="flow-point" /><span>{moods[a.mood].label}</span><small>{clock(a.at)}</small></div>) : <div className="flow-placeholder"><span className="flow-dashed-line" /><span className="flow-placeholder-text">첫 번째 반응을 기다리고 있어요</span></div>}</div><span className="flow-live-label">{mode === "demo" ? "DEMO" : "THIS SESSION"}</span></section>
          <footer className="workspace-footer"><span><ShieldCheck size={14} /> 대화는 새로고침하면 사라집니다.</span><p>분석은 발언의 표현을 바탕으로 한 추정이며, 실제 마음과 다를 수 있어요.</p></footer>
        </div>
      </main>
      <dialog className="modal" ref={resetDialog} aria-labelledby="reset-title"><button className="modal-close icon-button" aria-label="초기화 취소" onClick={() => resetDialog.current?.close()}><X size={20} /></button><div className="modal-symbol"><RotateCcw size={25} /></div><h2 id="reset-title">현재 대화를 지울까요?</h2><p className="consent-copy">이 화면의 발언과 분석이 모두 사라집니다. {pendingAction === "demo" ? "이어서 예시 대화를 체험할 수 있어요." : "새로운 대화를 시작할 수 있어요."}</p><div className="dialog-actions"><button className="secondary-button" onClick={() => resetDialog.current?.close()}>대화 유지하기</button><button className="primary-button" onClick={() => { clear(); resetDialog.current?.close(); if (pendingAction === "demo") { setMode("demo"); setDemoPlaying(true); } }}>지우고 {pendingAction === "demo" ? "체험하기" : "시작하기"}</button></div></dialog>
      <dialog className="modal" ref={guide} aria-labelledby="guide-title"><button className="modal-close icon-button" aria-label="가이드 닫기" onClick={() => guide.current?.close()}><X size={20} /></button><div className="modal-symbol"><Ear size={28} /></div><span className="eyebrow">A BETTER WAY TO LISTEN</span><h2 id="guide-title">조금 더 잘 듣는 방법</h2><ol><li><strong>대화 상대에게 먼저 알려 주세요.</strong><p>음성 인식과 발언 분석을 사용한다는 것을 함께 확인해 주세요.</p></li><li><strong>마이크 가까이에서 대화하세요.</strong><p>현재 기기에 들리는 목소리를 분석해요. 헤드폰 속 원격 상대방의 목소리는 수음되지 않아요.</p></li><li><strong>이 화면을 열어 두세요.</strong><p>화면을 벗어나면 듣기를 멈춥니다. 돌아와서 이어서 듣기를 눌러 주세요.</p></li></ol><div className="modal-note">최신 Chrome·Safari를 권장해요. Safari에서는 Siri·받아쓰기 설정이 필요할 수 있어요. 여러 사람의 목소리는 구분하지 않으며, 억양은 분석하지 않아요.</div><button className="primary-button" onClick={() => guide.current?.close()}>알겠어요 <Check size={17} /></button></dialog>
      <dialog className="modal" ref={consent} aria-labelledby="consent-title"><button className="modal-close icon-button" aria-label="안내 닫기" onClick={() => consent.current?.close()}><X size={20} /></button><div className="modal-symbol"><Mic size={26} /></div><span className="eyebrow">BEFORE WE BEGIN</span><h2 id="consent-title">서로 알고 시작하는 대화</h2><p className="consent-copy">함께하는 분들에게 음성 인식과 발언 분석을 사용한다는 것을 알려 주세요.</p><div className="consent-detail"><ShieldCheck size={20} /><p>음성은 브라우저 제공업체의 인식 서비스로 전송될 수 있고, 변환된 텍스트는 JEV로 보내 분석합니다. 이 앱은 대화 기록을 별도 데이터베이스에 저장하지 않습니다.</p></div><p className="modal-note">표시되는 반응은 발언 내용의 추정이에요. 상대방의 실제 마음을 단정하지 않아요.</p><button className="primary-button" onClick={() => { setConsented(true); consent.current?.close(); if (input.trim()) { append(input.trim(), "text"); setInput(""); } else speech.start(); }}>확인하고 시작하기 <ArrowUpRight size={18} /></button></dialog>
    </div>
  );
}
