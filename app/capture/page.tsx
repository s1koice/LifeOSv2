"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadPinCloudState, readPinSession, savePinCloudState, signInWithPin } from "@/lib/pin-cloud";
import styles from "./capture.module.css";

type InboxItem = {
  id: number;
  title: string;
  kind: "idea" | "task" | "note";
  createdAt: string;
  status: "new" | "organized";
};

type SpeechResultEvent = { results: { [index: number]: { [index: number]: { transcript?: string } } } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function newInboxId() {
  return Date.now() * 100 + Math.floor(Math.random() * 100);
}

export default function CapturePage() {
  const [mode, setMode] = useState<"checking" | "login" | "ready">("checking");
  const [pin, setPin] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [message, setMessage] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [recent, setRecent] = useState<InboxItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function refreshInbox() {
    const { row } = await loadPinCloudState();
    const items = Array.isArray(row?.payload?.inboxItems) ? row.payload.inboxItems as InboxItem[] : [];
    setInboxCount(items.filter(item => item.status !== "organized").length);
    return row?.payload || {};
  }

  useEffect(() => {
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const voiceTimer = window.setTimeout(() => setVoiceSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition)), 0);
    readPinSession().then(async session => {
      if (!session.authenticated) { setMode("login"); return; }
      await refreshInbox();
      setMode("ready");
      window.setTimeout(() => textareaRef.current?.focus(), 80);
    }).catch(() => { setMessage("Не удалось связаться с NEXUS"); setMode("login"); });
    return () => window.clearTimeout(voiceTimer);
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (busy || pin.length < 4) return;
    setBusy(true); setMessage("");
    try {
      await signInWithPin(pin);
      await refreshInbox();
      setMode("ready");
      window.setTimeout(() => textareaRef.current?.focus(), 80);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось войти");
    } finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true); setMessage("");
    try {
      const payload = await refreshInbox();
      const items = Array.isArray(payload.inboxItems) ? payload.inboxItems as InboxItem[] : [];
      const item: InboxItem = { id: newInboxId(), title, kind: "note", createdAt: new Date().toISOString(), status: "new" };
      const nextPayload = { ...payload, inboxItems: [item, ...items] };
      await savePinCloudState(nextPayload);
      localStorage.setItem("nexus-state", JSON.stringify(nextPayload));
      setRecent(current => [item, ...current].slice(0, 3));
      setInboxCount(current => current + 1);
      setText("");
      setMessage("Сохранено во Входящие");
      if ("vibrate" in navigator) navigator.vibrate(35);
      window.setTimeout(() => { setMessage(""); textareaRef.current?.focus(); }, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally { setBusy(false); }
  }

  function dictate() {
    if (!voiceSupported || listening) return;
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setText(current => [current.trim(), transcript].filter(Boolean).join(" "));
    };
    recognition.onerror = () => { setListening(false); setMessage("Не удалось распознать речь"); };
    recognition.onend = () => { setListening(false); textareaRef.current?.focus(); };
    try { setListening(true); recognition.start(); } catch { setListening(false); }
  }

  if (mode === "checking") return <main className={styles.screen}><div className={styles.loader}><i/><span>NEXUS</span></div></main>;

  if (mode === "login") return <main className={styles.screen}><section className={styles.login}><div className={styles.logo}>N</div><small>ЛИЧНЫЙ ДОСТУП</small><h1>Открыть Входящие</h1><p>Введите тот же четырёхзначный PIN, что и на основном сайте.</p><form onSubmit={login}><input autoFocus type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={12} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ""))} placeholder="••••" aria-label="PIN-код"/><button type="submit" disabled={busy || pin.length < 4}>{busy ? "Проверяю…" : "Открыть"}</button></form>{message&&<div className={styles.error}>{message}</div>}</section></main>;

  return <main className={styles.screen}>
    <header className={styles.header}><div><span className={styles.logo}>N</span><div><strong>Входящие</strong><small>NEXUS · PARA</small></div></div><span className={styles.counter}>{inboxCount}</span></header>
    <section className={styles.capture}>
      <div className={styles.prompt}><small>ЧТО ПРИШЛО В ГОЛОВУ?</small><h1>Сохраните сейчас.<br/>Разберёте позже.</h1></div>
      <form onSubmit={save}>
        <textarea ref={textareaRef} value={text} onChange={event => setText(event.target.value)} placeholder="Например: позвонить врачу, идея для проекта, купить билеты…" maxLength={1200}/>
        <div className={styles.actions}>{voiceSupported&&<button type="button" className={`${styles.voice} ${listening?styles.listening:""}`} onClick={dictate}><span>{listening?"◉":"⌁"}</span>{listening?"Слушаю…":"Продиктовать"}</button>}<button type="submit" className={styles.save} disabled={!text.trim() || busy}>{busy?"Сохраняю…":"Сохранить →"}</button></div>
      </form>
      <div className={`${styles.feedback} ${message.includes("Сохранено")?styles.success:""}`} aria-live="polite">{message||"Без категорий и сроков — только быстрая фиксация"}</div>
      {recent.length>0&&<div className={styles.recent}><small>ТОЛЬКО ЧТО ДОБАВЛЕНО</small>{recent.map(item=><div key={item.id}><span>✓</span><p>{item.title}</p></div>)}</div>}
    </section>
    <footer className={styles.footer}><Link href="/#Проекты">Разобрать входящие на сайте</Link><details><summary>Добавить иконку на iPhone</summary><p>Откройте эту страницу в Safari → нажмите «Поделиться» → «На экран Домой».</p></details></footer>
  </main>;
}
