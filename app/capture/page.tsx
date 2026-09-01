"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [message, setMessage] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [recent, setRecent] = useState<InboxItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const voiceTimer = window.setTimeout(() => setVoiceSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition)), 0);
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 80);
    const countTimer = window.setTimeout(() => {
      try {
        const local = JSON.parse(localStorage.getItem("nexus-state") || "{}") as { inboxItems?: InboxItem[] };
        setInboxCount(Array.isArray(local.inboxItems) ? local.inboxItems.filter(item => item.status !== "organized").length : 0);
      } catch { /* count will update after the first capture */ }
    }, 0);
    return () => { window.clearTimeout(voiceTimer); window.clearTimeout(focusTimer); window.clearTimeout(countTimer); };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: title, website: "" }) });
      const result = await response.json().catch(() => ({})) as { error?: string; item?: InboxItem; count?: number; duplicate?: boolean };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить");
      if (!result.duplicate) {
        const item: InboxItem = result.item || { id: newInboxId(), title, kind: "note", createdAt: new Date().toISOString(), status: "new" };
        try {
          const local = JSON.parse(localStorage.getItem("nexus-state") || "{}") as Record<string, unknown>;
          const items = Array.isArray(local.inboxItems) ? local.inboxItems as InboxItem[] : [];
          localStorage.setItem("nexus-state", JSON.stringify({ ...local, inboxItems: [item, ...items.filter(row => row.id !== item.id)] }));
        } catch { /* the cloud copy is already saved */ }
        setRecent(current => [item, ...current].slice(0, 3));
      }
      if (typeof result.count === "number") setInboxCount(result.count); else if (!result.duplicate) setInboxCount(current => current + 1);
      setText("");
      setMessage(result.duplicate ? "Эта мысль уже во Входящих" : "Сохранено во Входящие");
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

  return <main className={styles.screen}>
    <header className={styles.header}><div><span className={styles.logo}>N</span><div><strong>Входящие</strong><small>NEXUS · PARA</small></div></div><span className={styles.counter}>{inboxCount}</span></header>
    <section className={styles.capture}>
      <div className={styles.prompt}><small>ЧТО ПРИШЛО В ГОЛОВУ?</small><h1>Сохраните сейчас.<br/>Разберёте позже.</h1></div>
      <form onSubmit={save}>
        <textarea ref={textareaRef} value={text} onChange={event => setText(event.target.value)} placeholder="Например: позвонить врачу, идея для проекта, купить билеты…" maxLength={1200}/>
        <div className={styles.actions}>{voiceSupported&&<button type="button" className={`${styles.voice} ${listening?styles.listening:""}`} onClick={dictate}><span>{listening?"◉":"⌁"}</span>{listening?"Слушаю…":"Продиктовать"}</button>}<button type="submit" className={styles.save} disabled={!text.trim() || busy}>{busy?"Сохраняю…":"Сохранить →"}</button></div>
      </form>
      <div className={`${styles.feedback} ${(message.includes("Сохранено")||message.includes("уже"))?styles.success:""}`} aria-live="polite">{message||"Без PIN, категорий и сроков — только быстрая фиксация"}</div>
      {recent.length>0&&<div className={styles.recent}><small>ТОЛЬКО ЧТО ДОБАВЛЕНО</small>{recent.map(item=><div key={item.id}><span>✓</span><p>{item.title}</p></div>)}</div>}
    </section>
    <footer className={styles.footer}><Link href="/#Проекты">Разобрать входящие на сайте</Link><details><summary>Добавить иконку на iPhone</summary><p>Откройте эту страницу в Safari → нажмите «Поделиться» → «На экран Домой».</p></details></footer>
  </main>;
}
