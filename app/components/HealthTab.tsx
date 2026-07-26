"use client";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import * as Shared from "./shared";
const { C, Card, Lbl, calcHealthPatterns } = Shared;

const NumField = ({ label, icon, val, set, step = 1, min = 0, max, unit }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
    <span style={{ width: 22, textAlign: "center" }}>{icon}</span>
    <span style={{ flex: 1, fontSize: 12, color: C.muted }}>{label}</span>
    <input
      type="number"
      value={val ?? ""}
      step={step}
      min={min}
      max={max}
      onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
      style={{ width: 64, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", color: C.text, fontSize: 12, textAlign: "right" }}
    />
    {unit && <span style={{ fontSize: 10, color: C.muted, width: 24 }}>{unit}</span>}
  </div>
);

export function HealthTab({ health, shealth, TD }) {
  const today = health[TD] || {};
  const upd = (field) => (v) => shealth({ ...health, [TD]: { ...today, [field]: v } });
  const { insights, rows } = calcHealthPatterns(health);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }} className="fu">
      <b>Здоровье</b>

      <Card>
        <Lbl>Сегодня</Lbl>
        <NumField label="Сон" icon="😴" val={today.sleep} set={upd("sleep")} step={0.5} max={14} unit="ч" />
        <NumField label="Шаги" icon="👣" val={today.steps} set={upd("steps")} step={500} max={40000} unit="" />
        <NumField label="Вода" icon="💧" val={today.water} set={upd("water")} step={0.1} max={6} unit="л" />
        <NumField label="Кофе" icon="☕" val={today.coffee} set={upd("coffee")} step={1} max={10} unit="чаш." />
        <NumField label="Вес" icon="⚖️" val={today.weight} set={upd("weight")} step={0.1} max={250} unit="кг" />
        <NumField label="Дискомфорт" icon="🩹" val={today.symptom} set={upd("symptom")} step={1} max={10} unit="/10" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <span style={{ width: 22, textAlign: "center" }}>🏃</span>
          <span style={{ flex: 1, fontSize: 12, color: C.muted }}>Спорт был</span>
          <div
            onClick={() => upd("workout")(!today.workout)}
            style={{ width: 51, height: 31, borderRadius: 16, background: today.workout ? C.green : C.dim, position: "relative", cursor: "pointer", transition: "background .2s" }}
          >
            <div style={{ position: "absolute", top: 2, left: today.workout ? 22 : 2, width: 27, height: 27, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,.25)", transition: "left .2s" }} />
          </div>
        </div>
      </Card>

      <Card>
        <Lbl>Сон за 14 дней</Lbl>
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={rows}>
            <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} />
            <Tooltip />
            <Bar dataKey="sleep" radius={[2, 2, 0, 0]}>
              {rows.map((r, i) => <Cell key={i} fill={r.sleep >= 7 ? C.green : r.sleep >= 5 ? C.cyan : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <Lbl>Дискомфорт за 14 дней</Lbl>
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={rows}>
            <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} />
            <Tooltip />
            <Bar dataKey="symptom" radius={[2, 2, 0, 0]}>
              {rows.map((r, i) => <Cell key={i} fill={r.symptom >= 6 ? C.red : r.symptom >= 3 ? C.amber : C.dim} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card glow>
        <Lbl>🔍 Закономерности</Lbl>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {insights.map((t, i) => (
            <div key={i} style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>• {t}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}
