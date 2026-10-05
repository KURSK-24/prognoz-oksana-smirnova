/* =========================================================================
   Прогноз на месяц по ДАТЕ РОЖДЕНИЯ - интерпретация и интерфейс
   Оксана Смирнова · финансовый астролог

   1. Натал: положения Солнца, Меркурия, Венеры, Марса, Юпитера и Сатурна
      на день рождения (engine.js, сверено с NASA JPL, ошибка до 0,06°)
   2. Небо месяца: считается на лету на любой месяц (sky-live.js, Astronomy Engine,
      сверено с NASA JPL DE421: расхождение до 0,01°)
   3. Ищем точные аспекты транзитных планет к ВАШИМ натальным градусам:
      соединение, секстиль, квадрат, трин, оппозиция. Дни по Москве
   Поэтому у двух людей одного знака даты и сюжеты разные: разные градусы
   Солнца и разные положения остальных планет на день рождения
   ========================================================================= */
(function(){
"use strict";

var A = window.ASTRO, SKY = null;

/* Цели Яндекс Метрики. Номер счётчика в index.html (window.YM_ID), пока 0 функция молчит. Дату рождения не передаём */
function goal(name){ try{ if (window.ym && window.YM_ID) window.ym(window.YM_ID, "reachGoal", name); }catch(e){} }

var MONTHS_NOM = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
var MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
var MONTHS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
var MONTHS_PREP = ["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];

var PL = {
  sun:{n:"Солнце", dat:"вашему Солнцу", ins:"с вашим Солнцем", g:"☉︎"}, moon:{n:"Луна", g:"☽︎"},
  mercury:{n:"Меркурий", dat:"вашему Меркурию", ins:"с вашим Меркурием", g:"☿︎"}, venus:{n:"Венера", dat:"вашей Венере", ins:"с вашей Венерой", g:"♀︎"},
  mars:{n:"Марс", dat:"вашему Марсу", ins:"с вашим Марсом", g:"♂︎"}, jupiter:{n:"Юпитер", dat:"вашему Юпитеру", ins:"с вашим Юпитером", g:"♃︎"},
  saturn:{n:"Сатурн", dat:"вашему Сатурну", ins:"с вашим Сатурном", g:"♄︎"}, uranus:{n:"Уран", g:"♅︎"},
  neptune:{n:"Нептун", g:"♆︎"}, pluto:{n:"Плутон", g:"♇︎"}
};
var NATAL_ROLE = {
  sun:"ваша сила и самоощущение",
  mercury:"переговоры, документы, решения головой",
  venus:"деньги, которые вы притягиваете, и то, как вы любите",
  mars:"ваша энергия и умение действовать",
  jupiter:"рост, удача и большие деньги",
  saturn:"обязательства, границы и долгие проекты"
};

/* Аспекты: угол, название, характер */
var ASPECTS = [
  {a:0, n:"соединение", k:"conj"}, {a:60, n:"секстиль", k:"soft"}, {a:90, n:"квадрат", k:"hard"},
  {a:120, n:"трин", k:"soft"}, {a:180, n:"оппозиция", k:"hard"}
];
function aspPhrase(T, asp, N){
  if (asp.a === 0) return PL[T].n + " проходит по " + PL[N].dat;
  var w = {60:"в секстиле к", 90:"в квадрате к", 120:"в трине к", 180:"в оппозиции к"}[asp.a];
  return PL[T].n + " " + w + " " + PL[N].dat;
}

/* Что приносит транзитная планета: соединение / гармония / напряжение */
var TR = {
  sun:{conj:"Свет падает прямо на эту точку: вас видят и с вами считаются. День заявить о себе",
       soft:"Лёгкий день по этой теме: всё идёт без сопротивления",
       hard:"Чужие требования сталкиваются с вашими планами. Спорить ради принципа не стоит"},
  mercury:{conj:"Голова занята именно этим: разговоры, переписка, цифры. Хорошо считать и договариваться",
       soft:"Удачный день для переговоров, писем и документов",
       hard:"Легко недопонять друг друга. Перечитайте написанное и уточните устные договорённости"},
  venus:{conj:"Венера на вашей точке: притяжение, приятные траты, тёплые встречи",
       soft:"Мягкий фон: проще договориться, вас слышат теплее",
       hard:"Желание порадовать себя сильнее расчёта. Ценник проверяйте дважды"},
  mars:{conj:"Энергии много, терпения мало. Направьте её в одно дело, а не в спор",
       soft:"Есть силы и смелость на шаг, на который раньше не решались",
       hard:"Напор и спешка: риск резких решений, конфликтов и импульсивных трат"},
  jupiter:{conj:"Юпитер на вашей точке бывает раз в 12 лет: время расширяться и просить больше",
       soft:"Юпитер поддерживает: окно для роста, полезных людей и денег через знания",
       hard:"Юпитер раздувает: соблазн взять больше, чем вытянете, и переплатить за обещания"},
  saturn:{conj:"Проверка на прочность: медленно и тяжело, зато то, что выдержит, останется надолго",
       soft:"Сатурн даёт опору: хорошо закреплять договорённости и строить долгое",
       hard:"Сатурн давит: сроки, ограничения, ответственность. Результат будет, но через усилие"},
  uranus:{conj:"Внезапные повороты: отмены, резкие новости, неожиданные предложения. Держите запас",
       soft:"Неожиданный шанс: новый способ, новый человек, новая идея",
       hard:"Внезапные повороты: отмены, резкие новости, неожиданные предложения. Держите запас"},
  neptune:{conj:"Границы размыты: легко обмануться или обмануть себя. Всё важное фиксируйте письменно",
       soft:"Включается интуиция: первому ощущению сейчас можно доверять",
       hard:"Границы размыты: легко обмануться или обмануть себя. Всё важное фиксируйте письменно"},
  pluto:{conj:"Глубокая перестройка: то, что держалось на привычке, уходит и освобождает место",
       soft:"Сила влияния: сейчас поддаётся то, что раньше не сдвигалось",
       hard:"Глубокая перестройка: то, что держалось на привычке, уходит и освобождает место"}
};
var RETRO_NOTE = {
  venus:"Венера сейчас идёт назад, поэтому тема приходит из прошлого: старые долги, бывшие, отложенные покупки",
  mercury:"Меркурий в ретрограде: перепроверяйте реквизиты, сроки и договорённости"
};

var BENEFIC = {venus:1, jupiter:1, sun:1};
var MALEFIC = {mars:1, saturn:1, uranus:1, neptune:1, pluto:1};
var PW = {sun:2, mercury:1.5, venus:3, mars:3, jupiter:4, saturn:5, uranus:5, neptune:5, pluto:5};
var NW = {sun:3, mercury:1, venus:2, mars:2, jupiter:1.5, saturn:1.5};
var SLOW = {jupiter:1, saturn:1, uranus:1, neptune:1, pluto:1};

/* Транзит к какой натальной точке в какую сферу идёт */
function sphereOf(T, N){
  if (N==="jupiter") return "money";
  if (N==="venus") return (T==="sun"||T==="venus"||T==="mars") ? "love" : "money";
  if (N==="mars") return T==="venus" ? "love" : "work";
  if (N==="saturn"||N==="mercury") return "work";
  if (N==="sun") return T==="venus" ? "love" : (T==="jupiter" ? "money" : "power");
  return "power";
}

var SPHERES = [
  { key:"money", title:"Деньги", icon:"₽", moonTo:"jupiter", natal:["venus","jupiter"],
    lead:{ hard:"В деньгах это соблазн: хочется вписаться в то, что выглядит быстрым и красивым, или закрыть тревогу покупкой. Такие траты потом разбираются дольше всех",
           easy:"В деньгах это окно. С неба ничего не упадёт, но закрыть давний денежный вопрос сейчас реально",
           calm:"Крупных транзитов к вашим денежным точкам в этом месяце нет. Фон ровный: хорошо считать, планировать и спокойно доводить начатое"},
    todo:{ hard:"Ничего крупного не подписывайте и не переводите на эмоциях. Выждите сутки, перечитайте условия и фиксируйте только то, что уже точно ваше",
           easy:"Сделайте тот звонок или запрос по деньгам, который откладывали. Сейчас вас услышат быстрее обычного",
           calm:"Сведите доходы и расходы за последние три месяца. Ровный месяц лучше всего подходит, чтобы увидеть, куда утекает"},
    moonEasy:["Лёгкий денежный день: удачно просить, предлагать и закрывать вопрос по оплате","Ещё один день на подъёме: назначайте на него денежные встречи"],
    moonHard:["Напряжённый денежный день: легко потратить на эмоциях","Ещё один день на пределе: не занимайте и не одалживайте, эмоции сильнее расчёта"],
    ask:{ hard:"В каком месяце следующего года у меня откроется денежное окно, и когда лучше не рисковать?",
          easy:"Когда в следующем году просить повышение или запускать своё дело, чтобы это сработало?" } },
  { key:"love", title:"Любовь и отношения", icon:"♥", moonTo:"venus", natal:["venus"],
    lead:{ hard:"В отношениях это трение на ровном месте. Спор из-за мелочи, которая вчера прошла бы мимо ушей",
           easy:"В отношениях это тепло, которое приходит само. Хочется близости, разговоры получаются без брони",
           calm:"Сильных транзитов к вашей Венере в этом месяце нет. Отношения живут в своём ритме, и погода в них зависит от вас больше, чем от неба"},
    todo:{ hard:"Отложите выяснение отношений до дня, когда отпустит. Сказанное сейчас запомнится дольше, чем оно того стоит",
           easy:"Не ждите первого шага: напишите или позовите сами, сейчас это примут теплее",
           calm:"Выберите один лунный день из таблицы ниже для разговора или свидания и не тратьте его на быт"},
    moonEasy:["Мягкий день для разговора: хорошо для близости и честных слов","Ещё один тёплый день: подходит для разговора, который вы откладывали"],
    moonHard:["Острый день: раздражительность выше обычного, отношения сегодня не выясняйте","Ещё один резкий день: слова прозвучат жёстче, чем вы хотели"],
    ask:{ hard:"Когда в следующем году этот узел в отношениях наконец развяжется?",
          easy:"В какие месяцы следующего года двери для серьёзных отношений будут открыты?" } },
  { key:"work", title:"Работа и дело", icon:"◆", moonTo:"mars", natal:["mars","saturn","mercury"],
    lead:{ hard:"В работе это давление. Планы буксуют, ответы затягиваются. Идея может быть отличной, просто момент просит пересобрать план",
           easy:"В работе это ход вперёд. Появляется энергия на задачи, которые стояли неделями",
           calm:"Крупных транзитов к вашим рабочим точкам в этом месяце нет. Хороший месяц для рутины, которую вы откладывали"},
    todo:{ hard:"Не продавливайте и не увольняйтесь на эмоциях. Разбейте задачу на три шага и сделайте только первый",
           easy:"Заявите о себе: отправьте предложение, попросите повышение, начните то, что тянули",
           calm:"Закройте хвосты и подготовьте почву: следующий активный период по работе лучше встречать с чистым столом"},
    moonEasy:["Рабочий день на подъёме: хорошо для переговоров и заявлений о себе","Ещё один сильный день: подходит для старта и первых шагов"],
    moonHard:["Тяжёлый рабочий день: легко поссориться с коллегами, новое не начинайте","Ещё один буксующий день: согласования затянутся, важное не назначайте"],
    ask:{ hard:"Увольняться сейчас или в следующем году будет период, когда уйти легче?",
          easy:"Когда в следующем году мне лучше всего менять работу или начинать своё?" } },
  { key:"power", title:"Силы и состояние", icon:"☾", moonTo:"sun", natal:["sun"],
    lead:{ hard:"По силам батарейка садится быстрее обычного. Энергия уходит в мысли по кругу: прокрутить разговор, представить худшее",
           easy:"По силам это ровный и поддерживающий месяц. Хватает на то, что вы забросили из-за усталости",
           calm:"Сильных транзитов к вашему Солнцу нет. Самочувствие сейчас больше зависит от режима, чем от неба"},
    todo:{ hard:"Снимите с себя один пункт из списка на этой неделе. Чаще всего силы утекают в чужую обязанность, которую вы молча тащите",
           easy:"Возьмитесь за то, что давно откладывали из-за нехватки сил. Сейчас вы это вытянете",
           calm:"Поставьте сон и прогулки в календарь так же, как встречи. Ровный месяц хорошо копит ресурс на следующий"},
    moonEasy:["Спокойный день: хорошо восстанавливаться и планировать","Ещё один ровный день: можно разобрать накопившееся без спешки"],
    moonHard:["День утечки сил: тревожность выше обычного, разгрузите день и лягте пораньше","Ещё один день на минимуме: не ставьте на него то, что требует выдержки"],
    ask:{ hard:"Когда в следующем году мне можно выдохнуть, а когда беречь силы особенно?",
          easy:"В какие месяцы следующего года браться за большое, чтобы хватило сил довести?" } }
];

/* ---------- небо месяца из таблицы JPL ---------- */
/* Небо считается на лету на нужный месяц (sky-live.js), таблица начинается за 2 дня до 1-го числа */
var SKY_START = 0, SKY_KEY = "";
var STEP_MS = 2 * 3600 * 1000;
function useSky(year, month){
  var key = year + "-" + month;
  if (SKY_KEY === key) return;
  SKY = window.buildSky(year, month); SKY_START = SKY.start; SKY_KEY = key;
}
function lonAt(p, i){ return SKY.lon[p][i] / 100; }
function idxToDate(i){ return new Date(SKY_START + i*STEP_MS + 3*3600*1000); } // в МСК как UTC-поля
function monthRange(year, month){
  var a = Math.round((Date.UTC(year, month, 1) - 3*3600*1000 - SKY_START) / STEP_MS);
  var b = Math.round((Date.UTC(year, month+1, 1) - 3*3600*1000 - SKY_START) / STEP_MS);
  return [Math.max(0, a), Math.min(SKY.lon.sun.length-1, b)];
}
function sdiff(x){ return ((x % 360) + 540) % 360 - 180; }
function isRetroAt(p, i){
  var j = Math.min(i+6, SKY.lon[p].length-1), k = Math.max(i-6, 0);
  return sdiff(lonAt(p,j) - lonAt(p,k)) < 0;
}

/* Точные аспекты транзитов к натальным градусам за месяц */
function findTransits(nat, r){
  var out = [], TP = ["sun","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
  for (var t=0;t<TP.length;t++){
    var T = TP[t];
    for (var n=0;n<A.NATAL_PLANETS.length;n++){
      var N = A.NATAL_PLANETS[n];
      for (var q=0;q<ASPECTS.length;q++){
        var asp = ASPECTS[q];
        var targets = (asp.a===0||asp.a===180) ? [nat[N]+asp.a] : [nat[N]+asp.a, nat[N]-asp.a];
        for (var g=0; g<targets.length; g++){
          var tg = targets[g], found = false, best = 99, bestI = r[0], w0 = -1, w1 = -1;
          if (SLOW[T]){
            for (var i=r[0]; i<r[1]; i++){
              var fs = Math.abs(sdiff(lonAt(T,i) - tg));
              if (fs < best){ best = fs; bestI = i; }
              if (fs <= 1.0){ if (w0 < 0) w0 = i; w1 = i; }
            }
            if (best <= 1.0){
              var ev = mk(T, N, asp, bestI, best < 0.05, best);
              ev.peak = best < 0.15 && bestI > r[0]+6 && bestI < r[1]-7; // пик внутри месяца, а не на краю
              ev.win = [idxToDate(w0).getUTCDate(), idxToDate(Math.min(w1, r[1]-1)).getUTCDate()];
              ev.whole = (w0 <= r[0]+12 && w1 >= r[1]-12);
              out.push(ev);
            }
            continue;
          }
          for (var i=r[0]; i<=r[1]; i++){
            var f = sdiff(lonAt(T,i) - tg);
            if (Math.abs(f) < best){ best = Math.abs(f); bestI = i; }
            if (i>r[0]){
              var f0 = sdiff(lonAt(T,i-1) - tg);
              if ((f0 <= 0) !== (f <= 0) && Math.abs(f0 - f) < 10){
                var ii = (i-1) + f0/(f0 - f); // момент точного аспекта внутри шага
                out.push(mk(T, N, asp, ii, true));
                found = true;
              }
            }
          }
        }
      }
    }
  }
  return out;
}
function mk(T, N, asp, i, exact, orb){
  var d = idxToDate(i);
  var nature = asp.k === "conj" ? (BENEFIC[T] ? "soft" : (MALEFIC[T] ? "hard" : "soft")) : asp.k;
  return {T:T, N:N, asp:asp, i:i, day:d.getUTCDate(), month:d.getUTCMonth(), exact:exact, orb:orb||0,
          nature:nature, retro: isRetroAt(T, Math.round(i)), sphere: sphereOf(T, N),
          w: PW[T] * NW[N] * (asp.a===60 ? 0.7 : 1)};
}

/* Дни Луны в точном аспекте к натальной точке */
function moonDays(target, r, wantAngles){
  var res = [];
  var tg = [];
  for (var a=0;a<wantAngles.length;a++){
    var ang = wantAngles[a];
    tg.push(target+ang); if (ang!==0 && ang!==180) tg.push(target-ang);
  }
  for (var g=0; g<tg.length; g++){
    for (var i=r[0]+1;i<=r[1];i++){
      var f0 = sdiff(lonAt("moon",i-1) - tg[g]), f1 = sdiff(lonAt("moon",i) - tg[g]);
      if ((f0<=0)!==(f1<=0) && Math.abs(f0-f1) < 20){ var d = idxToDate((i-1) + f0/(f0-f1)); if (d.getUTCMonth()===idxToDate(r[0]+1).getUTCMonth()) res.push(d.getUTCDate()); }
    }
  }
  res.sort(function(a,b){ return a-b; });
  return res.filter(function(v,k){ return res.indexOf(v)===k; });
}
function pickSpaced(days, need, taken){
  var out = [];
  for (var k=0;k<days.length && out.length<need;k++){
    var d = days[k], ok = true;
    for (var t=0;t<taken.length;t++) if (Math.abs(taken[t]-d) < 3){ ok = false; break; }
    if (ok){ out.push(d); taken.push(d); }
  }
  return out;
}

/* ---------- вывод ---------- */
function deg(lon){ var x = A.rev(lon) % 30; var dd = Math.floor(x), mm = Math.floor((x-dd)*60); return dd + "°" + (mm<10?"0":"") + mm + "'"; }
function where(lon){ return deg(lon) + " " + A.SIGN_GEN[A.signIndex(lon)]; }
function hl(text){ var i = text.indexOf(":"); return i===-1 ? text : "<b>"+text.slice(0,i+1)+"</b>"+text.slice(i+1); }
function dlabel(day, month){ return day + " " + MONTHS_SHORT[month]; }
function listDays(days, month){
  if (!days.length) return "";
  if (days.length === 1) return days[0] + " " + MONTHS_GEN[month];
  return days.slice(0,-1).join(", ") + " и " + days[days.length-1] + " " + MONTHS_GEN[month];
}

function periodLabel(e, month){
  if (!e.win) return dlabel(e.day, month);
  if (e.whole) return "весь<br>месяц";
  if (e.win[0] === e.win[1]) return dlabel(e.win[0], month);
  return e.win[0] + "-" + e.win[1] + "<br>" + MONTHS_SHORT[month];
}
function peakText(e){
  if (!e.win) return ", точно " + e.day + " " + MONTHS_GEN[e.month];
  var per = e.whole ? "действует весь месяц" : "действует с " + e.win[0] + " по " + e.win[1] + " " + MONTHS_GEN[e.month];
  return ", " + per + (e.peak ? ", пик " + e.day + " " + MONTHS_GEN[e.month] : "");
}
function eventText(e, nat){
  var s = aspPhrase(e.T, e.asp, e.N) + " (" + where(nat[e.N]) + ")";
  var body = TR[e.T][e.asp.a===0 ? "conj" : e.nature];
  if (e.retro && RETRO_NOTE[e.T]) body += ". " + RETRO_NOTE[e.T];
  return {head:s, body:body};
}

function buildSphere(sp, evs, nat, r, month){
  var mine = evs.filter(function(e){ return e.sphere === sp.key; });
  mine.sort(function(a,b){ return b.w - a.w; });
  var top = mine.slice(0, 5);
  var score = 0;
  for (var k=0;k<mine.length;k++) score += (mine[k].nature==="soft" ? 1 : -1) * mine[k].w;
  var mode = !mine.length ? "calm" : (score < 0 ? "hard" : "easy");

  var pts = sp.natal.slice();
  for (var q=0;q<mine.length;q++) if (pts.indexOf(mine[q].N)===-1) pts.push(mine[q].N);
  var natLine = pts.map(function(N){ return PL[N].n + " в " + where(nat[N]); }).join(" · ");

  var html = '<article class="sphere sphere-'+sp.key+'">';
  html += '<div class="sphere-top"><div class="sphere-ic">'+sp.icon+'</div><h3>'+sp.title+'</h3>';
  html += '<span class="tag '+mode+'">'+({hard:"держим ушки на макушке", easy:"двери открыты", calm:"ровный фон"})[mode]+'</span></div>';
  html += '<p class="natline"><span>Ваши точки на день рождения</span>'+natLine+'</p>';

  if (top.length){
    var lead = eventText(top[0], nat);
    html += '<p class="keyev"><b>Главное по сфере в '+MONTHS_PREP[month]+':</b> '+lead.head+
            peakText(top[0]) + '</p>';
  }
  html += '<p>'+hl(sp.lead[mode])+'</p>';

  var rows = [], taken = [];
  top.sort(function(a,b){ return a.i - b.i; });
  for (var t=0;t<top.length;t++){
    var e = top[t], tx = eventText(e, nat);
    rows.push({key: e.win ? (e.whole ? 0 : e.win[0]) : e.day, d: periodLabel(e, month),
               t:'<b>'+tx.head+'</b>'+(e.win && e.peak ? ', пик '+e.day+' '+MONTHS_GEN[e.month] : '')+'. '+tx.body, n:e.nature});
    if (!e.win) taken.push(e.day);
  }
  var easyAng = (sp.moonTo==="venus"||sp.moonTo==="jupiter") ? [0,60,120] : [60,120];
  var dEasy = pickSpaced(moonDays(nat[sp.moonTo], r, easyAng), 2, taken);
  var dHard = pickSpaced(moonDays(nat[sp.moonTo], r, [90,180]), 2, taken);
  var mt = PL[sp.moonTo].ins;
  for (var a=0;a<dEasy.length;a++) rows.push({key:dEasy[a], d:dlabel(dEasy[a], month), t:'<b>Луна в гармонии '+mt+'.</b> '+sp.moonEasy[a], n:"soft"});
  for (var b=0;b<dHard.length;b++) rows.push({key:dHard[b], d:dlabel(dHard[b], month), t:'<b>Луна в напряжении '+mt+'.</b> '+sp.moonHard[b], n:"hard"});
  rows.sort(function(x,y){ return x.key - y.key; });

  html += '<ul class="dates">';
  for (var m=0;m<rows.length;m++) html += '<li class="'+rows[m].n+'"><span class="d">'+rows[m].d+'</span><span class="t">'+rows[m].t+'</span></li>';
  html += '</ul>';

  var keyDays = mode==="hard" ? dHard.concat(top.filter(function(e){return !e.win && e.nature==="hard";}).map(function(e){return e.day;}))
                              : dEasy.concat(top.filter(function(e){return !e.win && e.nature==="soft";}).map(function(e){return e.day;}));
  keyDays = keyDays.filter(function(v,k){ return keyDays.indexOf(v)===k; }).sort(function(x,y){return x-y;}).slice(0,4);
  html += '<div class="todo"><b>Что с этим делать</b><p>'+sp.todo[mode]+'</p>';
  if (keyDays.length) html += '<p class="when"><span>Когда</span>'+listDays(keyDays, month)+'</p>';
  html += '</div>';
  html += '<p class="nuance"><span>Важный нюанс</span>'+NUANCE[sp.key]+'</p>';
  html += '<div class="ask"><p class="ask-intro">А вопрос про свой год у вас, скорее всего, звучит так:</p>';
  html += '<i>'+sp.ask[mode==="hard" ? "hard" : "easy"]+'</i>';
  html += '<a class="ask-link" href="#year-theory">Где увидеть ответ <span class="arw">&#8595;</span></a></div>';
  html += '</article>';
  return html;
}

var NUANCE = {"money": "Здесь видно, <b>когда</b>. А через что именно придут или уйдут деньги: зарплата, клиенты, крупная покупка, долг, зависит от времени и места вашего рождения. По ним считаются дома гороскопа, и одни и те же даты у разных людей срабатывают в разных делах. Эту поправку я делаю в индивидуальном прогнозе", "love": "Даты по дате рождения показывают погоду. С кем и в каком сценарии она сыграет: партнёр, новое знакомство, бывший, зависит от времени вашего рождения, оно задаёт дом отношений в карте. Эти нюансы я разбираю только в индивидуальном прогнозе", "work": "Без времени рождения не видно вашей оси карьеры: где в карте стоит вершина гороскопа и какие транзиты бьют прямо в неё. Из-за этого один и тот же квадрат у одного человека про начальника, у другого про собственный проект. Такие корректировки я делаю в индивидуальном прогнозе", "power": "Самочувствие в астрологии сильнее всего читается по Луне и Асценденту, а они зависят от точного времени рождения: Луна за сутки проходит целых 13 градусов. Поэтому здесь общий фон, а точные периоды спада и подъёма я считаю в индивидуальном прогнозе"};

var SKY_TEXT = {
  ingress:function(p,s){ return PL[p].n+" переходит в знак "+A.SIGN_GEN[s]; },
  R:function(p,s){ return PL[p].n+" разворачивается назад в знаке "+A.SIGN_GEN[s]+(p==="venus"?": время пересматривать траты и отношения, а не начинать новые":p==="mercury"?": перепроверяйте документы и договорённости":""); },
  D:function(p,s){ return PL[p].n+" снова идёт вперёд в знаке "+A.SIGN_GEN[s]; }
};
function skyOfMonth(year, month){
  var r = monthRange(year, month), out = [];
  for (var k=0;k<SKY.events.length;k++){
    var e = SKY.events[k], d = idxToDate(Math.round(e.i*24/SKY.stepH));
    if (d.getUTCFullYear()===year && d.getUTCMonth()===month) out.push({day:d.getUTCDate(), t:SKY_TEXT[e.t](e.p, e.s)});
  }
  out.sort(function(a,b){ return a.day-b.day; });
  return out;
}

function currentMonth(){
  var now = new Date(Date.now() + 3*3600*1000);
  return {y:now.getUTCFullYear(), m:now.getUTCMonth()};
}

function render(day, month1, year){
  var cm = currentMonth(), y = cm.y, mo = cm.m;
  var nat = A.natal(day, month1, year);
  useSky(y, mo);
  var r = monthRange(y, mo);
  var sunSign = A.signIndex(nat.sun);

  document.getElementById("signLine").textContent = A.SIGNS[sunSign];
  document.getElementById("dateLine").textContent = day + " " + MONTHS_GEN[month1-1] + " " + year + " · " + MONTHS_NOM[mo] + " " + y;

  var chips = "";
  for (var i=0;i<A.NATAL_PLANETS.length;i++){
    var N = A.NATAL_PLANETS[i];
    chips += '<li><span class="pg">'+PL[N].g+'</span><span class="pn">'+PL[N].n+'</span><span class="pd">'+where(nat[N])+'</span><span class="pr">'+NATAL_ROLE[N]+'</span></li>';
  }
  document.getElementById("natal").innerHTML = chips;

  var sky = skyOfMonth(y, mo), sh = "";
  for (var s=0;s<sky.length;s++) sh += '<li><span class="d">'+dlabel(sky[s].day, mo)+'</span><span class="t">'+sky[s].t+'</span></li>';
  document.getElementById("skyList").innerHTML = sh;

  var evs = findTransits(nat, r);
  var out = "";
  for (var k=0;k<SPHERES.length;k++) out += buildSphere(SPHERES[k], evs, nat, r, mo);
  document.getElementById("spheres").innerHTML = out;

  var res = document.getElementById("result");
  res.classList.remove("hidden");
  res.scrollIntoView({behavior:"smooth", block:"start"});
}

/* ---------- селекты даты ---------- */
var selDay = document.getElementById("bdDay"), selMonth = document.getElementById("bdMonth"), selYear = document.getElementById("bdYear");
function fillSelect(el, from, to, labels, placeholder){
  var html = '<option value="" disabled selected>'+placeholder+'</option>';
  if (from <= to){ for (var i=from;i<=to;i++) html += '<option value="'+i+'">'+(labels?labels[i-1]:i)+'</option>'; }
  else { for (var j=from;j>=to;j--) html += '<option value="'+j+'">'+j+'</option>'; }
  el.innerHTML = html;
}
fillSelect(selDay, 1, 31, null, "День");
fillSelect(selMonth, 1, 12, MONTHS_NOM, "Месяц");
fillSelect(selYear, new Date().getFullYear(), 1930, null, "Год");

(function(){
  var cm = currentMonth();
  var els = document.querySelectorAll(".cur-month");
  for (var i=0;i<els.length;i++) els[i].textContent = (els[i].getAttribute("data-case")==="prep" ? MONTHS_PREP : MONTHS_NOM)[cm.m] + " " + cm.y;
})();

/* Небо текущего месяца считаем заранее, пока человек выбирает дату: кнопка срабатывает сразу */
setTimeout(function(){ try{ var cm = currentMonth(); useSky(cm.y, cm.m); }catch(e){} }, 300);

document.getElementById("form").addEventListener("submit", function(e){
  e.preventDefault();
  var err = document.getElementById("err");
  var day = +selDay.value, month1 = +selMonth.value, year = +selYear.value;
  if (!day || !month1 || !year){ err.classList.add("on"); return; }
  var test = new Date(year, month1-1, day);
  if (test.getDate() !== day || test.getMonth() !== month1-1){ err.classList.add("on"); return; }
  err.classList.remove("on");
  render(day, month1, year);
  goal("calc_submit");
});

/* Год для кодового слова и заголовков из сегодняшней даты: калькулятор сам переходит на новый год */
(function(){
  var ny = new Date().getFullYear() + 1;
  var els = document.querySelectorAll(".next-year");
  for (var i=0;i<els.length;i++) els[i].textContent = ny;
  var cta = document.getElementById("ctaYear");
  if (cta){ cta.href = "https://t.me/okssmi?text=" + ny; cta.addEventListener("click", function(){ goal("click_" + ny); }); }
  var cm = document.getElementById("ctaMoney");
  if (cm) cm.addEventListener("click", function(){ goal("click_dengi"); });
})();

window.__PROGNOZ_TEST = {useSky:useSky, natal:A.natal, findTransits:findTransits, monthRange:monthRange, moonDays:moonDays, render:render};
})();
