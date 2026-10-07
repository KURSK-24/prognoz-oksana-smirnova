/* =========================================================================
   Небо любого месяца в реальном времени (замена таблицы sky-data.js)
   Положения планет считает библиотека Astronomy Engine (Don Cross, MIT,
   точность около угловой минуты, astronomy.browser.min.js рядом).
   Формат результата тот же, что был у sky-data.js:
     {start, stepH, lon:{планета:[долгота*100,...]}, events:[{p,t,i,s,deg}]}
   Таблица строится на месяц плюс 2 дня с каждой стороны, шаг 2 часа
   (опорные точки реже, промежутки интерполяцией),
   поэтому калькулятор сам работает в любом месяце любого года
   ========================================================================= */
(function(){
"use strict";
var BODIES = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
var NAME = {sun:"Sun", moon:"Moon", mercury:"Mercury", venus:"Venus", mars:"Mars", jupiter:"Jupiter",
            saturn:"Saturn", uranus:"Uranus", neptune:"Neptune", pluto:"Pluto"};
var STEP_H = 2, MARGIN_D = 2;

function rev(x){ x = x % 360; return x < 0 ? x + 360 : x; }
function sdiff(x){ return ((x % 360) + 540) % 360 - 180; }

/* Видимая геоцентрическая эклиптическая долгота на дату, равноденствие даты */
function lonOf(body, date){
  var A = window.Astronomy;
  if (body === "sun") return rev(A.SunPosition(date).elon);
  if (body === "moon") return rev(A.EclipticGeoMoon(date).lon);
  return rev(A.Ecliptic(A.GeoVector(NAME[body], date, true)).elon);
}

/* Начало таблицы: 00:00 МСК первого числа минус запас */
function tableStart(year, month){ return Date.UTC(year, month, 1) - 3*3600*1000 - MARGIN_D*86400*1000; }

/* Опорные точки: планеты раз в сутки, Луна раз в 6 часов, затем интерполяция
   по 4 соседним точкам (Лагранж) на шаг 2 часа. Так в 10 раз меньше тяжёлых расчётов */
var BASE_H = {moon:6, sun:24, mercury:24, venus:24, mars:24, jupiter:24, saturn:24, uranus:24, neptune:24, pluto:24};

function samples(body, start, end){
  var h = BASE_H[body], stepMs = h*3600*1000, t0 = start - 2*stepMs;
  var cnt = Math.ceil((end + 2*stepMs - t0)/stepMs) + 1, raw = new Array(cnt);
  for (var k=0;k<cnt;k++) raw[k] = lonOf(body, new Date(t0 + k*stepMs));
  for (var m=1;m<cnt;m++) raw[m] = raw[m-1] + sdiff(raw[m] - raw[m-1]); /* разворачиваем через 360 */
  return {t0:t0, stepMs:stepMs, v:raw};
}
function interp(S, t){
  var x = (t - S.t0)/S.stepMs, k = Math.floor(x) - 1;
  if (k < 0) k = 0; if (k > S.v.length-4) k = S.v.length-4;
  var u = x - k, y = 0;
  for (var a=0;a<4;a++){
    var w = 1;
    for (var b=0;b<4;b++) if (b!==a) w *= (u - b)/(a - b);
    y += w * S.v[k+a];
  }
  return rev(y);
}

function buildSky(year, month){
  var start = tableStart(year, month);
  var end = Date.UTC(year, month+1, 1) - 3*3600*1000 + MARGIN_D*86400*1000;
  var stepMs = STEP_H*3600*1000;
  var n = Math.round((end - start) / stepMs) + 1;
  var lon = {}, base = {};
  for (var b=0;b<BODIES.length;b++){
    var p = BODIES[b], S = samples(p, start, end), arr = new Array(n);
    for (var i=0;i<n;i++) arr[i] = Math.round(interp(S, start + i*stepMs) * 100);
    lon[p] = arr; base[p] = S;
  }
  /* Смена знака: по таблице. Развороты: по точному суточному ходу из опорных точек (без округления) */
  var events = [], perDay = 24/STEP_H;
  var EV = ["sun","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
  var days = Math.floor((n-1)/perDay);
  for (var e=0;e<EV.length;e++){
    var q = EV[e], L = lon[q], prevSign = null;
    for (var k=perDay; k<n-perDay; k++){
      var sign = Math.floor(L[k]/3000) % 12;
      if (prevSign !== null && sign !== prevSign) events.push({p:q, t:"ingress", i:+(k/perDay).toFixed(3), s:sign});
      prevSign = sign;
    }
    if (q === "sun") continue;
    var prevRetro = null;
    for (var dd=1; dd<days; dd++){
      var t0 = start + dd*86400000 + 12*3600*1000;
      var retro = sdiff(interp(base[q], t0 + 86400000) - interp(base[q], t0 - 86400000)) < 0;
      if (prevRetro !== null && retro !== prevRetro){
        var here = interp(base[q], t0);
        events.push({p:q, t: retro ? "R" : "D", i:dd + 0.5, s:Math.floor(here/30) % 12, deg:+(here % 30).toFixed(2)});
      }
      prevRetro = retro;
    }
  }
  return {start:start, stepH:STEP_H, lon:lon, events:events};
}

window.buildSky = buildSky;
window.skyTableStart = tableStart;
})();
