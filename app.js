/* ローマ字タイピング練習 - 動作ロジック
   index.html / style.css / app.js / words.js は同じフォルダに置いてください。
   単語・短文データは words.js（ROMAJI_WORD_BANK）を参照します。

   構成:
     1. RomajiEngine … 入力判定のしくみ（画面とは独立。window.RomajiEngine としてテストからも呼べます）
     2. 画面の制御   … 設定・待機・カウントダウン・出題・成績表・キーボード表示
*/

/* =====================================================================
   1. 入力判定エンジン
   方針: 実際の日本語入力（Microsoft IME / Google 日本語入力）で
         正しく変換される打ち方だけを正解にする。
         IMEでは別の文字になってしまう打ち方は、練習でも正解にしない。
   ===================================================================== */
var RomajiEngine = (function () {
  "use strict";

  // 1文字（または拗音などの2文字）に対応するローマ字
  var TABLE = {
    "あ":["a"],"い":["i"],"う":["u"],"え":["e"],"お":["o"],
    "か":["ka","ca"],"き":["ki"],"く":["ku","cu","qu"],"け":["ke"],"こ":["ko","co"],
    "が":["ga"],"ぎ":["gi"],"ぐ":["gu"],"げ":["ge"],"ご":["go"],
    "さ":["sa"],"し":["shi","si","ci"],"す":["su"],"せ":["se","ce"],"そ":["so"],
    "ざ":["za"],"じ":["ji","zi"],"ず":["zu"],"ぜ":["ze"],"ぞ":["zo"],
    "た":["ta"],"ち":["chi","ti"],"つ":["tsu","tu"],"て":["te"],"と":["to"],
    "だ":["da"],"ぢ":["di"],"づ":["du"],"で":["de"],"ど":["do"],
    "な":["na"],"に":["ni"],"ぬ":["nu"],"ね":["ne"],"の":["no"],
    "は":["ha"],"ひ":["hi"],"ふ":["fu","hu"],"へ":["he"],"ほ":["ho"],
    "ば":["ba"],"び":["bi"],"ぶ":["bu"],"べ":["be"],"ぼ":["bo"],
    "ぱ":["pa"],"ぴ":["pi"],"ぷ":["pu"],"ぺ":["pe"],"ぽ":["po"],
    "ま":["ma"],"み":["mi"],"む":["mu"],"め":["me"],"も":["mo"],
    "や":["ya"],"ゆ":["yu"],"よ":["yo"],
    "ら":["ra"],"り":["ri"],"る":["ru"],"れ":["re"],"ろ":["ro"],
    "わ":["wa"],"を":["wo"],

    // 拗音
    "きゃ":["kya"],"きゅ":["kyu"],"きょ":["kyo"],
    "ぎゃ":["gya"],"ぎゅ":["gyu"],"ぎょ":["gyo"],
    "しゃ":["sha","sya"],"しゅ":["shu","syu"],"しょ":["sho","syo"],"しぇ":["she","sye"],
    "じゃ":["ja","zya","jya"],"じゅ":["ju","zyu","jyu"],"じょ":["jo","zyo","jyo"],"じぇ":["je","zye","jye"],
    "ちゃ":["cha","tya","cya"],"ちゅ":["chu","tyu","cyu"],"ちょ":["cho","tyo","cyo"],"ちぇ":["che","tye","cye"],
    "ぢゃ":["dya"],"ぢゅ":["dyu"],"ぢょ":["dyo"],
    "にゃ":["nya"],"にゅ":["nyu"],"にょ":["nyo"],
    "ひゃ":["hya"],"ひゅ":["hyu"],"ひょ":["hyo"],
    "びゃ":["bya"],"びゅ":["byu"],"びょ":["byo"],
    "ぴゃ":["pya"],"ぴゅ":["pyu"],"ぴょ":["pyo"],
    "みゃ":["mya"],"みゅ":["myu"],"みょ":["myo"],
    "りゃ":["rya"],"りゅ":["ryu"],"りょ":["ryo"],

    // 外来語で使う組み合わせ（ti / di / tu / du はIMEでは ち・ぢ・つ・づ になるので含めない）
    "てぃ":["thi"],"でぃ":["dhi"],"てゅ":["thu"],"でゅ":["dhu"],
    "とぅ":["twu"],"どぅ":["dwu"],
    "ふぁ":["fa"],"ふぃ":["fi"],"ふぇ":["fe"],"ふぉ":["fo"],
    "うぁ":["wha"],"うぃ":["wi","whi"],"うぇ":["we","whe"],"うぉ":["who"],
    "つぁ":["tsa"],"つぃ":["tsi"],"つぇ":["tse"],"つぉ":["tso"],
    "くぁ":["kwa","qa"],"くぃ":["qi"],"くぇ":["qe"],"くぉ":["qo"],"ぐぁ":["gwa"],
    "ゔ":["vu"],"ゔぁ":["va"],"ゔぃ":["vi"],"ゔぇ":["ve"],"ゔぉ":["vo"],

    // 小さい文字を単独で打つ場合（x / l どちらでも）
    "ぁ":["xa","la"],"ぃ":["xi","li"],"ぅ":["xu","lu"],"ぇ":["xe","le"],"ぉ":["xo","lo"],
    "ゃ":["xya","lya"],"ゅ":["xyu","lyu"],"ょ":["xyo","lyo"],"ゎ":["xwa","lwa"],
    "っ":["xtu","ltu","xtsu","ltsu"],

    // 記号
    "ー":["-"],"。":["."],"、":[","],"！":["!"],"？":["?"]
  };

  var SMALL = "ぁぃぅぇぉゃゅょゎ";      // 前の文字と組み合わせて1音になる小さい文字
  var STOPS = "。、！？ー";              // 「ん」「っ」の直後に来たとき、語末と同じ扱いにする文字
  var N_NEEDS_DOUBLE = "aiueoyn";        // 「ん」をn1つで打ったあと、この文字が続くとIMEでは別の文字になる

  function uniq(a) { var o = [], s = {}; for (var i = 0; i < a.length; i++) { if (!s[a[i]]) { s[a[i]] = 1; o.push(a[i]); } } return o; }

  // 位置 i から始まる1音（拗音などは2文字）を読み取り、{kana, pat} を返す
  function readUnit(w, i) {
    var c = w[i], nx = w[i + 1];
    if (nx && SMALL.indexOf(nx) >= 0 && TABLE[c]) {
      var two = c + nx, pats = (TABLE[two] || []).slice();
      // 「き」+「ゃ」のように、小さい文字を分けて打つ方法も正解にする（ki + xya など）
      TABLE[c].forEach(function (a) { TABLE[nx].forEach(function (b) { pats.push(a + b); }); });
      return { kana: two, pat: uniq(pats) };
    }
    return { kana: c, pat: (TABLE[c] || [c]).slice() };
  }

  // 読み（ひらがな）を、1回ずつ判定する区切りに分ける
  function segment(w) {
    var segs = [], i = 0;
    while (i < w.length) {
      var c = w[i], nx = w[i + 1];

      // 「ん」: 後ろに子音が続くときは n 1つでOK、母音・や行・な行の前は nn が必要（IMEと同じ）
      if (c === "ん") {
        var atEnd = !nx || STOPS.indexOf(nx) >= 0;
        segs.push(atEnd
          ? { kana: c, pat: ["n", "nn", "xn"], nEnd: true }
          : { kana: c, pat: ["nn", "xn"], nDefer: true });
        i += 1; continue;
      }

      // 「っ」: 次の音の子音を重ねる（kka / tta / ccha / tcha）か、xtu・ltu で単独入力
      if (c === "っ" && nx && STOPS.indexOf(nx) < 0) {
        var next = readUnit(w, i + 1), pats = [];
        next.pat.forEach(function (p) {
          if (/^[bcdfghjkmpqrstvwyz]/.test(p)) pats.push(p[0] + p);
          if (p.indexOf("ch") === 0) pats.push("t" + p);
          TABLE["っ"].forEach(function (x) { pats.push(x + p); });
        });
        segs.push({ kana: c + next.kana, pat: uniq(pats) });
        i += 1 + next.kana.length; continue;
      }

      var u = readUnit(w, i);
      segs.push(u);
      i += u.kana.length;
    }
    return segs;
  }

  function test(pats, s) {
    for (var i = 0; i < pats.length; i++) if (pats[i] === s) return 2;          // 完成
    for (var j = 0; j < pats.length; j++) if (pats[j].indexOf(s) === 0) return 1; // 途中まで一致
    return 0;                                                                    // 不一致
  }

  // 1問ぶんの入力判定。carryN: 直前の問題が「…ん」を n 1つで終えたかどうか
  function Session(reading, carryN) {
    this.reading = reading;
    this.segs = segment(reading);
    this.idx = 0;
    this.buf = "";
    this.carryN = !!carryN;  // 直後の余分な n を無視してよい状態
    this.ambN = false;       // 余分な n を、次の音の頭として仮に受け取っている状態
    this.endedWithSingleN = false;
  }

  // 1キー入力する。戻り値: "ok"（正しい）/ "miss"（間違い）/ "ignored"（「ん」の余分な n を無視）
  Session.prototype.feed = function (ch) {
    var seg = this.segs[this.idx];
    if (!seg) return "ignored";

    // 「ん」を n 1つで打ったあとの余分な n（nn と打つ癖）を、間違いにしない
    if (this.ambN) {
      this.ambN = false;
      if (ch === "n" && this.buf === "n" && !test(seg.pat, "nn")) return "ignored";
    }
    if (this.carryN) {
      this.carryN = false;
      if (ch === "n") {
        if (!test(seg.pat, this.buf + "n")) return "ignored";
        this.ambN = true; // 「な」などの頭の n かもしれないので、いったん受け取る
      }
    }

    // 「ん」+子音: n の次に子音が来た時点で「ん」を確定し、そのキーを次の音として判定する
    if (seg.nDefer && this.buf === "n" && N_NEEDS_DOUBLE.indexOf(ch) < 0) {
      this.idx++; this.buf = "";
      seg = this.segs[this.idx];
    }

    var r = test(seg.pat, this.buf + ch);
    if (!r) return "miss";
    this.buf += ch;
    if (r === 2) {
      var singleN = (seg.kana === "ん" && this.buf === "n");
      this.idx++; this.buf = "";
      if (singleN) { this.carryN = true; this.endedWithSingleN = this.done(); }
    }
    return "ok";
  };

  Session.prototype.done = function () { return this.idx >= this.segs.length; };

  // 入力し終えた「かな」の文字数（ふりがなの色分けに使う）
  Session.prototype.typedKanaLength = function () {
    var n = 0;
    for (var i = 0; i < this.idx; i++) n += this.segs[i].kana.length;
    return n;
  };

  // 打ち方の例（いちばん基本の打ち方をつなげたもの）
  Session.prototype.example = function () {
    return this.segs.map(function (s) { return s.nDefer || s.nEnd ? "nn" : s.pat[0]; }).join("");
  };

  return { Session: Session, segment: segment, TABLE: TABLE };
})();
if (typeof window !== "undefined") { window.RomajiEngine = RomajiEngine; }


/* =====================================================================
   2. 画面の制御
   ===================================================================== */
(function () {
  "use strict";
  if (typeof document === "undefined") return;

  var INTRO_COUNT = 15;  // 1文字の問題数
  var WORD_COUNT = 20;   // 単語の問題数（そのあとは短文）

  var introPool = ["あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ","た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ","ま","み","む","め","も","や","ゆ","よ","ら","り","る","れ","ろ","わ","を","ん"];
  var wordBank = (typeof ROMAJI_WORD_BANK !== "undefined") ? ROMAJI_WORD_BANK : [];
  var isSentence = function (w) { return /[。！？]/.test(w.reading); };
  var wordsOnly = wordBank.filter(function (w) { return !isSentence(w); });
  var sentencesOnly = wordBank.filter(isSentence);

  var HINT_DEFAULT = "キーボードでローマ字を入力";
  var HINT_IME = "日本語入力がONになっています。「半角/全角」キーでOFFにしてね";

  // ===== 状態 =====
  var timeLimit = 300, timeLeft = 300, timerId = null, running = false, waitingStart = false, counting = false;
  var order = [], qIndex = 0, session = null, curItem = null;
  var totalTyped = 0, totalMiss = 0, kanaCharCount = 0, wordsCompleted = 0, wordsWithMiss = 0, curWordHadMiss = false;
  var waitingInnerHTML = null;
  var keyElements = {};

  var $ = function (id) { return document.getElementById(id); };
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmtTime(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  function toItem(x) { return (typeof x === "string") ? { display: x, reading: x } : x; }
  function countKana(s) { return s.replace(/[。、！？]/g, "").length; } // 句読点は文字数に数えない

  // ===== キーボード表示（指の色分け。文字キー以外は無地） =====
  var fingerColors = { L5: "#5b9bd5", L4: "#3fa889", L3: "#c99a3e", L2: "#d17ba0", R2: "#9a8fe0", R3: "#c99a3e", R4: "#3fa889", R5: "#5b9bd5" };
  var keyFinger = {
    "1":"L5","2":"L4","3":"L3","4":"L2","5":"L2","6":"R2","7":"R2","8":"R3","9":"R4","0":"R5","-":"R5","^":"R5","¥":"R5",
    "Q":"L5","W":"L4","E":"L3","R":"L2","T":"L2","Y":"R2","U":"R2","I":"R3","O":"R4","P":"R5","@":"R5","[":"R5",
    "A":"L5","S":"L4","D":"L3","F":"L2","G":"L2","H":"R2","J":"R2","K":"R3","L":"R4",";":"R5",":":"R5","]":"R5",
    "Z":"L5","X":"L4","C":"L3","V":"L2","B":"L2","N":"R2","M":"R2",",":"R3",".":"R4","/":"R5","\\":"R5"
  };

  function makeKey(label, width, isHome, displayLabel) {
    var f = keyFinger[label];
    var col = f ? fingerColors[f] : "#b9b6ac";
    var key = document.createElement("div");
    key.className = "key" + (isHome ? " key--home" : "");
    key.style.width = width + "px";

    var inner = document.createElement("div");
    inner.className = "key-inner";
    var shown = displayLabel === undefined ? label : displayLabel;
    inner.textContent = shown;
    inner.style.fontSize = shown.length > 2 ? "11px" : "16px";
    key.appendChild(inner);

    var bar = document.createElement("div");
    bar.className = "key-bar";
    bar.style.background = col;
    bar.style.opacity = f ? "0.85" : "0.25";
    key.appendChild(bar);

    if (isHome) { key.style.boxShadow = "0 1.5px 0 rgba(0,0,0,0.08), inset 0 0 0 1.5px " + col; }
    if (f) { keyElements[label] = key; }
    return key;
  }

  function buildKeyboard() {
    var kb = $("keyboard");
    var homeKeys = ["A", "S", "D", "F", "J", "K", "L"];
    var W = 38;
    function row(cls) { var r = document.createElement("div"); r.className = "kb-row" + (cls ? " " + cls : ""); kb.appendChild(r); return r; }

    var r0 = row();
    ["1","2","3","4","5","6","7","8","9","0","-","^","¥"].forEach(function (k) { r0.appendChild(makeKey(k, W, false)); });
    r0.appendChild(makeKey("BS", 66, false, ""));

    var r1 = row("kb-row--top");
    r1.appendChild(makeKey("Tab", 52, false, ""));
    ["Q","W","E","R","T","Y","U","I","O","P","@","["].forEach(function (k) { r1.appendChild(makeKey(k, W, false)); });

    var r2 = row("kb-row--home");
    r2.appendChild(makeKey("Caps", 59, false, ""));
    ["A","S","D","F","G","H","J","K","L",";",":","]"].forEach(function (k) { r2.appendChild(makeKey(k, W, homeKeys.indexOf(k) >= 0)); });
    r2.appendChild(makeKey("Enter", 59, false, ""));

    var r3 = row("kb-row--bottom");
    r3.appendChild(makeKey("Shift", 73, false, "Shift"));
    ["Z","X","C","V","B","N","M",",",".","/","\\"].forEach(function (k) { r3.appendChild(makeKey(k, W, false)); });
    r3.appendChild(makeKey("Shift", 59, false, "Shift"));

    var r4 = row();
    ["Ctrl","Win","Alt","無変換"].forEach(function (k) { r4.appendChild(makeKey(k, k === "無変換" ? 52 : 45, false, "")); });
    r4.appendChild(makeKey("Space", 212, false, ""));
    ["変換","かな","Alt","Menu","Ctrl"].forEach(function (k) { r4.appendChild(makeKey(k, k.length > 2 ? 52 : 45, false, "")); });
  }

  // 押したキーを光らせる（正しい入力は緑、間違いは青）
  function flashKey(label, success) {
    var el = keyElements[label];
    if (!el) return;
    el.classList.remove("key--flash", "key--success");
    void el.offsetWidth;
    el.classList.add(success ? "key--success" : "key--flash");
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(function () { el.classList.remove("key--flash", "key--success"); }, success ? 320 : 180);
  }

  // 短文のふりがなは、入力し終えた部分だけ色を変える
  function renderFurigana() {
    var el = $("furigana");
    el.textContent = "";
    if (!curItem || curItem.display === curItem.reading) return;
    var n = session.typedKanaLength();
    var a = document.createElement("span"); a.className = "furigana-typed"; a.textContent = curItem.reading.slice(0, n);
    var b = document.createElement("span"); b.className = "furigana-rest"; b.textContent = curItem.reading.slice(n);
    el.appendChild(a); el.appendChild(b);
  }

  // ===== 出題・進行 =====
  function loadWord(carryN) {
    if (qIndex >= order.length) { order = order.concat(shuffle(sentencesOnly.slice())); } // 短文を使い切ったら混ぜ直して続ける
    curItem = toItem(order[qIndex]);
    session = new RomajiEngine.Session(curItem.reading, carryN);
    curWordHadMiss = false;
    $("kana").textContent = curItem.display;
    $("typed").textContent = "";
    renderFurigana();
  }

  function goToWaiting() {
    timeLimit = parseInt($("tlimit").value, 10) * 60; timeLeft = timeLimit;
    hide($("setup")); hide($("result"));
    if (waitingInnerHTML === null) { waitingInnerHTML = $("waitingInner").innerHTML; }
    else { $("waitingInner").innerHTML = waitingInnerHTML; }
    show($("waiting"));
    show($("kbwrap"));
    waitingStart = true;
  }

  function beginCountdown() {
    waitingStart = false; counting = true;
    var count = 3;
    $("waitingInner").innerHTML = '<div id="cdnum" class="countdown-number">' + count + "</div>";
    var cd = setInterval(function () {
      count--;
      if (count > 0) { $("cdnum").textContent = count; }
      else { clearInterval(cd); counting = false; start(); }
    }, 1000);
  }

  function start() {
    qIndex = 0; totalTyped = 0; totalMiss = 0; kanaCharCount = 0; wordsCompleted = 0; wordsWithMiss = 0; running = true;
    // 「1文字 → 単語 → 短文」の順に出題する
    order = shuffle(introPool.slice()).slice(0, INTRO_COUNT)
      .concat(shuffle(wordsOnly.slice()).slice(0, WORD_COUNT))
      .concat(shuffle(sentencesOnly.slice()));
    hide($("waiting")); show($("play"));
    $("timer").textContent = fmtTime(timeLeft);
    $("timebar").style.width = "100%"; $("timebar").style.background = "#6fcf97";
    $("charcount").textContent = "0";
    $("hint").textContent = HINT_DEFAULT; $("hint").classList.remove("hint-warn");
    loadWord(false);
    timerId = setInterval(function () {
      timeLeft--;
      $("timer").textContent = fmtTime(timeLeft);
      var pct = Math.max(0, (timeLeft / timeLimit) * 100);
      $("timebar").style.width = pct + "%";
      $("timebar").style.background = pct < 20 ? "#eb5757" : (pct < 50 ? "#f2c94c" : "#6fcf97");
      if (timeLeft <= 0) finish();
    }, 1000);
  }

  function finish() {
    if (!running) return;
    running = false; clearInterval(timerId);
    hide($("play")); show($("result"));
    hide($("kbwrap"));
    var accRate = totalTyped + totalMiss > 0 ? Math.round(totalTyped / (totalTyped + totalMiss) * 100) : 100;
    $("r-score").textContent = Math.floor((kanaCharCount / 750) * 100);
    $("r-mode").textContent = "ローマ字 / " + (timeLimit / 60) + "分";
    $("r-charcount").textContent = kanaCharCount;
    $("r-qacc").textContent = wordsCompleted > 0 ? Math.round(((wordsCompleted - wordsWithMiss) / wordsCompleted) * 100) : 100;
    $("r-count").textContent = totalTyped;
    $("r-miss").textContent = totalMiss;
    $("r-acc").textContent = accRate;
    $("r-missrate").textContent = 100 - accRate;
  }

  // ===== キー入力 =====
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // ショートカット（Ctrl+Rなど）は邪魔しない
    if (waitingStart && !counting) {
      if (e.code === "Space" || e.key === " ") { e.preventDefault(); beginCountdown(); }
      return;
    }
    if (!running) return;
    if (e.code === "Space") { e.preventDefault(); return; } // 画面がスクロールしないように

    // 日本語入力がONのままだと文字が届かないので、気づけるように知らせる
    if (e.isComposing || e.key === "Process") {
      $("hint").textContent = HINT_IME; $("hint").classList.add("hint-warn");
      return;
    }
    if (e.key.length !== 1 || !/[a-zA-Z.,!?\-]/.test(e.key)) return;
    e.preventDefault();
    if (e.repeat) return; // キーの押しっぱなしはミスに数えない
    if ($("hint").classList.contains("hint-warn")) { $("hint").textContent = HINT_DEFAULT; $("hint").classList.remove("hint-warn"); }

    var ch = e.key.toLowerCase();
    var result = session.feed(ch);
    flashKey(e.key.toUpperCase(), result !== "miss");

    if (result === "miss") { totalMiss++; curWordHadMiss = true; return; }
    if (result === "ignored") return;

    totalTyped++;
    $("typed").textContent += ch;
    renderFurigana();
    if (session.done()) {
      kanaCharCount += countKana(curItem.reading);
      wordsCompleted++;
      if (curWordHadMiss) wordsWithMiss++;
      $("charcount").textContent = kanaCharCount;
      qIndex++;
      loadWord(session.endedWithSingleN);
    }
  }

  // ===== 初期化 =====
  document.addEventListener("DOMContentLoaded", function () {
    $("tlimit").addEventListener("input", function () { $("tlimit-out").textContent = this.value + "分"; });
    document.addEventListener("keydown", onKey);
    $("startBtn").addEventListener("click", goToWaiting);
    $("endBtn").addEventListener("click", finish);
    $("againBtn").addEventListener("click", function () { hide($("result")); show($("setup")); hide($("kbwrap")); });
    buildKeyboard();
  });
})();
