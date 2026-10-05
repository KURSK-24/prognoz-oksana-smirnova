(function(){
"use strict";
/* =========================================================================
   Эфемеридный движок для НАТАЛА по дате рождения.
   Метод Paul Schlyter (орбитальные элементы на равноденствие даты) +
   возмущения Юпитер-Сатурн. Сверено с NASA JPL DE421 (Skyfield) на 1500
   случайных датах 1930-2026, см. отчёт проверки.
   Транзиты месяца берутся НЕ отсюда, а из готовой таблицы JPL (sky-data.js)
   ========================================================================= */
  var RAD = Math.PI/180;
  function rev(x){ x = x - Math.floor(x/360)*360; return x<0? x+360 : x; }
  function daysSinceEpoch(date){
    var y=date.getUTCFullYear(), m=date.getUTCMonth()+1,
        d=date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes()/60)/24;
    return 367*y - Math.floor(7*(y+Math.floor((m+9)/12))/4) + Math.floor(275*m/9) + d - 730530;
  }
  function eccAnomaly(Mdeg, e){
    var M = rev(Mdeg)*RAD, E = M + e*Math.sin(M)*(1+e*Math.cos(M));
    for (var i=0;i<10;i++){ var dE=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E)); E-=dE; if(Math.abs(dE)<1e-9)break; }
    return E;
  }
  var ELEMENTS = {
    sun:     function(d){ return {N:0, i:0, w: rev(282.9404 + 4.70935e-5*d), a:1.000000, e: 0.016709 - 1.151e-9*d, M: rev(356.0470 + 0.9856002585*d)}; },
    mercury: function(d){ return {N: rev(48.3313 + 3.24587e-5*d), i: 7.0047 + 5.00e-8*d, w: rev(29.1241 + 1.01444e-5*d), a:0.387098, e:0.205635 + 5.59e-10*d, M: rev(168.6562 + 4.0923344368*d)}; },
    venus:   function(d){ return {N: rev(76.6799 + 2.46590e-5*d), i: 3.3946 + 2.75e-8*d, w: rev(54.8910 + 1.38374e-5*d), a:0.723330, e:0.006773 - 1.302e-9*d, M: rev(48.0052 + 1.6021302244*d)}; },
    mars:    function(d){ return {N: rev(49.5574 + 2.11081e-5*d), i: 1.8497 - 1.78e-8*d, w: rev(286.5016 + 2.92961e-5*d), a:1.523688, e:0.093405 + 2.516e-9*d, M: rev(18.6021 + 0.5240207766*d)}; },
    jupiter: function(d){ return {N: rev(100.4542 + 2.76854e-5*d), i: 1.3030 - 1.557e-7*d, w: rev(273.8777 + 1.64505e-5*d), a:5.20256, e:0.048498 + 4.469e-9*d, M: rev(19.8950 + 0.0830853001*d)}; },
    saturn:  function(d){ return {N: rev(113.6634 + 2.38980e-5*d), i: 2.4886 - 1.081e-7*d, w: rev(339.3939 + 2.97661e-5*d), a:9.55475, e:0.055546 - 9.499e-9*d, M: rev(316.9670 + 0.0334442282*d)}; }
  };
  function orbitalToEcliptic(el){
    var E = eccAnomaly(el.M, el.e);
    var xv = el.a*(Math.cos(E) - el.e), yv = el.a*(Math.sqrt(1-el.e*el.e)*Math.sin(E));
    var v = Math.atan2(yv,xv)/RAD, r = Math.sqrt(xv*xv+yv*yv);
    var Nr=el.N*RAD, ir=el.i*RAD, vwr=(v+el.w)*RAD;
    return {x: r*(Math.cos(Nr)*Math.cos(vwr) - Math.sin(Nr)*Math.sin(vwr)*Math.cos(ir)),
            y: r*(Math.sin(Nr)*Math.cos(vwr) + Math.cos(Nr)*Math.sin(vwr)*Math.cos(ir)),
            z: r*(Math.sin(vwr)*Math.sin(ir)), r:r};
  }
  function S(x){ return Math.sin(x*RAD); } function C(x){ return Math.cos(x*RAD); }
  function helio(planet, d){
    var p = orbitalToEcliptic(ELEMENTS[planet](d));
    if (planet!=="jupiter" && planet!=="saturn") return p;
    var lon = Math.atan2(p.y,p.x)/RAD, lat = Math.atan2(p.z, Math.sqrt(p.x*p.x+p.y*p.y))/RAD;
    var Mj = ELEMENTS.jupiter(d).M, Ms = ELEMENTS.saturn(d).M;
    if (planet==="jupiter"){
      lon += -0.332*S(2*Mj-5*Ms-67.6) -0.056*S(2*Mj-2*Ms+21) +0.042*S(3*Mj-5*Ms+21)
             -0.036*S(Mj-2*Ms) +0.022*C(Mj-Ms) +0.023*S(2*Mj-3*Ms+52) -0.016*S(Mj-5*Ms-69);
    } else {
      lon += 0.812*S(2*Mj-5*Ms-67.6) -0.229*C(2*Mj-4*Ms-2) +0.119*S(Mj-2*Ms-3)
             +0.046*S(2*Mj-6*Ms-69) +0.014*S(Mj-3*Ms+32);
      lat += -0.020*C(2*Mj-4*Ms-2) +0.018*S(2*Mj-6*Ms-49);
    }
    return {x:p.r*C(lat)*C(lon), y:p.r*C(lat)*S(lon), z:p.r*S(lat), r:p.r};
  }
  function geoLongitude(planet, date){
    var d = daysSinceEpoch(date);
    var s = orbitalToEcliptic(ELEMENTS.sun(d));
    if (planet === "sun") return rev(Math.atan2(s.y, s.x)/RAD);
    var p = helio(planet, d);
    return rev(Math.atan2(p.y + s.y, p.x + s.x)/RAD);
  }
  var SIGNS = ["Овен","Телец","Близнецы","Рак","Лев","Дева","Весы","Скорпион","Стрелец","Козерог","Водолей","Рыбы"];
  var SIGN_GEN = ["Овна","Тельца","Близнецов","Рака","Льва","Девы","Весов","Скорпиона","Стрельца","Козерога","Водолея","Рыб"];
  var SIGN_LOC = ["Овне","Тельце","Близнецах","Раке","Льве","Деве","Весах","Скорпионе","Стрельце","Козероге","Водолее","Рыбах"];
  function signIndex(lon){ return Math.floor(rev(lon)/30) % 12; }

  /* Натальные положения на полдень по Гринвичу дня рождения: без времени рождения
     погрешность Солнца не больше полградуса, быстрых планет - до градуса у Меркурия */
  var NATAL_PLANETS = ["sun","mercury","venus","mars","jupiter","saturn"];
  function natal(day, month1, year){
    var dt = new Date(Date.UTC(year, month1-1, day, 12, 0, 0)), out = {};
    for (var i=0;i<NATAL_PLANETS.length;i++) out[NATAL_PLANETS[i]] = geoLongitude(NATAL_PLANETS[i], dt);
    return out;
  }
  window.ASTRO = {SIGNS:SIGNS, SIGN_GEN:SIGN_GEN, SIGN_LOC:SIGN_LOC, rev:rev, signIndex:signIndex,
                  geoLongitude:geoLongitude, natal:natal, NATAL_PLANETS:NATAL_PLANETS};
})();
