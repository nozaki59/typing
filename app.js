/* ローマ字タイピング練習 - 動作ロジック
   単語データは words.js（ROMAJI_WORD_BANK）を参照します。
   romaji_typing.html / style.css / app.js / words.js は同じフォルダに置いてください。
*/
(function () {
  "use strict";

  // ===== 出題プール =====
  var introPool = ["あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ","た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ","ま","み","む","め","も","や","ゆ","よ","ら","り","る","れ","ろ","わ","を","ん"];
  var wordBank = (typeof ROMAJI_WORD_BANK !== "undefined") ? ROMAJI_WORD_BANK : [];

  // ===== ローマ字対応表（訓令式・ヘボン式・小文字合成など主要な入力方式を網羅） =====
  var romaTable = {
    "あ":["a"],"い":["i"],"う":["u"],"え":["e"],"お":["o"],
    "か":["ka"],"き":["ki"],"く":["ku"],"け":["ke"],"こ":["ko"],
    "が":["ga"],"ぎ":["gi"],"ぐ":["gu"],"げ":["ge"],"ご":["go"],
    "さ":["sa"],"し":["shi","si","ci"],"す":["su"],"せ":["se"],"そ":["so"],
    "ざ":["za"],"じ":["ji","zi"],"ず":["zu"],"ぜ":["ze"],"ぞ":["zo"],
    "た":["ta"],"ち":["chi","ti"],"つ":["tsu","tu"],"て":["te"],"と":["to"],
    "だ":["da"],"ぢ":["di","ji"],"づ":["du","zu"],"で":["de"],"ど":["do"],
    "な":["na"],"に":["ni"],"ぬ":["nu"],"ね":["ne"],"の":["no"],
    "は":["ha"],"ひ":["hi"],"ふ":["fu","hu"],"へ":["he"],"ほ":["ho"],
    "ば":["ba"],"び":["bi"],"ぶ":["bu"],"べ":["be"],"ぼ":["bo"],
    "ぱ":["pa"],"ぴ":["pi"],"ぷ":["pu"],"ぺ":["pe"],"ぽ":["po"],
    "ま":["ma"],"み":["mi"],"む":["mu"],"め":["me"],"も":["mo"],
    "や":["ya"],"ゆ":["yu"],"よ":["yo"],
    "ら":["ra"],"り":["ri"],"る":["ru"],"れ":["re"],"ろ":["ro"],
    "わ":["wa"],"を":["wo"],
    "しゃ":["sha","sya"],"しゅ":["shu","syu"],"しょ":["sho","syo"],
    "ちゃ":["cha","tya","cya"],"ちゅ":["chu","tyu","cyu"],"ちょ":["cho","tyo","cyo"],
    "きゃ":["kya"],"きゅ":["kyu"],"きょ":["kyo"],
    "にゃ":["nya"],"にゅ":["nyu"],"にょ":["nyo"],
    "ひゃ":["hya"],"ひゅ":["hyu"],"ひょ":["hyo"],
    "みゃ":["mya"],"みゅ":["myu"],"みょ":["myo"],
    "りゃ":["rya"],"りゅ":["ryu"],"りょ":["ryo"],
    "ぎゃ":["gya"],"ぎゅ":["gyu"],"ぎょ":["gyo"],
    "じゃ":["ja","zya","jya"],"じゅ":["ju","zyu","jyu"],"じょ":["jo","zyo","jyo"],
    "びゃ":["bya"],"びゅ":["byu"],"びょ":["byo"],
    "ぴゃ":["pya"],"ぴゅ":["pyu"],"ぴょ":["pyo"],
    "ぢゃ":["dya","ja"],"ぢゅ":["dyu","ju"],"ぢょ":["dyo","jo"],
    "ー":["-"],
    "てぃ":["ti","texi","teli"],"でぃ":["di","dexi","deli"],"とぅ":["tu","toxu","tolu"],"どぅ":["du","doxu","dolu"],
    "ふぁ":["fa","fuxa","fula"],"ふぃ":["fi","fuxi","fuli"],"ふぇ":["fe","fuxe","fule"],"ふぉ":["fo","fuxo","fulo"],
    "うぃ":["wi","whi","uxi","uli"],"うぇ":["we","whe","uxe","ule"],"うぉ":["who","wo","uxo","ulo"],"うぁ":["wha","uxa","ula"],
    "つぁ":["tsa","tsuxa","tsula"],"つぃ":["tsi","tsuxi","tsuli"],"つぇ":["tse","tsuxe","tsule"],"つぉ":["tso","tsuxo","tsulo"],
    "くぁ":["kwa","kuxa","kula"],"くぃ":["kwi","kuxi","kuli"],"くぇ":["kwe","kuxe","kule"],"くぉ":["kwo","kuxo","kulo"],
    "ぐぁ":["gwa","guxa","gula"],
    "じぇ":["je","jixe","jile"],"しぇ":["she","shixe","shile"],"ちぇ":["che","chixe","chile"],
    "ゔぁ":["va","vuxa","vula"],"ゔぃ":["vi","vuxi","vuli"],"ゔ":["vu"],"ゔぇ":["ve","vuxe","vule"],"ゔぉ":["vo","vuxo","vulo"],
    "。":["."],"、":[","],"！":["!"],"？":["?"]
  };
  // 「ん」は、ば・ぱ・ま行の前だけ m でも入力できるようにする（例: えんぴつ → empitsu）
  var N_TO_M_BEFORE = "ばびぶべぼぱぴぷぺぽまみむめも";

  // ===== 入力判定ロジック =====

  // ひらがな文字列を「1回の入力区切り（モーラ）」ごとの候補配列に分割する
  function segment(word) {
    var segs = [], i = 0;
    while (i < word.length) {
      var two = word.substr(i, 2);
      if (romaTable[two]) { segs.push({ kana: two, pat: romaTable[two].slice() }); i += 2; continue; }
      var c = word[i];
      if (c === "っ" && i + 1 < word.length) {
        var nxTwo = word.substr(i + 1, 2);
        var nxKana, nxPat, nxLen;
        if (romaTable[nxTwo]) { nxKana = nxTwo; nxPat = romaTable[nxTwo]; nxLen = 2; }
        else { nxKana = word[i + 1]; nxPat = romaTable[nxKana] || [nxKana]; nxLen = 1; }
        var doubled = nxPat.map(function (p) { return p[0] + p; });
        segs.push({ kana: c + nxKana, pat: doubled });
        i += 1 + nxLen; continue;
      }
      if (c === "ん") {
        var npat = ["n", "nn"];
        var nxch = word[i + 1];
        if (nxch && N_TO_M_BEFORE.indexOf(nxch) >= 0) { npat.push("m"); }
        segs.push({ kana: c, pat: npat }); i += 1; continue;
      }
      if (romaTable[c]) { segs.push({ kana: c, pat: romaTable[c].slice() }); i += 1; continue; }
      segs.push({ kana: c, pat: [c] }); i += 1;
    }
    return segs;
  }

  // 候補の中に完全一致があればそちらを優先し、なければ前方一致を確認する
  function checkInput(cands, test) {
    for (var i = 0; i < cands.length; i++) { if (cands[i] === test) return { match: true, complete: true }; }
    for (var i = 0; i < cands.length; i++) { if (cands[i].indexOf(test) === 0) return { match: true, complete: false }; }
    return { match: false, complete: false };
  }

  // 単語プールの1件を { display, reading } 形式に統一する（イントロ文字は文字列そのまま渡ってくる）
  function toItem(x) {
    return (typeof x === "string") ? { display: x, reading: x } : x;
  }

  // ===== 状態管理 =====
  var timeLimit = 180, timeLeft = 180, timerId = null, running = false, waitingStart = false, counting = false;
  var qIndex = 0, segIndex = 0, buffer = "", segs = [];
  var totalTyped = 0, totalMiss = 0, kanaCharCount = 0, wordsCompleted = 0, wordsAttemptedWithMiss = 0, curWordHadMiss = false;
  var order = [];
  var waitingInnerHTML = null;
  var curReading = "", curIsSentence = false;

  var $ = function (id) { return document.getElementById(id); };
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  var keyElements = {}; // 実際の文字キー（Tab/Enter等の無地キーは含まない）

  // ===== キーボード描画（指の色分け表示。文字キー以外は無地） =====
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
    if (f) { keyElements[label] = key; } // 指の色が割り当てられている＝実際に入力に使うキー
    return key;
  }

  // 打鍵のたびに、対応するキーを光らせる（正しい入力は緑、それ以外は青でフラッシュ）
  function flashKey(label, success) {
    var el = keyElements[label];
    if (!el) return;
    el.classList.remove("key--flash", "key--success");
    void el.offsetWidth; // 連続で同じキーを押したときにアニメーションをリスタートさせる
    el.classList.add(success ? "key--success" : "key--flash");
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(function () {
      el.classList.remove("key--flash", "key--success");
    }, success ? 320 : 180);
  }

  function buildKeyboard() {
    var kb = $("keyboard");
    var homeKeys = ["A", "S", "D", "F", "J", "K", "L"];
    var W = 38;

    var r0 = document.createElement("div"); r0.className = "kb-row";
    ["1","2","3","4","5","6","7","8","9","0","-","^","¥"].forEach(function (k) { r0.appendChild(makeKey(k, W, false)); });
    r0.appendChild(makeKey("BS", 66, false, ""));
    kb.appendChild(r0);

    var r1 = document.createElement("div"); r1.className = "kb-row kb-row--top";
    r1.appendChild(makeKey("Tab", 52, false, ""));
    ["Q","W","E","R","T","Y","U","I","O","P","@","["].forEach(function (k) { r1.appendChild(makeKey(k, W, false)); });
    kb.appendChild(r1);

    var r2 = document.createElement("div"); r2.className = "kb-row kb-row--home";
    r2.appendChild(makeKey("Caps", 59, false, ""));
    ["A","S","D","F","G","H","J","K","L",";",":","]"].forEach(function (k) { r2.appendChild(makeKey(k, W, homeKeys.indexOf(k) >= 0)); });
    r2.appendChild(makeKey("Enter", 59, false, ""));
    kb.appendChild(r2);

    var r3 = document.createElement("div"); r3.className = "kb-row kb-row--bottom";
    r3.appendChild(makeKey("Shift", 73, false, "Shift"));
    ["Z","X","C","V","B","N","M",",",".","/","\\"].forEach(function (k) { r3.appendChild(makeKey(k, W, false)); });
    r3.appendChild(makeKey("Shift", 59, false, "Shift"));
    kb.appendChild(r3);

    var r4 = document.createElement("div"); r4.className = "kb-row";
    ["Ctrl","Win","Alt","無変換"].forEach(function (k) { r4.appendChild(makeKey(k, k === "無変換" ? 52 : 45, false, "")); });
    r4.appendChild(makeKey("Space", 212, false, ""));
    ["変換","かな","Alt","Menu","Ctrl"].forEach(function (k) { r4.appendChild(makeKey(k, k.length > 2 ? 52 : 45, false, "")); });
    kb.appendChild(r4);
  }

  // ===== ユーティリティ =====
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmtTime(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }

  // ふりがなのうち、入力し終えた部分だけ色を変えて表示する（短文のときのみ）
  function renderFurigana() {
    var el = $("furigana");
    if (!curIsSentence) { el.textContent = ""; return; }
    var typedLen = 0;
    for (var i = 0; i < segIndex; i++) { typedLen += segs[i].kana.length; }
    var typedPart = curReading.slice(0, typedLen);
    var restPart = curReading.slice(typedLen);
    el.innerHTML =
      '<span class="furigana-typed">' + typedPart + '</span>' +
      '<span class="furigana-rest">' + restPart + '</span>';
  }

  // ===== 出題・進行 =====
  function loadWord() {
    if (qIndex >= order.length) { order = order.concat(shuffle(wordBank.slice())); }
    var item = toItem(order[qIndex]);
    $("kana").textContent = item.display;
    curReading = item.reading;
    curIsSentence = (item.display !== item.reading);
    segs = segment(item.reading); segIndex = 0; buffer = ""; curWordHadMiss = false;
    renderFurigana();
    $("typed").textContent = "";
    $("hint").textContent = "キーボードでローマ字を入力";
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
    qIndex = 0; totalTyped = 0; totalMiss = 0; kanaCharCount = 0; wordsCompleted = 0; wordsAttemptedWithMiss = 0; running = true;
    var introSet = shuffle(introPool.slice()).slice(0, 15);
    // 句読点（。！？）を含むものは短文、含まないものは単語として判定し、「1文字→単語→短文」の順で並べる
    var wordsOnly = wordBank.filter(function (w) { return !/[。！？]/.test(w.reading); });
    var sentencesOnly = wordBank.filter(function (w) { return /[。！？]/.test(w.reading); });
    var wordsSet = shuffle(wordsOnly.slice()).slice(0, 20);
    order = introSet.concat(wordsSet).concat(shuffle(sentencesOnly.slice()));
    hide($("waiting")); show($("play"));
    $("timer").textContent = fmtTime(timeLeft);
    $("timebar").style.width = "100%"; $("timebar").style.background = "#6fcf97";
    $("charcount").textContent = "0";
    loadWord();
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
    running = false; clearInterval(timerId);
    hide($("play")); show($("result"));
    hide($("kbwrap"));
    var accRate = totalTyped + totalMiss > 0 ? Math.round(totalTyped / (totalTyped + totalMiss) * 100) : 100;
    var missRate = 100 - accRate;
    var score = Math.floor((kanaCharCount / 750) * 100);
    var qAcc = wordsCompleted > 0 ? Math.round(((wordsCompleted - wordsAttemptedWithMiss) / wordsCompleted) * 100) : 100;
    $("r-score").textContent = score;
    $("r-mode").textContent = "ローマ字 / " + (timeLimit / 60) + "分";
    $("r-charcount").textContent = kanaCharCount;
    $("r-qacc").textContent = qAcc;
    $("r-count").textContent = totalTyped;
    $("r-miss").textContent = totalMiss;
    $("r-acc").textContent = accRate;
    $("r-missrate").textContent = missRate;
  }

  // ===== キー入力受付 =====
  function onKey(e) {
    if (waitingStart && !counting) {
      if (e.key === " " || e.code === "Space") { e.preventDefault(); beginCountdown(); }
      return;
    }
    if (!running) return;
    if (e.key.length !== 1 || !/[a-zA-Z.,!?-]/.test(e.key)) return;
    e.preventDefault();
    var ch = e.key.toLowerCase();
    var cands = segs[segIndex].pat;
    var test = buffer + ch;
    var res = checkInput(cands, test);
    flashKey(e.key.toUpperCase(), res.match);
    if (res.match) {
      buffer = test; totalTyped++; $("typed").textContent += ch;
      $("charcount").textContent = kanaCharCount;
      if (res.complete) {
        segIndex++; buffer = "";
        renderFurigana();
        if (segIndex >= segs.length) {
          var item = toItem(order[qIndex]);
          kanaCharCount += item.reading.length;
          wordsCompleted++;
          if (curWordHadMiss) wordsAttemptedWithMiss++;
          $("charcount").textContent = kanaCharCount;
          qIndex++; loadWord();
        }
      }
    } else {
      totalMiss++; curWordHadMiss = true;
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
