/* =========================================================================
   Прогноз на месяц - интерпретация и интерфейс
   Оксана Смирнова · финансовый астролог

   Математика неба живёт в engine.js (реальные эфемериды, метод Schlyter,
   тот же движок, что у калькулятора Натальи Шакировой).
   Здесь смысловой слой голосом Оксаны: аспект медленной планеты к знаку
   Солнца -> сценарий месяца -> реальные даты -> что с этим делать ->
   вопрос про свой год, на который отвечает личный прогноз с датами.
   Все даты и ретроградности считаются, руками не вписаны.
   ========================================================================= */
(function(){
"use strict";

var A = window.ASTRO;

var MONTHS_NOM = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
var MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

var PLANET_NAME = {venus:"Венера", mars:"Марс", jupiter:"Юпитер", saturn:"Сатурн", mercury:"Меркурий"};

/* 0 - соединение, 3 - квадрат, 5 - квиконс, 6 - оппозиция: напряжённые; 1, 2, 4 - рабочие */
var HARD = {0:1, 3:1, 5:1, 6:1};

/* Сценарий месяца. По два варианта на тип, чтобы у разных сфер одного человека текст не совпадал */
var SCENARIO = {
  0: [
    function(p,s,g){ return p+" сейчас стоит прямо в вашем знаке, "+vo(s)+". Всё, что обычно тихо сидит в уголке, в этом месяце заговорит в полный голос и попросит решения"; },
    function(p,s,g){ return p+" пришёл в ваш знак, "+vo(s)+". Месяц усиления: то, на что вы привыкли закрывать глаза, будет мозолить их каждый день"; }
  ],
  1: [
    function(p,s,g){ return p+" "+vo(s)+" немного сбивает ваш ритм. Ничего страшного, просто привычное будет спотыкаться на мелочах, и раздражать это будет сильнее, чем стоит"; },
    function(p,s,g){ return p+" идёт "+vo(s)+" и чуть не попадает в ваш темп. То, что раньше делалось на автомате, сейчас просит внимания к деталям"; }
  ],
  2: [
    function(p,s,g){ return p+" "+vo(s)+" приоткрывает вам дверь. Узкую, но настоящую: сделаете первый шаг, и пойдёт быстрее обычного"; },
    function(p,s,g){ return p+" "+vo(s)+" играет на вашей стороне. Без фейерверков, зато то, что вы двигали месяцами, сейчас пойдёт легче"; }
  ],
  3: [
    function(p,s,g){ return p+" "+vo(s)+" встаёт к вашему знаку под прямым углом. Трение настоящее, и как раз оно сдвигает с места то, что стояло месяцами"; },
    function(p,s,g){ return p+" давит на ваш знак из "+g+". Вопрос, который вы откладывали, этот месяц отложить уже не даст"; }
  ],
  4: [
    function(p,s,g){ return p+" "+vo(s)+" идёт с вашим знаком в одном потоке. Поддержка приходит почти сама, главное не расслабиться и не проспать момент"; },
    function(p,s,g){ return p+" "+vo(s)+" дружит с вашим знаком. Редкий месяц, когда усилие и результат совпадают без надрыва"; }
  ],
  5: [
    function(p,s,g){ return p+" "+vo(s)+" создаёт рассинхрон: месяц тянет в одну сторону, вы в другую. Придётся выбрать, на двух стульях не усидеть"; },
    function(p,s,g){ return p+" смотрит на ваш знак из "+g+" искоса. Вроде всё по плану, а подкручивать на ходу приходится постоянно"; }
  ],
  6: [
    function(p,s,g){ return p+" "+vo(s)+" стоит ровно напротив вашего знака. Это зеркало: то, что сейчас бесит в других, полезно поискать в себе"; },
    function(p,s,g){ return p+" тянет одеяло с противоположной стороны вашего круга, из "+g+". Месяц про баланс между «хочу по-своему» и «надо договориться»"; }
  ]
};

var SUN_FLAVOR = {
  0:"Солнце в этом месяце идёт по вашему знаку: ваш личный новый год, время заявлять о себе громче обычного",
  1:"Солнце идёт по касательной к вашему знаку: месяц тихой перестройки, без резких поворотов",
  2:"Солнце вас поддерживает: хорошее время для новых знакомств и небольших смелых шагов",
  3:"Солнце давит на ваш знак: суеты и чужих требований будет больше обычного",
  4:"Солнце идёт с вашим знаком в одном потоке: многое в этом месяце даётся проще",
  5:"Солнце сбивает привычный ритм вашего знака: придётся чаще подстраиваться под обстоятельства",
  6:"Солнце стоит напротив вашего знака: месяц про баланс с окружающими"
};

var SPHERES = [
  {
    key:"money", title:"Деньги", icon:"₽", base:"jupiter", own:["jupiter","mercury"],
    lead:{
      hard:"В деньгах это соблазн: хочется вписаться в то, что выглядит быстрым и красивым, или закрыть тревогу покупкой. А такие траты потом разбираются дольше всех",
      easy:"В деньгах это окно. Деньги с неба не упадут, но закрыть давний денежный вопрос сейчас реально"
    },
    todo:{
      hard:"Ничего крупного не подписывайте и не переводите на эмоциях. Выждите сутки, перечитайте условия и фиксируйте только то, что уже точно ваше",
      easy:"Сделайте тот звонок или запрос по деньгам, который откладывали. Сейчас вас услышат быстрее обычного"
    },
    moonEasy:["Лёгкий денежный день: удачно просить, предлагать и закрывать вопрос по оплате","Ещё один день на подъёме: назначайте денежные встречи на него"],
    moonHard:["Напряжённый денежный день: легко потратить на эмоциях и переоценить силы","Ещё один день на пределе: не занимайте и не одалживайте, эмоции сильнее расчёта"],
    ask:{
      hard:"В каком месяце следующего года у меня откроется денежное окно, и когда лучше не рисковать?",
      easy:"Когда в следующем году просить повышение или запускать своё дело, чтобы это сработало?"
    }
  },
  {
    key:"love", title:"Любовь и отношения", icon:"♥", base:"venus", own:["venus"],
    lead:{
      hard:"В отношениях это трение на ровном месте. Спор из-за мелочи, которая вчера прошла бы мимо ушей. Месяц обостряет реакции у обоих",
      easy:"В отношениях это тепло, которое приходит само. Хочется близости, разговоры получаются без брони"
    },
    todo:{
      hard:"Отложите выяснение отношений до дня, когда отпустит. Сказанное сейчас запомнится дольше, чем оно того стоит",
      easy:"Не ждите первого шага от другого: напишите или позовите сами, сейчас это примут теплее"
    },
    moonEasy:["Мягкий день для разговора: хорошо для близости и честных слов","Ещё один тёплый день: подходит для разговора, который вы откладывали"],
    moonHard:["Острый день: раздражительность выше обычного, не выясняйте отношения сегодня","Ещё один резкий день: слова прозвучат жёстче, чем вы хотели"],
    ask:{
      hard:"Когда в следующем году этот узел в отношениях наконец развяжется?",
      easy:"В какие месяцы следующего года двери для серьёзных отношений будут открыты?"
    }
  },
  {
    key:"work", title:"Работа и дело", icon:"◆", base:"mars", own:["mars"],
    lead:{
      hard:"В работе это давление. Планы буксуют, ответы затягиваются. Идея при этом может быть отличной, просто момент просит пересобрать план, а паниковать рано",
      easy:"В работе это ход вперёд. Появляется энергия на задачи, которые стояли неделями, и получается с первого раза то, на что раньше уходило три"
    },
    todo:{
      hard:"Не продавливайте и не увольняйтесь на эмоциях. Разбейте задачу на три шага и сделайте только первый",
      easy:"Заявите о себе: отправьте предложение, попросите повышение, начните то, что тянули. Сейчас ваш ход стоит дороже"
    },
    moonEasy:["Рабочий день на подъёме: хорошо для переговоров и заявлений о себе","Ещё один сильный день: подходит для старта и первых шагов"],
    moonHard:["Тяжёлый рабочий день: легко поссориться с коллегами, новое не начинайте","Ещё один буксующий день: согласования затянутся, важное не назначайте"],
    ask:{
      hard:"Увольняться сейчас или в следующем году будет период, когда уйти легче?",
      easy:"Когда в следующем году мне лучше всего менять работу или начинать своё?"
    }
  },
  {
    key:"power", title:"Силы и состояние", icon:"☾", base:"saturn", own:["saturn"],
    lead:{
      hard:"По силам это батарейка на нуле. Энергия уходит в мысли по кругу: прокрутить разговор, представить худшее, поспорить в голове с тем, кого рядом нет",
      easy:"По силам это ровный месяц. Без эйфории, зато спокойно хватает на то, что вы забросили из-за усталости"
    },
    todo:{
      hard:"Снимите с себя один пункт из списка на этой неделе. Посмотрите, где утекают силы: чаще всего это чужая обязанность, которую вы молча тащите",
      easy:"Возьмитесь за то, что давно откладывали из-за нехватки сил. Сейчас вы это вытянете"
    },
    moonEasy:["Спокойный день: хорошо восстанавливаться и планировать","Ещё один ровный день: можно разобрать накопившееся без спешки"],
    moonHard:["День утечки сил: тревожность выше обычного, разгрузите день и лягте пораньше","Ещё один день на минимуме: не ставьте на него то, что требует выдержки"],
    ask:{
      hard:"Когда в следующем году мне можно выдохнуть, а когда беречь силы особенно?",
      easy:"В какие месяцы следующего года браться за большое, чтобы хватило сил довести?"
    }
  }
];

function vo(s){ return (/^(Льве|Львe)$/.test(s) ? "во " : "в ") + s; }

function pick(arr, seed){ return arr[seed % arr.length]; }

/* Всё, что стоит до двоеточия, выделяем жирным */
function hl(text){
  var i = text.indexOf(":");
  if (i === -1) return text;
  return "<b>" + text.slice(0, i+1) + "</b>" + text.slice(i+1);
}

function listDays(days, month){
  if (!days.length) return "";
  if (days.length === 1) return days[0] + " " + MONTHS_GEN[month];
  return days.slice(0,-1).join(", ") + " и " + days[days.length-1] + " " + MONTHS_GEN[month];
}

/* Луна возвращается в тот же аспект раз в ~27 дней, подходящие дни идут группами.
   Берём по одному дню из группы с зазором минимум 4 дня от уже занятых дат */
var MIN_GAP = 4;
function pickSpaced(days, need, taken, offset){
  if (!days.length) return [];
  var groups = [[days[0]]];
  for (var i=1;i<days.length;i++){
    if (days[i] - days[i-1] <= 1) groups[groups.length-1].push(days[i]);
    else groups.push([days[i]]);
  }
  var reps = groups.map(function(g){ return g[Math.floor(g.length/2)]; });
  if (offset && reps.length > 1){
    var cut = offset % reps.length;
    reps = reps.slice(cut).concat(reps.slice(0, cut));
  }
  var out = [];
  for (var r=0;r<reps.length && out.length<need;r++){
    var d = reps[r], ok = true;
    for (var t=0;t<taken.length;t++){ if (Math.abs(taken[t]-d) < MIN_GAP){ ok = false; break; } }
    if (!ok) continue;
    out.push(d); taken.push(d);
  }
  return out;
}

function planetEvents(planet, year, month){
  var ev = A.scanMonthEvents(planet, year, month);
  var out = [];
  for (var i=0;i<ev.length;i++){
    var e = ev[i];
    var name = PLANET_NAME[planet];
    if (e.type === "ingress"){
      out.push({day:e.day, t:name+" переходит в знак "+A.SIGN_GEN[e.sign]+": фон сферы меняется с этого дня"});
    } else if (e.type === "stationR"){
      out.push({day:e.day, t:name+" разворачивается назад: старое всплывает, новое лучше не начинать"});
    } else {
      out.push({day:e.day, t:name+" снова идёт вперёд: можно возвращаться к отложенным решениям"});
    }
  }
  return out;
}

function buildSphere(sp, signIdx, year, month){
  var mid = new Date(Date.UTC(year, month, 15, 12, 0, 0));
  var baseSign = A.signIndex(A.geoLongitude(sp.base, mid));
  var canonical = A.canonicalOffset(baseSign, signIdx);
  var raw = A.rawOffset(baseSign, signIdx);
  var hard = !!HARD[canonical];
  var side = (raw === canonical) ? 0 : 1;
  var seed = side + sp.key.length;

  var html = '<div class="sphere">';
  html += '<div class="sphere-top"><div class="sphere-ic">'+sp.icon+'</div><h3>'+sp.title+'</h3>';
  html += '<span class="tag '+(hard?"hard":"easy")+'">'+(hard?"держим ушки на макушке":"двери открыты")+'</span></div>';

  html += '<p>'+hl(pick(SCENARIO[canonical], seed)(PLANET_NAME[sp.base], A.SIGN_LOC[baseSign], A.SIGN_GEN[baseSign]))+'</p>';
  html += '<p>'+hl(hard ? sp.lead.hard : sp.lead.easy)+'</p>';

  var ev = [];
  for (var pi=0; pi<sp.own.length; pi++) ev = ev.concat(planetEvents(sp.own[pi], year, month));

  var rows = [], taken = [];
  for (var k=0;k<ev.length;k++){
    if (taken.indexOf(ev[k].day) !== -1) continue;
    taken.push(ev[k].day);
    rows.push({day:ev[k].day, t:ev[k].t});
  }

  var wantEasy = hard ? [2,4] : [4];
  var wantHard = hard ? [3] : [3,6];
  var dEasy = pickSpaced(A.moonAspectDays(year, month, signIdx, wantEasy, 31), 2, taken, sp.idx);
  var dHard = pickSpaced(A.moonAspectDays(year, month, signIdx, wantHard, 31), 2, taken, sp.idx+1);
  dEasy.sort(function(a,b){ return a-b; }); dHard.sort(function(a,b){ return a-b; });
  for (var i=0;i<dEasy.length;i++) rows.push({day:dEasy[i], t:sp.moonEasy[i]});
  for (var j=0;j<dHard.length;j++) rows.push({day:dHard[j], t:sp.moonHard[j]});
  rows.sort(function(a,b){ return a.day - b.day; });

  if (rows.length){
    html += '<table class="dtable"><tbody>';
    for (var m=0;m<rows.length;m++){
      html += '<tr><td class="d">'+rows[m].day+' '+MONTHS_GEN[month].slice(0,3)+'</td><td>'+rows[m].t+'</td></tr>';
    }
    html += '</tbody></table>';
  }

  var whenDays = (hard ? dHard : dEasy).slice();
  if (!whenDays.length) whenDays = (hard ? dEasy : dHard).slice();
  if (!whenDays.length) whenDays = rows.map(function(r){ return r.day; }).slice(0,2);
  whenDays.sort(function(a,b){ return a-b; });
  var whenText = whenDays.length
    ? listDays(whenDays, month) + ": ваши ключевые дни по этой сфере"
    : "Весь месяц фон держится ровно";
  html += '<div class="todo"><b>Что с этим делать</b><p>'+(hard ? sp.todo.hard : sp.todo.easy)+'</p>';
  html += '<p class="when"><span>Когда</span>'+whenText+'</p></div>';
  html += '<div class="ask"><p class="ask-top">Это ваш месяц по знаку</p>';
  html += '<p class="ask-intro">А вопрос про свой год у вас, скорее всего, звучит так:</p>';
  html += '<i>'+(hard ? sp.ask.hard : sp.ask.easy)+'</i>';
  html += '<a class="ask-link" href="#year-theory">Где увидеть ответ <span class="arw">&#8595;</span></a></div>';
  html += '</div>';
  return html;
}

function render(day, month1){
  var now = new Date();
  var y = now.getFullYear(), mo = now.getMonth();
  var signIdx = A.sunSignFromDate(day, month1);

  document.getElementById("signLine").textContent = A.SIGNS[signIdx] + ", " + MONTHS_NOM[mo];
  var mid = new Date(Date.UTC(y, mo, 15, 12, 0, 0));
  var sunSign = A.signIndex(A.geoLongitude("sun", mid));
  document.getElementById("metaLine").textContent = SUN_FLAVOR[A.canonicalOffset(sunSign, signIdx)];

  var out = "";
  for (var i=0;i<SPHERES.length;i++){ SPHERES[i].idx = i; out += buildSphere(SPHERES[i], signIdx, y, mo); }
  document.getElementById("spheres").innerHTML = out;

  var nextYear = y + 1;
  var yEls = document.querySelectorAll(".next-year");
  for (var k=0;k<yEls.length;k++) yEls[k].textContent = nextYear;

  var res = document.getElementById("result");
  res.classList.remove("hidden");
  res.scrollIntoView({behavior:"smooth", block:"start"});
}

/* ---------- селекты даты ---------- */
var selDay = document.getElementById("bdDay"),
    selMonth = document.getElementById("bdMonth"),
    selYear = document.getElementById("bdYear");

function fillSelect(el, from, to, labels, placeholder){
  var html = '<option value="" disabled selected>'+placeholder+'</option>';
  if (from <= to){ for (var i=from;i<=to;i++) html += '<option value="'+i+'">'+(labels?labels[i-1]:i)+'</option>'; }
  else { for (var j=from;j>=to;j--) html += '<option value="'+j+'">'+j+'</option>'; }
  el.innerHTML = html;
}
var thisYear = new Date().getFullYear();
fillSelect(selDay, 1, 31, null, "День");
fillSelect(selMonth, 1, 12, MONTHS_NOM, "Месяц");
fillSelect(selYear, thisYear, 1930, null, "Год");

/* Год для кодового слова и заголовков берётся из сегодняшней даты: калькулятор сам переходит на новый год */
(function(){
  var ny = new Date().getFullYear() + 1;
  var els = document.querySelectorAll(".next-year");
  for (var i=0;i<els.length;i++) els[i].textContent = ny;
  var cta = document.getElementById("ctaYear");
  if (cta) cta.href = "https://t.me/okssmi?text=" + ny;
})();

document.getElementById("form").addEventListener("submit", function(e){
  e.preventDefault();
  var err = document.getElementById("err");
  var day = +selDay.value, month1 = +selMonth.value, year = +selYear.value;
  if (!day || !month1 || !year){ err.classList.add("on"); return; }
  var test = new Date(year, month1-1, day);
  if (test.getDate() !== day || test.getMonth() !== month1-1){ err.classList.add("on"); return; }
  err.classList.remove("on");
  render(day, month1);
});
})();
