"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: { length: number; [index: number]: SpeechResult } };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; onstart: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export type SpeechStatus = "idle" | "starting" | "listening" | "reconnecting" | "paused";

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const running = useRef(false);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onFinal);
  useEffect(() => { callback.current = onFinal; }, [onFinal]);

  const stop = useCallback(() => {
    running.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (startTimeout.current) clearTimeout(startTimeout.current);
    if (recognition.current) {
      recognition.current.onend = null; recognition.current.onresult = null;
      recognition.current.onerror = null; recognition.current.onstart = null;
      recognition.current.abort();
    }
    recognition.current = null;
    setStatus("paused");
    setInterim("");
  }, []);

  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    const visibility = () => {
      if (document.hidden && running.current) { stop(); setError("화면을 벗어나 듣기를 멈췄어요. 돌아오면 다시 시작해 주세요."); }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      running.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (startTimeout.current) clearTimeout(startTimeout.current);
      recognition.current?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [stop]);

  const start = useCallback(() => {
    if (running.current) return;
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { setError("이 브라우저에서는 음성 인식을 사용할 수 없어요. 글로 입력하거나 다른 브라우저를 이용해 주세요."); return; }
    if (!window.isSecureContext) { setError("마이크를 사용하려면 HTTPS로 접속해 주세요."); return; }
    setError(""); setInterim(""); setStatus("starting");
    running.current = true; retries.current = 0;
    const r = new Constructor(); recognition.current = r;
    r.lang = "ko-KR"; r.continuous = true; r.interimResults = true;
    const fail = (message: string) => {
      running.current = false;
      if (startTimeout.current) clearTimeout(startTimeout.current);
      setError(message); setStatus("paused"); setInterim("");
    };
    const launch = () => {
      if (!running.current) return;
      try {
        r.start();
        startTimeout.current = setTimeout(() => { fail("음성 인식이 시작되지 않았어요. 마이크 권한과 Siri·받아쓰기 설정을 확인하거나 글로 입력해 주세요."); r.abort(); }, 12_000);
      } catch { fail("마이크를 시작하지 못했어요. 다른 앱의 마이크 사용을 확인하고 다시 시도해 주세요."); }
    };
    r.onstart = () => { if (startTimeout.current) clearTimeout(startTimeout.current); if (running.current) setStatus("listening"); };
    r.onresult = (event) => {
      if (!running.current) return;
      retries.current = 0;
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) { const text = result[0].transcript.trim(); if (text) callback.current(text); }
        else partial += result[0].transcript;
      }
      setInterim(partial);
    };
    r.onerror = ({ error: code }) => {
      if (!running.current || code === "aborted") return;
      if (code === "no-speech") return;
      const messages: Record<string, string> = {
        "not-allowed": "마이크 또는 음성 인식 권한이 필요해요. 브라우저·기기 설정에서 허용한 뒤 다시 시작해 주세요.",
        "service-not-allowed": "음성 인식 서비스를 사용할 수 없어요. Safari에서는 Siri·받아쓰기 설정을 확인해 주세요.",
        "audio-capture": "마이크를 찾지 못했어요. 연결된 입력 장치와 다른 앱의 마이크 사용을 확인해 주세요.",
        network: "음성 인식에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시작해 주세요.",
        "language-not-supported": "이 기기에서는 한국어 음성 인식을 사용할 수 없어요. 글로 입력해 주세요.",
      };
      fail(messages[code] || "음성 인식이 중단됐어요. 다시 시작하거나 글로 입력해 주세요.");
      r.abort();
    };
    r.onend = () => {
      if (startTimeout.current) clearTimeout(startTimeout.current);
      if (!running.current) return;
      if (retries.current >= 3) { fail("음성 인식이 반복해서 종료됐어요. 다시 시작하거나 글로 입력해 주세요."); return; }
      setStatus("reconnecting"); setInterim("");
      timer.current = setTimeout(launch, 500 * 2 ** retries.current++);
    };
    launch();
  }, []);
  return { supported, status, interim, error, start, stop };
}
