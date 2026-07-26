const KEY='lifeos_v3';
const today=()=>new Date().toISOString().slice(0,10);
const state=JSON.parse(localStorage.getItem(KEY)||'{"money":[],"tasks":[],"habits":[]}');
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function shekel(n){return '₪'+Math.round(n);}
function openScreen(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(id).classList.add('active');}
function walletBalance(w){return state.money.reduce((s,x)=>{if(x.wallet!==w)return s;let sign=x.type==='income'?1:-1;return s+sign*x.amount;},0)}
function renderMoney(){
 const d=today(),m=d.slice(0,7),list=state.money;
 const exp=list.filter(x=>x.type==='expense'),inc=list.filter(x=>x.type==='income');
 const todaySum=exp.filter(x=>x.date===d).reduce((s,x)=>s+x.amount,0);
 const monthSum=exp.filter(x=>x.date.slice(0,7)===m).reduce((s,x)=>s+x.amount,0);
 const incSum=inc.filter(x=>x.date.slice(0,7)===m).reduce((s,x)=>s+x.amount,0);
 ['todayTotal','monthTotal','incomeTotal','balanceTotal'].forEach(id=>{if(!document.getElementById(id))return});
 document.getElementById('todayTotal').textContent=shekel(todaySum);
 document.getElementById('monthTotal').textContent=shekel(monthSum);
 document.getElementById('incomeTotal').textContent=shekel(incSum);
 document.getElementById('balanceTotal').textContent=shekel(incSum-monthSum);
 const wb=document.getElementById('wallets');
 if(wb)wb.innerHTML=`<div class="wallet"><b>Наличка</b><p>${shekel(walletBalance('cash'))}</p></div><div class="wallet"><b>Карта</b><p>${shekel(walletBalance('card'))}</p></div><div class="wallet"><b>Кредитка</b><p class="danger">${shekel(walletBalance('credit'))}</p><span class="small">списание 10-го</span></div>`;
 const box=document.getElementById('transactions');
 if(box)box.innerHTML=list.slice().reverse().map((x,ri)=>{let i=list.length-1-ri;return `<div class="card item"><span><b>${x.type==='income'?'Доход':'Затрата'} · ${x.wallet}</b><br><span class="small">${x.date} · ${x.note||'без описания'}</span></span><span><b>${shekel(x.amount)}</b><br><button onclick="editMoney(${i})">Ред.</button></span></div>`}).join('');
}
function editMoney(i){const x=state.money[i];const a=prompt('Сумма',x.amount);if(!a)return;const n=prompt('Комментарий',x.note||'');const d=prompt('Дата YYYY-MM-DD',x.date);x.amount=Number(a.replace(',','.'));x.note=n;x.date=d||x.date;save();renderMoney();}
function renderTasks(){const box=document.getElementById('taskList');if(!box)return;box.innerHTML=state.tasks.map((t,i)=>`<div class="card item"><span>${t.done?'✅':'⬜'} ${t.text}</span><button onclick="toggleTask(${i})">OK</button></div>`).join('');}
function toggleTask(i){state.tasks[i].done=!state.tasks[i].done;save();renderTasks();}
function renderHabits(){const box=document.getElementById('habitList');if(!box)return;const d=today();box.innerHTML=state.habits.map((h,i)=>{h.days=h.days||{};let done=h.days[d];return `<div class="card habit"><div><b>${h.text}</b><p class="small">${done?'выполнено сегодня':'не отмечено'}</p></div><button class="check ${done?'done':''}" onclick="toggleHabit(${i})">✓</button></div>`}).join('');}
function toggleHabit(i){const d=today();state.habits[i].days=state.habits[i].days||{};state.habits[i].days[d]=!state.habits[i].days[d];save();renderHabits();}
function init(){
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openScreen(b.dataset.open));
 const date=document.getElementById('date');if(date)date.value=today();
 const mf=document.getElementById('moneyForm');if(mf)mf.onsubmit=e=>{e.preventDefault();let amount=Number(document.getElementById('amount').value.replace(',','.'));if(!amount)return;state.money.push({type:document.getElementById('type').value,wallet:document.getElementById('wallet').value,amount,note:document.getElementById('note').value,date:document.getElementById('date').value||today()});document.getElementById('amount').value='';document.getElementById('note').value='';save();renderMoney();};
 const tf=document.getElementById('taskForm');if(tf)tf.onsubmit=e=>{e.preventDefault();let text=document.getElementById('taskText').value.trim();if(!text)return;state.tasks.push({text,done:false});document.getElementById('taskText').value='';save();renderTasks();};
 const hf=document.getElementById('habitForm');if(hf)hf.onsubmit=e=>{e.preventDefault();let text=document.getElementById('habitText').value.trim();if(!text)return;state.habits.push({text,days:{}});document.getElementById('habitText').value='';save();renderHabits();};
 renderMoney();renderTasks();renderHabits();
}
init();