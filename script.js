const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DIRS=["N","NE","E","SE","S","SW","W","NW"];
const CONDS=["Sunny","Cloudy","Rain","Overcast","Clear"];
const PAL=["#fbc02d","#1e88e5","#78909c","#90caf9","#66bb6a"];
const DPAL=["#1e56b8","#7fc4f4","#f58a3a","#fdd835","#5cb860","#16a39a","#9eabb5","#7e57c2"];
const ALIAS={date:["date","datetime","day"],location:["location","city","station"],
  tmin:["temp_min","tmin","min_temp","mintemp"],tavg:["temp_avg","tavg","avg_temp","temperature","temp"],
  tmax:["temp_max","tmax","max_temp","maxtemp"],hum:["humidity","hum","rh"],
  rain:["rainfall","rain","precipitation","precip"],wind:["wind_speed","windspeed","wind"],
  dir:["wind_direction","wind_dir","winddir"],cond:["condition","weather_condition","weather"]};

let DATA=[], charts={};
const $=id=>document.getElementById(id);
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:NaN};
const avg=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN};
const fmt=(v,u,d=1)=>Number.isFinite(v)?v.toFixed(d)+" "+u:"N/A";
const season=m=>(m===11||m<=1)?"Winter":m<=4?"Summer":m<=8?"Monsoon":"Post-monsoon";

/* ---------- 1. LOAD ---------- */
async function load(){
  let text;
  try{const r=await fetch("data/weather.csv");if(!r.ok)throw 0;text=await r.text();if(text.trim().split("\n").length<2)throw 0;}
  catch(e){text=buildSampleCSV();$("msg").textContent="Showing sample data (Jan-Sep 2026). Add data/weather.csv to use your own.";}
  DATA=parseCSV(text);
  if(!DATA.length){$("msg").textContent="No valid rows found in the CSV.";return;}
  buildFilters();update();initAuto();
}

/* ---------- 2. PARSE ---------- */
function parseDate(s){
  s=(s||"").trim(); let m;
  if(m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))return new Date(+m[1],+m[2]-1,+m[3]);
  if(m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/))return new Date(+m[3],+m[2]-1,+m[1]);
  const d=new Date(s);return isNaN(d)?null:d;
}
function dirLabel(v){
  if(v==null||v==="")return null; const n=parseFloat(v);
  if(isFinite(n)&&/^[\d.\-]+$/.test(String(v).trim()))return DIRS[Math.round(((n%360)+360)%360/45)%8];
  const u=String(v).trim().toUpperCase();return DIRS.includes(u)?u:null;
}
function guessCond(r){
  if(r.rain>2)return"Rain"; if(r.hum>80)return"Overcast"; if(r.hum>65)return"Cloudy";
  return r.tmax>=35?"Sunny":"Clear";
}
function parseCSV(text){
  const lines=text.replace(/\r/g,"").split("\n").filter(l=>l.trim());
  const head=lines.shift().split(",").map(h=>h.trim().toLowerCase().replace(/[\s\-]+/g,"_"));
  const idx={};for(const k in ALIAS)idx[k]=head.findIndex(h=>ALIAS[k].includes(h));
  if(idx.date<0){$("msg").textContent="CSV needs a 'date' column.";return[];}
  const rows=[];
  for(const line of lines){
    const c=line.split(","), g=k=>idx[k]>=0?(c[idx[k]]||"").trim():"";
    const date=parseDate(g("date")); if(!date)continue;
    const r={date,year:date.getFullYear(),month:date.getMonth(),season:season(date.getMonth()),
      location:g("location")||"Default",tmin:num(g("tmin")),tavg:num(g("tavg")),tmax:num(g("tmax")),
      hum:num(g("hum")),rain:num(g("rain")),wind:num(g("wind")),dir:dirLabel(g("dir"))};
    if(!Number.isFinite(r.tavg)&&Number.isFinite(r.tmin)&&Number.isFinite(r.tmax))r.tavg=(r.tmin+r.tmax)/2;
    r.cond=g("cond")||guessCond(r); rows.push(r);
  }
  return rows;
}

/* ---------- 3. FILTERS ---------- */
function fill(id,vals,def){
  $(id).innerHTML=`<option value="All">All</option>`+vals.map(v=>`<option value="${v.v??v}">${v.t??v}</option>`).join("");
  if(def!=null)$(id).value=def;
  $(id).onchange=update;
}
function buildFilters(){
  const u=k=>[...new Set(DATA.map(r=>r[k]))];
  const years=u("year").sort();
  fill("f-year",years,years[years.length-1]);
  fill("f-month",u("month").sort((a,b)=>a-b).map(m=>({v:m,t:MONTHS[m]})));
  fill("f-location",u("location").sort());
  fill("f-condition",u("cond").sort());
  fill("f-season",["Winter","Summer","Monsoon","Post-monsoon"]);
}
function filtered(skipMonth){
  const f={year:$("f-year").value,month:$("f-month").value,location:$("f-location").value,
    cond:$("f-condition").value,season:$("f-season").value};
  return DATA.filter(r=>(f.year==="All"||r.year==+f.year)&&(skipMonth||f.month==="All"||r.month==+f.month)&&
    (f.location==="All"||r.location===f.location)&&(f.cond==="All"||r.cond===f.cond)&&
    (f.season==="All"||r.season===f.season));
}

/* ---------- 4. UPDATE ---------- */
function update(){
  const rows=filtered(), allM=filtered(true), col=k=>rows.map(r=>r[k]);
  const fd=d=>d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).replace(/ /g,"-");
  if(!rows.length){
    $("period").textContent="No data";
    ["k-avg","k-max","k-min","k-hum","k-rain","k-wind"].forEach(i=>$(i).textContent="N/A");
    $("msg").textContent="No data for the selected filters.";
    Object.values(charts).forEach(c=>{c.data.datasets.forEach(d=>d.data=[]);c.update();});return;
  }
  if($("msg").textContent==="No data for the selected filters.")$("msg").textContent="";
  const times=rows.map(r=>+r.date);
  $("period").textContent=`${fd(new Date(Math.min(...times)))}  to  ${fd(new Date(Math.max(...times)))}`;

  const locs=new Set(rows.map(r=>r.location)).size||1;
  const rainSum=col("rain").filter(Number.isFinite).reduce((a,b)=>a+b,0)/locs;
  $("k-avg").textContent=fmt(avg(col("tavg")),"°C");
  $("k-max").textContent=fmt(Math.max(...col("tmax").filter(Number.isFinite)),"°C");
  $("k-min").textContent=fmt(Math.min(...col("tmin").filter(Number.isFinite)),"°C");
  $("k-hum").textContent=fmt(avg(col("hum")),"%",0);
  $("k-rain").textContent=fmt(rainSum,"mm",0);
  $("k-wind").textContent=fmt(avg(col("wind")),"km/h");

  // temperature chart: monthly, or daily when one month is selected
  const months=[...new Set(rows.map(r=>r.year*12+r.month))].sort((a,b)=>a-b);
  const daily=months.length===1;
  const keyOf=r=>daily?r.date.getDate():r.year*12+r.month;
  const keys=daily?[...new Set(rows.map(keyOf))].sort((a,b)=>a-b):months;
  const labels=keys.map(k=>daily?String(k):MONTHS[k%12]);
  const by=k=>rows.filter(r=>keyOf(r)===k);

  // rain + wind charts: always all months, selected month highlighted
  const mMonths=[...new Set(allM.map(r=>r.year*12+r.month))].sort((a,b)=>a-b);
  const mLabels=mMonths.map(k=>MONTHS[k%12]);
  const mBy=k=>allM.filter(r=>r.year*12+r.month===k);
  const sel=$("f-month").value;
  const hi=mMonths.map(k=>sel==="All"||k%12===+sel);

  draw("temp","line",{labels,datasets:[
    ln("Max Temperature",keys.map(k=>avg(by(k).map(r=>r.tmax))),"#e53935"),
    ln("Avg Temperature",keys.map(k=>avg(by(k).map(r=>r.tavg))),"#fbb02d"),
    ln("Min Temperature",keys.map(k=>avg(by(k).map(r=>r.tmin))),"#1e88e5")]},axes(daily?"Day":"Month","Temperature (°C)"),true);
  draw("rain","bar",{labels:mLabels,datasets:[{label:"Rainfall (mm)",borderRadius:3,
    backgroundColor:hi.map(h=>h?"#1e88e5":"#bbdefb"),
    data:mMonths.map(k=>mBy(k).map(r=>r.rain).filter(Number.isFinite).reduce((a,b)=>a+b,0)/locs)}]},axes("Month","Rainfall (mm)"),false);
  draw("wind","line",{labels:mLabels,datasets:[{...ln("Wind Speed",mMonths.map(k=>avg(mBy(k).map(r=>r.wind))),"#16a085"),
    pointRadius:hi.map(h=>h?7:3),pointBackgroundColor:hi.map(h=>h?"#16a085":"#b2dfdb")}]},
    axes("Month","Wind Speed (km/h)"),false);

  const cc=CONDS.concat([...new Set(rows.map(r=>r.cond))].filter(c=>!CONDS.includes(c)));
  draw("cond","doughnut",{labels:cc,datasets:[{data:cc.map(c=>rows.filter(r=>r.cond===c).length),
    backgroundColor:cc.map((c,i)=>PAL[i]||"#b0bec5"),borderWidth:2,borderColor:"#fff"}]},pieOpt(),true,"right");
  draw("dir","pie",{labels:DIRS,datasets:[{data:DIRS.map(d=>rows.filter(r=>r.dir===d).length),
    backgroundColor:DPAL,borderWidth:2,borderColor:"#fff"}]},pieOpt(),true,"right");

  let pts=rows.filter(r=>Number.isFinite(r.tavg)&&Number.isFinite(r.hum)).map(r=>({x:r.tavg,y:r.hum}));
  if(pts.length>2000){const st=Math.ceil(pts.length/2000);pts=pts.filter((_,i)=>i%st===0);}
  draw("scatter","scatter",{datasets:[{label:"Day",data:pts,backgroundColor:"rgba(30,136,229,.65)",pointRadius:3}]},
    axes("Temperature (°C)","Humidity (%)",true),false);
}

/* ---------- 5. CHART HELPERS ---------- */
const ln=(label,data,color)=>({label,data,borderColor:color,backgroundColor:color,tension:.35,pointRadius:3,borderWidth:2.5});
const axes=(x,y,linearX)=>({scales:{
  x:{title:{display:true,text:x},grid:{display:false},...(linearX?{type:"linear"}:{})},
  y:{title:{display:true,text:y},beginAtZero:!linearX,grid:{color:"#e8eff7"}}}});
const pieOpt=()=>({cutout:undefined});
function draw(id,type,data,opt,legend,pos="top"){
  const o={responsive:true,maintainAspectRatio:false,...opt,
    plugins:{legend:{display:legend,position:pos,labels:{usePointStyle:true,boxWidth:8}}}};
  if(type==="doughnut")o.cutout="52%";
  if(type==="pie"||type==="doughnut")o.plugins.tooltip={callbacks:{label:c=>{
    const t=c.dataset.data.reduce((a,b)=>a+b,0)||1;return `${c.label}: ${c.raw} (${(c.raw/t*100).toFixed(0)}%)`;}}};
  if(charts[id]){charts[id].data=data;charts[id].options=o;charts[id].update();}
  else charts[id]=new Chart($("ch-"+id),{type,data,options:o});
}

/* ---------- 6. AUTO ROTATE MONTHS (every 5 sec) ---------- */
let timer=null;
function nextMonth(){
  const sel=$("f-month"), opts=[...sel.options].filter(o=>o.value!=="All");
  if(!opts.length)return;
  const i=opts.findIndex(o=>o.value===sel.value);
  sel.value=opts[(i+1)%opts.length].value;
  update();
}
function setAuto(on){
  clearInterval(timer);timer=null;
  if(on)timer=setInterval(nextMonth,5000);
  $("auto").textContent=on?"⏸ Pause":"▶ Play";
}
function initAuto(){
  $("auto").onclick=()=>setAuto(!timer);
  $("f-month").addEventListener("change",()=>setAuto(false));
  setAuto(true);nextMonth();
}

load();