// Sample data: daily rows, Jan-Sep 2026, 3 locations. Used only if data/weather.csv is missing.
function buildSampleCSV(){
  let s=42; const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  const L={
    Ahmedabad:{t:[20,23,28,33,35,33,29,27,28],h:[40,35,32,35,45,68,80,82,72],r:[.02,.02,.03,.04,.08,.35,.6,.55,.3]},
    Mumbai:{t:[25,26,28,30,31,29,27,27,27],h:[60,62,66,70,72,86,90,89,84],r:[.01,.01,.02,.03,.1,.65,.85,.8,.55]},
    Delhi:{t:[14,18,24,31,35,35,32,30,29],h:[62,52,42,32,35,55,75,78,68],r:[.06,.07,.06,.04,.06,.25,.55,.55,.3]}};
  const D=["N","NE","E","SE","S","SW","W","NW"], dim=[31,28,31,30,31,30,31,31,30];
  const out=["date,location,temp_min,temp_avg,temp_max,humidity,rainfall,wind_speed,wind_direction"];
  for(const loc in L)for(let m=0;m<9;m++)for(let d=1;d<=dim[m];d++){
    const a=L[loc].t[m]+(rnd()-.5)*4, hum=Math.min(98,Math.max(15,L[loc].h[m]+(rnd()-.5)*20-(a-L[loc].t[m])*2));
    const rain=rnd()<L[loc].r[m]?(rnd()*40*(1+(m>=5&&m<=8?1.5:0))).toFixed(1):"0";
    const wind=(8+4*Math.sin((m-1)/8*Math.PI)+rnd()*6).toFixed(1);
    const mm=String(m+1).padStart(2,"0"), dd=String(d).padStart(2,"0");
    out.push([`2026-${mm}-${dd}`,loc,(a-6).toFixed(1),a.toFixed(1),(a+6).toFixed(1),hum.toFixed(0),rain,wind,D[Math.floor(rnd()*8)]].join(","));
  }
  return out.join("\n");
}