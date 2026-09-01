"use client";
/* eslint-disable @next/next/no-img-element -- local previews use blob URLs */

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./capture.module.css";

type InboxAttachment = { id: string; type: "image" | "audio"; name: string; mimeType: string; path: string; size: number };
type InboxItem = { id: number; title: string; kind: "idea" | "task" | "note"; createdAt: string; status: "new" | "organized"; attachments?: InboxAttachment[] };
type CaptureFile = { id: string; file: File; preview: string };

const maxRecordingSeconds = 90;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function compressImage(file: File): Promise<File> {
  if (file.size <= 750_000 && ["image/jpeg", "image/webp"].includes(file.type)) return Promise.resolve(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("Не удалось обработать фото")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error("Не удалось обработать фото")); return; }
        resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" }));
      }, "image/jpeg", .76);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Не удалось открыть фото")); };
    image.src = url;
  });
}

export default function CapturePage() {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<CaptureFile[]>([]);
  const [audio, setAudio] = useState<CaptureFile | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const photosRef = useRef<CaptureFile[]>([]);
  const audioRef = useRef<CaptureFile | null>(null);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => { audioRef.current = audio; }, [audio]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 80);
    const countTimer = window.setTimeout(() => {
      try {
        const local = JSON.parse(localStorage.getItem("nexus-state") || "{}") as { inboxItems?: InboxItem[] };
        setInboxCount(Array.isArray(local.inboxItems) ? local.inboxItems.filter(item => item.status !== "organized").length : 0);
      } catch { /* count updates after saving */ }
    }, 0);
    return () => {
      window.clearTimeout(focusTimer); window.clearTimeout(countTimer);
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      photosRef.current.forEach(item => URL.revokeObjectURL(item.preview));
      if (audioRef.current) URL.revokeObjectURL(audioRef.current.preview);
    };
  }, []);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const available = Math.max(0, 3 - photos.length);
    if (!available) { setMessage("Можно добавить до трёх фото"); return; }
    setMessage("");
    try {
      const prepared = await Promise.all(Array.from(files).slice(0, available).map(compressImage));
      if (prepared.some(file => file.size > 1_600_000)) throw new Error("Фото слишком большое");
      setPhotos(current => [...current, ...prepared.map(file => ({ id: newId(), file, preview: URL.createObjectURL(file) }))]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось добавить фото"); }
  }

  function removePhoto(id: string) {
    setPhotos(current => current.filter(item => { if (item.id === id) URL.revokeObjectURL(item.preview); return item.id !== id; }));
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function toggleRecording() {
    if (recording) { stopRecording(); return; }
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) { setMessage("Запись голоса не поддерживается этим браузером"); return; }
    try {
      setMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred, audioBitsPerSecond: 48_000 } : { audioBitsPerSecond: 48_000 });
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop()); streamRef.current = null;
        if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null;
        const mimeType = recorder.mimeType.split(";")[0] || "audio/webm";
        const extension = mimeType === "audio/mp4" ? "m4a" : mimeType === "audio/mpeg" ? "mp3" : mimeType === "audio/ogg" ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size) {
          if (audioRef.current) URL.revokeObjectURL(audioRef.current.preview);
          const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: mimeType });
          setAudio({ id: newId(), file, preview: URL.createObjectURL(file) });
        }
        setRecording(false);
      };
      recorder.onerror = () => { setMessage("Не удалось записать голос"); stopRecording(); };
      setRecordingSeconds(0); setRecording(true); recorder.start(500);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds(current => { if (current + 1 >= maxRecordingSeconds) stopRecording(); return Math.min(maxRecordingSeconds, current + 1); }), 1000);
    } catch { setMessage("Разрешите доступ к микрофону и попробуйте ещё раз"); setRecording(false); }
  }

  function removeAudio() {
    if (audio) URL.revokeObjectURL(audio.preview);
    setAudio(null); setRecordingSeconds(0);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (recording) { stopRecording(); return; }
    if ((!text.trim() && !photos.length && !audio) || busy) return;
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.append("text", text.trim()); form.append("website", "");
      photos.forEach(item => form.append("attachments", item.file)); if (audio) form.append("attachments", audio.file);
      const response = await fetch("/api/capture", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as { error?: string; item?: InboxItem; count?: number; duplicate?: boolean };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить");
      if (result.item) {
        try {
          const local = JSON.parse(localStorage.getItem("nexus-state") || "{}") as Record<string, unknown>;
          const items = Array.isArray(local.inboxItems) ? local.inboxItems as InboxItem[] : [];
          localStorage.setItem("nexus-state", JSON.stringify({ ...local, inboxItems: [result.item, ...items.filter(row => row.id !== result.item?.id)] }));
        } catch { /* cloud copy is authoritative */ }
      }
      if (typeof result.count === "number") setInboxCount(result.count); else if (!result.duplicate) setInboxCount(current => current + 1);
      setText(""); photos.forEach(item => URL.revokeObjectURL(item.preview)); setPhotos([]); removeAudio();
      setMessage(result.duplicate ? "Уже во Входящих" : "Сохранено");
      if ("vibrate" in navigator) navigator.vibrate(35);
      window.setTimeout(() => { setMessage(""); textareaRef.current?.focus(); }, 1500);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось сохранить"); }
    finally { setBusy(false); }
  }

  const canSave = Boolean(text.trim() || photos.length || audio) && !busy && !recording;

  return <main className={styles.screen}>
    <header className={styles.header}><strong>Входящие</strong><span>{inboxCount}</span></header>
    <form className={styles.composer} onSubmit={save}>
      <textarea ref={textareaRef} value={text} onChange={event => setText(event.target.value)} placeholder="Напишите мысль…" maxLength={1200}/>
      {(photos.length>0||audio)&&<div className={styles.attachments}>
        {photos.map(item=><div className={styles.photo} key={item.id}><img src={item.preview} alt="Добавленное фото"/><button type="button" onClick={()=>removePhoto(item.id)} aria-label="Удалить фото">×</button></div>)}
        {audio&&<div className={styles.audio}><audio controls src={audio.preview}/><button type="button" onClick={removeAudio} aria-label="Удалить запись">×</button></div>}
      </div>}
      <div className={styles.actions}>
        <button type="button" className={`${styles.tool} ${recording?styles.recording:""}`} onClick={toggleRecording} aria-label={recording?"Остановить запись":"Записать голос"}><span>{recording?"■":"●"}</span>{recording?formatDuration(recordingSeconds):"Голос"}</button>
        <button type="button" className={styles.tool} onClick={()=>photoInputRef.current?.click()} disabled={photos.length>=3}><span>▧</span>Фото</button>
        <input ref={photoInputRef} className={styles.fileInput} type="file" accept="image/*" capture="environment" multiple onChange={event=>{void addPhotos(event.target.files);event.currentTarget.value=""}}/>
        <button type="submit" className={styles.save} disabled={!canSave}>{busy?"Сохраняю…":"Сохранить"}</button>
      </div>
    </form>
    <div className={`${styles.feedback} ${message==="Сохранено"||message.includes("Уже")?styles.success:""}`} aria-live="polite">{message}</div>
    <Link className={styles.siteLink} href="/nexus">Открыть NEXUS</Link>
  </main>;
}
