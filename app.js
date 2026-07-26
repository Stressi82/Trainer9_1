(() => {
  'use strict';

  const BASE_QUESTIONS = Array.isArray(window.QUESTION_DATA) ? window.QUESTION_DATA : [];
  const STORE_KEY = 'qmb-lernplattform-v1';
  const APP_SCHEMA_VERSION = 6;
  const app = document.getElementById('app');
  let deferredInstall = null;
  let timerHandle = null;

  const defaultStore = {
    theme: 'light',
    wrongIds: [],
    stats: {},
    history: [],
    passThreshold: 70,
    customQuestions: [],
    overrides: {},
    archivedIds: [],
    customCategories: [],
    databaseUpdatedAt: null,
    databaseVersion: APP_SCHEMA_VERSION,
    breakGameEnabled: true,
    breakAnsweredTotal: 0,
    breakNextAt: 50,
    breakRotationIndex: 0,
    breakDurationMinutes: 3,
    activeSession: null,
    attemptLog: [],
    sessionHistory: [],
    learningPathProgress: {},
    learningPathLastModule: null,
    documentSearchSource: 'iso',
    openBookProgress: {},
    openBookHistory: []
  };

  let store = loadStore();
  let state = {
    view: 'home',
    session: null,
    catalogQuery: '',
    catalogCategory: 'all',
    managerQuery: '',
    managerCategory: 'all',
    managerOrigin: 'all',
    editingUid: null,
    breakPrompt: null,
    game: null,
    pendingSession: null,
    openBookSource: null,
    openBookIndex: 0,
    openBookFeedback: null,
    openBookStartedAt: null
  };



  const OPEN_BOOK_MODULES = {
    iso: {
      title: 'ISO-Lernmodul', short: 'Freitextfragen mit externer Recherche in der ISO-Unterlage', document: 'ISO-Unterlage',
      questions: [
        {id:'iso-1', prompt:'Welche Anforderungen stellt ISO 9001 an Qualitätsziele? Formuliere die wesentlichen Merkmale vollständig.', source:'DIN EN ISO 9001:2015, Abschnitt 6.2.1', hints:['qualitätspolitik','messbar','überwacht','vermittelt','aktualisiert'], min:4},
        {id:'iso-2', prompt:'Welche Punkte sind bei der Planung zum Erreichen von Qualitätszielen festzulegen?', source:'DIN EN ISO 9001:2015, Abschnitt 6.2.2', hints:['was','ressourcen','verantwortlich','wann','bewertet'], min:4},
        {id:'iso-3', prompt:'Welche Aspekte sind beim Erstellen und Aktualisieren dokumentierter Information sicherzustellen?', source:'DIN EN ISO 9001:2015, Abschnitt 7.5.2', hints:['kennzeichnung','format','medium','überprüfung','genehmigung'], min:4},
        {id:'iso-4', prompt:'Welche Anforderungen gelten für die Lenkung dokumentierter Information?', source:'DIN EN ISO 9001:2015, Abschnitt 7.5.3', hints:['verfügbar','geeignet','geschützt','verteilung','zugriff','aufbewahrung'], min:4},
        {id:'iso-5', prompt:'Welche Anforderungen stellt ISO 9001 an das interne Auditprogramm?', source:'DIN EN ISO 9001:2015, Abschnitt 9.2.2', hints:['häufigkeit','methoden','verantwortlichkeiten','planung','berichterstattung','risiken'], min:4},
        {id:'iso-6', prompt:'Welche Schritte verlangt ISO 9001 beim Auftreten einer Nichtkonformität?', source:'DIN EN ISO 9001:2015, Abschnitt 10.2.1', hints:['reagieren','ursache','wiederholung','maßnahmen','wirksamkeit','risiken'], min:4}
      ]
    },
    modul1: {
      title: 'TÜV Modul 1 Lernmodul', short: 'Freitextfragen mit externer Recherche im TÜV-Skript Modul 1', document: 'TÜV Modul 1',
      questions: [
        {id:'m1-1', prompt:'Was versteht die Normenreihe ISO 9000 ff. unter dem Kontext der Organisation?', source:'TÜV Modul 1, Kapitel 4.1 „Kontext der Organisation“, ab Seite 34', hints:['interne','externe','faktoren','zweck','ziele'], min:3},
        {id:'m1-2', prompt:'Welche Gruppen können als relevante interessierte Parteien einer Organisation betrachtet werden?', source:'TÜV Modul 1, Kapitel 4.2 „Interessierte Parteien“, ab Seite 36', hints:['kunden','lieferanten','mitarbeiter','behörden','eigentümer'], min:3},
        {id:'m1-3', prompt:'Welche Anforderungen müssen wirksame Qualitätsziele erfüllen?', source:'TÜV Modul 1, Kapitel 6.2.1 „Qualitätsziele“, Seite 46', hints:['qualitätspolitik','messbar','anforderungen','produktkonformität','kundenzufriedenheit','überwacht'], min:4},
        {id:'m1-4', prompt:'Was muss die Organisation bei der Maßnahmenplanung für Risiken und Chancen sicherstellen?', source:'TÜV Modul 1, Kapitel 6.1.4 „Maßnahmenplanung“, Seite 45', hints:['planen','integriert','umgesetzt','wirksamkeit'], min:3},
        {id:'m1-5', prompt:'Welche Arten dokumentierter Information benötigt ein Qualitätsmanagementsystem?', source:'TÜV Modul 1, Kapitel 7.5.1 „Dokumentierte Informationen“, ab Seite 63', hints:['norm','organisation','wirksamkeit','dokumentiert'], min:3},
        {id:'m1-6', prompt:'Welche Bedeutung haben Leistungsindikatoren beziehungsweise Kennzahlen für Prozesse und Qualitätsziele?', source:'TÜV Modul 1, Kapitel 6.2.1 „Qualitätsziele“, Seite 46', hints:['überwacht','gesteuert','zielwerte','kennzahlen'], min:3}
      ]
    },
    modul2: {
      title: 'TÜV Modul 2 Lernmodul', short: 'Freitextfragen mit externer Recherche im TÜV-Skript Modul 2', document: 'TÜV Modul 2',
      questions: [
        {id:'m2-1', prompt:'Warum ist eine Nichtkonformität nach einer Sofortmaßnahme noch nicht als erledigt zu betrachten?', source:'TÜV Modul 2, Kapitel 8.7.2 „Korrekturmaßnahmen“, Seiten 22–23', hints:['ursache','wiederholung','vermeiden','korrekturmaßnahmen','optimierung'], min:3},
        {id:'m2-2', prompt:'Welche Funktion hat die Analyse einer Nichtkonformität im Zusammenhang mit Korrekturmaßnahmen?', source:'TÜV Modul 2, Kapitel 8.7.2 „Korrekturmaßnahmen“, Seiten 22–23', hints:['ursache','tendenzen','wiederholungsfehler','vermeiden'], min:3},
        {id:'m2-3', prompt:'Welche grundlegenden Auditarten werden unterschieden und wodurch unterscheiden sie sich?', source:'TÜV Modul 2, Kapitel 11.1.2 „Auditarten im Überblick“, ab Seite 46', hints:['first','second','third','intern','lieferant','zertifizierung'], min:3},
        {id:'m2-4', prompt:'Welche Funktionen erfüllt ein internes Audit innerhalb eines Managementsystems?', source:'TÜV Modul 2, Kapitel 11.2.1 „Funktionen des internen Audits“, ab Seite 53', hints:['konformität','wirksamkeit','verbesserung','information'], min:3},
        {id:'m2-5', prompt:'Welche Bedeutung haben Analyse und Bewertung für Verbesserungsmaßnahmen und Managementbewertung?', source:'TÜV Modul 2, Kapitel 9 „Bewertung der Leistung“, ab Seite 24', hints:['daten','leistung','verbesserung','managementbewertung'], min:3},
        {id:'m2-6', prompt:'Warum bewirkt eine Prüfung allein noch keine Verbesserung eines Produkts oder Prozesses?', source:'TÜV Modul 2, Abschnitt zur fortlaufenden Verbesserung und Qualitätsprüfung, ab Seite 31', hints:['ursache','prozess','maßnahme','verbesserung'], min:3}
      ]
    }
  };

  function normalizeOpenBookAnswer(value='') {
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9äöüß]+/g,' ');
  }
  function currentOpenBookQuestion() {
    const module = OPEN_BOOK_MODULES[state.openBookSource];
    return module?.questions?.[state.openBookIndex] || null;
  }
  function openBookQuestionStats(id) {
    return store.openBookProgress?.[id] || {attempts:0, correct:0, lastAt:null};
  }
  function renderOpenBookHome() {
    const cards = Object.entries(OPEN_BOOK_MODULES).map(([id,m]) => {
      const done=m.questions.filter(q=>openBookQuestionStats(q.id).correct>0).length;
      return `<article class="openbook-module-card"><div class="eyebrow">Open-Book-Training</div><h2>${esc(m.title)}</h2><p>${esc(m.short)}</p><div class="path-progress"><span style="width:${done/m.questions.length*100}%"></span></div><div class="path-meta"><span>${done}/${m.questions.length} mindestens einmal gelöst</span></div><button class="primary-btn" data-action="start-openbook" data-source="${id}">${done?'Weiterlernen':'Lernmodul starten'}</button></article>`;
    }).join('');
    app.innerHTML=layout(`<section class="openbook-hero"><div class="eyebrow">Mit den Originalunterlagen arbeiten</div><h1>Dokumenten-Lernmodule</h1><p class="lead">Die Aufgaben sind bewusst zu komplex für reines Auswendigwissen. Öffne deine Unterlagen extern, recherchiere die korrekte Formulierung und gib sie anschließend frei ein.</p><div class="verified-only-note"><strong>Verbindliche Lernregel:</strong> Bei einer falschen Eingabe wird keine Musterlösung eingeblendet. Du erhältst ausschließlich die verifizierte Fundstelle und suchst dort erneut nach.</div></section><section class="openbook-grid">${cards}</section>`);
  }
  function renderOpenBookQuestion() {
    const module=OPEN_BOOK_MODULES[state.openBookSource], q=currentOpenBookQuestion();
    if(!module||!q){state.view='openBookHome';render();return;}
    const stats=openBookQuestionStats(q.id), n=state.openBookIndex+1;
    app.innerHTML=layout(`<section class="openbook-session"><div class="eyebrow">${esc(module.title)} · Aufgabe ${n} von ${module.questions.length}</div><h1>${esc(q.prompt)}</h1><div class="openbook-instruction"><strong>Arbeitsauftrag</strong><p>Schlage die Antwort jetzt in deinen externen Unterlagen nach. Formuliere die Antwort anschließend möglichst vollständig in eigenen Worten.</p></div><form id="openBookForm"><label for="openBookAnswer">Deine recherchierte Antwort</label><textarea id="openBookAnswer" rows="8" required autocomplete="off" placeholder="Antwort nach dem Nachschlagen hier eingeben …"></textarea><div class="actions"><button class="primary-btn" type="submit">Antwort prüfen</button><button class="ghost-btn" type="button" data-action="openbook-home">Lernmodul verlassen</button></div></form>${state.openBookFeedback?`<div class="openbook-feedback ${state.openBookFeedback.correct?'correct':'wrong'}"><strong>${state.openBookFeedback.correct?'Inhaltliche Kernelemente erkannt.':'Noch nicht ausreichend belegt.'}</strong><p>${state.openBookFeedback.correct?'Du hast genügend zentrale Begriffe aus der verifizierten Fundstelle erfasst.':'Bitte schlage erneut in der folgenden Fundstelle nach. Eine vollständige Lösung wird bewusst nicht angezeigt.'}</p>${state.openBookFeedback.correct?'':`<div class="source-only">Fundstelle: ${esc(q.source)}</div>`}</div>`:''}<div class="path-meta"><span>Bisherige Versuche: ${stats.attempts}</span><span>Erfolgreich: ${stats.correct}</span></div>${state.openBookFeedback?.correct?`<div class="actions"><button class="primary-btn" data-action="next-openbook">Nächste Aufgabe</button></div>`:''}</section>`);
  }
  function checkOpenBookAnswer(value) {
    const q=currentOpenBookQuestion(); if(!q)return;
    const text=normalizeOpenBookAnswer(value);
    const matched=q.hints.filter(h=>text.includes(normalizeOpenBookAnswer(h))).length;
    const correct=matched>=q.min;
    const old=openBookQuestionStats(q.id);
    store.openBookProgress[q.id]={attempts:(old.attempts||0)+1,correct:(old.correct||0)+(correct?1:0),lastAt:new Date().toISOString(),source:state.openBookSource};
    store.openBookHistory.unshift({id:q.id,source:state.openBookSource,correct,date:new Date().toISOString(),seconds:state.openBookStartedAt?Math.round((Date.now()-state.openBookStartedAt)/1000):0});
    store.openBookHistory=store.openBookHistory.slice(0,500); saveStore();
    state.openBookFeedback={correct,matched}; render();
  }

  const LEARNING_PATH_MODULES = [
    {id:'grundlagen', order:1, title:'Qualität verstehen', short:'Grundbegriffe, Nutzen und Denkweise des Qualitätsmanagements', icon:'01', keywords:['qualität','qualitätsmanagement','qms','anforderung','inhärent'], iso:'ISO 9000 / ISO 9001 – Grundlagen und Begriffe', m1:'Modul 1 – Grundlagen des Qualitätsmanagements', m2:'Modul 2 – Wiederholung und Anwendung', goal:'Du kannst Qualität und Qualitätsmanagement verständlich erklären und voneinander abgrenzen.', impulse:'Wo begegnet dir Qualität im Alltag – und woran erkennst du sie wirklich?'},
    {id:'prozess', order:2, title:'Prozesse & PDCA', short:'Prozessorientierung, Wechselwirkungen, Kennzahlen und PDCA', icon:'02', keywords:['prozess','pdca','wechselwirkung','kennzahl','prozessleistung'], iso:'ISO 9001 Kapitel 4.4 und 10', m1:'Modul 1 – Prozessorientierter Ansatz', m2:'Modul 2 – Prozessbewertung und Verbesserung', goal:'Du erkennst Prozesse, ihre Wechselwirkungen und kannst den PDCA-Zyklus praktisch anwenden.', impulse:'Was wäre in einem Betrieb anders, wenn niemand nur seine Abteilung, sondern alle den Gesamtprozess sähen?'},
    {id:'kontext', order:3, title:'Kontext & Stakeholder', short:'Organisation, interessierte Parteien und Anwendungsbereich', icon:'03', keywords:['kontext','interessierte partei','stakeholder','anwendungsbereich','interne themen','externe themen'], iso:'ISO 9001 Kapitel 4', m1:'Modul 1 – Kontext der Organisation', m2:'Modul 2 – Umsetzung im Managementsystem', goal:'Du kannst relevante interne und externe Themen sowie interessierte Parteien bestimmen.', impulse:'Wer beeinflusst die Qualität deiner Organisation, obwohl diese Person nicht im Organigramm steht?'},
    {id:'fuehrung', order:4, title:'Führung & Qualitätspolitik', short:'Verantwortung der Leitung, Rollen, Politik und Kundenorientierung', icon:'04', keywords:['oberste leitung','führung','qualitätspolitik','kundenorientierung','verantwortung','befugnis'], iso:'ISO 9001 Kapitel 5', m1:'Modul 1 – Führung', m2:'Modul 2 – Führungsverhalten und Wirksamkeit', goal:'Du verstehst, welche Verantwortung nicht delegiert werden kann und wie Politik Orientierung schafft.', impulse:'Woran merken Mitarbeitende im Alltag, dass Qualität von der Leitung wirklich gewollt ist?'},
    {id:'planung', order:5, title:'Risiken, Chancen & Ziele', short:'Risikobasiertes Denken, Qualitätsziele und Änderungsplanung', icon:'05', keywords:['risiko','chance','qualitätsziel','planung','änderung','maßnahmen'], iso:'ISO 9001 Kapitel 6', m1:'Modul 1 – Planung des QMS', m2:'Modul 2 – Methoden, Bewertung und Umsetzung', goal:'Du kannst Risiken und Chancen sinnvoll behandeln und messbare Qualitätsziele formulieren.', impulse:'Welche Entscheidung wäre anders, wenn du nicht nur fragst „Was kann schiefgehen?“, sondern auch „Was kann besser werden?“'},
    {id:'unterstuetzung', order:6, title:'Ressourcen & dokumentierte Information', short:'Kompetenz, Bewusstsein, Kommunikation, Wissen und Dokumentenlenkung', icon:'06', keywords:['ressource','kompetenz','bewusstsein','kommunikation','dokumentiert','dokument','wissen','infrastruktur','messmittel'], iso:'ISO 9001 Kapitel 7', m1:'Modul 1 – Unterstützung', m2:'Modul 2 – Dokumentation und praktische Lenkung', goal:'Du weißt, welche Unterstützung ein wirksames QMS braucht und wie Information beherrscht wird.', impulse:'Wann hilft ein Dokument – und wann wird es nur Papier, das niemand wirklich nutzt?'},
    {id:'betrieb', order:7, title:'Betriebliche Umsetzung', short:'Anforderungen, Entwicklung, Beschaffung, Produktion und Freigabe', icon:'07', keywords:['betrieb','produkt','dienstleistung','entwicklung','lieferant','beschaffung','freigabe','rückverfolgbarkeit','eigentum','produktion'], iso:'ISO 9001 Kapitel 8', m1:'Modul 1 – Betrieb', m2:'Modul 2 – Vertiefung der betrieblichen Prozesse', goal:'Du kannst Anforderungen vom Kunden bis zur Freigabe und Nachverfolgung sicher einordnen.', impulse:'An welcher Stelle im Ablauf entscheidet sich am frühesten, ob am Ende gute Qualität entstehen kann?'},
    {id:'bewertung', order:8, title:'Bewertung & Audit', short:'Überwachung, Kundenzufriedenheit, Analyse, internes Audit und Managementbewertung', icon:'08', keywords:['audit','überwachung','messung','kundenzufriedenheit','analyse','bewertung','managementbewertung'], iso:'ISO 9001 Kapitel 9', m1:'Modul 1 – Bewertung der Leistung', m2:'Modul 2 – Audit und Managementbewertung', goal:'Du kannst aus Daten und Auditergebnissen fundierte Aussagen zur Wirksamkeit treffen.', impulse:'Welche Information würdest du der Leitung zeigen, wenn du nur eine Kennzahl auswählen dürftest?'},
    {id:'verbesserung', order:9, title:'Abweichung & Verbesserung', short:'Nichtkonformität, Korrekturmaßnahmen, Ursachen und fortlaufende Verbesserung', icon:'09', keywords:['nichtkonform','korrektur','verbesserung','ursache','abweichung','fehler'], iso:'ISO 9001 Kapitel 10', m1:'Modul 1 – Verbesserung', m2:'Modul 2 – Problemlösung und nachhaltige Maßnahmen', goal:'Du unterscheidest Korrektur, Korrekturmaßnahme und Verbesserung und denkst konsequent in Ursachen.', impulse:'Warum kommt derselbe Fehler zurück, obwohl er jedes Mal sofort beseitigt wurde?'},
    {id:'praxis', order:10, title:'Praxis, Projekt & Prüfungstransfer', short:'Auditfälle, Projekte, Motivation und vernetztes Prüfungswissen', icon:'10', keywords:['projekt','motivation','systemaudit','zertifizierung','prüf','management'], iso:'ISO 9001 – vernetzter Gesamtüberblick', m1:'Modul 1 – Zusammenführung', m2:'Modul 2 – Projekte, Audits und Transfer', goal:'Du verknüpfst Wissen aus allen Bereichen und wendest es in neuen Situationen an.', impulse:'Kannst du eine richtige Lösung auch dann begründen, wenn keine Antwortmöglichkeit vorgegeben ist?'}
  ];

  function questionsForLearningModule(module) {
    const keys = module.keywords.map(k => k.toLowerCase());
    const hits = getAllQuestions().filter(q => {
      const text = `${q.question} ${(q.answers||[]).map(a=>a.text).join(' ')} ${q.questionComment||''}`.toLowerCase();
      return keys.some(k => text.includes(k));
    });
    return hits.length >= 8 ? hits : getAllQuestions().filter((_,i) => i % LEARNING_PATH_MODULES.length === module.order - 1);
  }

  function moduleStats(module) {
    const ids = new Set(questionsForLearningModule(module).map(q=>q.uid));
    const logs = (store.attemptLog||[]).filter(a=>ids.has(a.uid));
    const correct = logs.filter(a=>a.correct).length;
    const accuracy = logs.length ? Math.round(correct/logs.length*100) : 0;
    const progress = store.learningPathProgress?.[module.id] || {};
    return {attempts:logs.length, correct, accuracy, completed:!!progress.completed, started:!!progress.startedAt};
  }

  function learningCoachMessage(session) {
    if (!session || session.mode !== 'path') return '';
    const remaining = Math.max(0, session.questions.length - session.index - 1);
    const answered = Object.keys(session.checked||{}).length;
    const wrong = Number(session.wrongInSession||0);
    if (remaining === 0) return 'Das ist die letzte Aufgabe dieses Abschnitts. Nimm dir noch einmal Zeit für die Begründung – dann ist dieser Schritt geschafft.';
    if (remaining <= 3) return `Noch ${remaining} ${remaining === 1 ? 'Aufgabe' : 'Aufgaben'} – dann hast du diesen Lernabschnitt geschafft. Dein bisheriger Weg zählt.`;
    if (answered >= 4 && wrong >= Math.ceil(answered*.5)) return 'Dieser Abschnitt fordert dich gerade. Das ist kein Rückschritt: Genau hier entsteht Lernen. Schau auf den Zusammenhang, nicht auf die Antwortposition.';
    if (answered >= 5 && Number(session.correctInSession||0) / answered >= .8) return 'Du erkennst die Zusammenhänge inzwischen sicher. Bleib aufmerksam und begründe die Lösung weiterhin für dich selbst.';
    return 'Lies bewusst, bilde zuerst eine eigene Antwort und prüfe erst danach die Auswahlmöglichkeiten.';
  }

  function saveActiveSession() {
    if (!state.session || state.session.endedAt) {
      store.activeSession = null;
    } else {
      store.activeSession = JSON.parse(JSON.stringify(state.session));
    }
    saveStore();
  }

  function restoreActiveSession() {
    if (!store.activeSession) return false;
    state.session = JSON.parse(JSON.stringify(store.activeSession));
    if (!state.session.currentQuestionStartedAt) state.session.currentQuestionStartedAt = Date.now();
    state.view = 'session';
    return true;
  }

  function clearActiveSession() {
    store.activeSession = null;
    saveStore();
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return {
        ...defaultStore,
        ...parsed,
        customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
        overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
        archivedIds: Array.isArray(parsed.archivedIds) ? parsed.archivedIds : [],
        customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
        breakGameEnabled: parsed.breakGameEnabled !== false,
        breakAnsweredTotal: Number.isFinite(Number(parsed.breakAnsweredTotal)) ? Number(parsed.breakAnsweredTotal) : 0,
        breakNextAt: Number.isFinite(Number(parsed.breakNextAt)) && Number(parsed.breakNextAt) >= 50 ? Number(parsed.breakNextAt) : 50,
        breakRotationIndex: Number.isFinite(Number(parsed.breakRotationIndex)) ? Number(parsed.breakRotationIndex) : 0,
        breakDurationMinutes: [2,3,4,5].includes(Number(parsed.breakDurationMinutes)) ? Number(parsed.breakDurationMinutes) : 3,
        activeSession: parsed.activeSession && typeof parsed.activeSession === 'object' ? parsed.activeSession : null,
        attemptLog: Array.isArray(parsed.attemptLog) ? parsed.attemptLog : [],
        sessionHistory: Array.isArray(parsed.sessionHistory) ? parsed.sessionHistory : [],
        learningPathProgress: parsed.learningPathProgress && typeof parsed.learningPathProgress === 'object' ? parsed.learningPathProgress : {},
        learningPathLastModule: parsed.learningPathLastModule || null,
        openBookProgress: parsed.openBookProgress && typeof parsed.openBookProgress === 'object' ? parsed.openBookProgress : {},
        openBookHistory: Array.isArray(parsed.openBookHistory) ? parsed.openBookHistory : []
      };
    } catch {
      return {...defaultStore};
    }
  }

  function saveStore() {
    store.databaseVersion = APP_SCHEMA_VERSION;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (error) {
      toast('Speicher ist voll. Bitte zuerst eine Sicherung exportieren.');
      console.error(error);
    }
  }

  function touchDatabase() {
    store.databaseUpdatedAt = new Date().toISOString();
    saveStore();
  }

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function fmtTime(seconds) {
    const sec = Math.max(0, Math.floor(seconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatDate(iso, withTime = false) {
    if (!iso) return 'Noch keine Änderung';
    try {
      return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        ...(withTime ? {timeStyle: 'short'} : {})
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function sameSet(a, b) {
    const x = [...a].sort((m, n) => m - n);
    const y = [...b].sort((m, n) => m - n);
    return x.length === y.length && x.every((value, index) => value === y[index]);
  }

  function correctIndexes(question) {
    return question.answers.map((answer, index) => answer.correct ? index : -1).filter(index => index >= 0);
  }

  function selectedFor(uid) {
    return state.session?.selections?.[uid] || [];
  }

  function slugify(value) {
    const base = String(value || 'kategorie')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'kategorie';
    let id = `custom-${base}`;
    const used = new Set(getCategories().map(category => category.id));
    let number = 2;
    while (used.has(id)) id = `custom-${base}-${number++}`;
    return id;
  }

  function normalizeBaseQuestion(question) {
    const override = store.overrides?.[question.uid] || {};
    const baseCategoryId = `test-${question.test}`;
    return {
      ...question,
      ...override,
      answers: Array.isArray(override.answers) ? override.answers : question.answers,
      categoryId: override.categoryId || baseCategoryId,
      categoryName: override.categoryName || question.testName || `Test ${question.test}`,
      testName: override.categoryName || question.testName || `Test ${question.test}`,
      origin: 'base',
      updatedAt: override.updatedAt || null
    };
  }

  function normalizeCustomQuestion(question) {
    return {
      originalId: question.originalId || question.displayId || '',
      sourceSheet: question.sourceSheet || 'Eigene Fragendatenbank',
      sourceRow: question.sourceRow || null,
      questionComment: question.questionComment || '',
      test: question.test || null,
      testName: question.categoryName || question.testName || 'Eigene Fragen',
      categoryId: question.categoryId || 'custom-eigene-fragen',
      categoryName: question.categoryName || question.testName || 'Eigene Fragen',
      displayId: question.displayId || 'Eigene Frage',
      uid: question.uid,
      question: question.question || '',
      answers: Array.isArray(question.answers) ? question.answers : [],
      origin: 'custom',
      createdAt: question.createdAt || null,
      updatedAt: question.updatedAt || null
    };
  }

  function getAllQuestions() {
    const archived = new Set(store.archivedIds || []);
    const base = BASE_QUESTIONS
      .filter(question => !archived.has(question.uid))
      .map(normalizeBaseQuestion);
    const custom = (store.customQuestions || [])
      .filter(question => question && question.uid && !archived.has(question.uid))
      .map(normalizeCustomQuestion);
    return [...base, ...custom];
  }

  function getQuestionByUid(uid, includeArchived = false) {
    const base = BASE_QUESTIONS.find(question => question.uid === uid);
    if (base) {
      if (!includeArchived && (store.archivedIds || []).includes(uid)) return null;
      return normalizeBaseQuestion(base);
    }
    const custom = (store.customQuestions || []).find(question => question.uid === uid);
    if (!custom) return null;
    if (!includeArchived && (store.archivedIds || []).includes(uid)) return null;
    return normalizeCustomQuestion(custom);
  }

  function getCategories() {
    const map = new Map();
    for (let test = 1; test <= 12; test++) {
      map.set(`test-${test}`, {id: `test-${test}`, name: `Test ${test}`, kind: 'base', order: test});
    }
    for (const category of store.customCategories || []) {
      if (category?.id && category?.name) {
        map.set(category.id, {id: category.id, name: category.name, kind: 'custom', order: 1000});
      }
    }
    for (const question of getAllQuestions()) {
      if (!map.has(question.categoryId)) {
        map.set(question.categoryId, {
          id: question.categoryId,
          name: question.categoryName || 'Eigene Fragen',
          kind: question.categoryId.startsWith('test-') ? 'base' : 'custom',
          order: question.categoryId.startsWith('test-') ? Number(question.categoryId.replace('test-', '')) : 1000
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'base' ? -1 : 1;
      return (a.order - b.order) || a.name.localeCompare(b.name, 'de');
    });
  }

  function categoryOptions(selected = 'all', includeNew = false) {
    const questions = getAllQuestions();
    let html = `<option value="all" ${selected === 'all' ? 'selected' : ''}>Alle Kategorien (${questions.length} Fragen)</option>`;
    html += getCategories().map(category => {
      const count = questions.filter(question => question.categoryId === category.id).length;
      return `<option value="${esc(category.id)}" ${selected === category.id ? 'selected' : ''}>${esc(category.name)} (${count})</option>`;
    }).join('');
    if (includeNew) html += '<option value="__new__">＋ Neue Kategorie anlegen</option>';
    return html;
  }

  function poolFor(categoryId) {
    const questions = getAllQuestions();
    return categoryId === 'all' ? questions : questions.filter(question => question.categoryId === categoryId);
  }

  function currentWrongQuestions() {
    const wrong = new Set(store.wrongIds || []);
    return getAllQuestions().filter(question => wrong.has(question.uid));
  }

  function setTheme(theme) {
    store.theme = theme;
    document.documentElement.dataset.theme = theme;
    saveStore();
    render();
  }

  function databaseLabel() {
    const own = (store.customQuestions || []).length;
    const edits = Object.keys(store.overrides || {}).length;
    if (!own && !edits) return 'Originaldatenbank';
    return `${own} eigene · ${edits} bearbeitet`;
  }

  function layout(content) {
    const total = getAllQuestions().length;
    return `<div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <button class="brand" type="button" data-action="home" aria-label="Startseite">
            <div class="brand-mark"><span>Q</span></div>
            <div class="brand-copy">
              <div class="brand-title">QMB Lernplattform</div>
              <div class="brand-sub">Wachsende Lern- und Fragendatenbank</div>
            </div>
          </button>
          <nav class="main-nav" aria-label="Hauptnavigation">
            <button class="nav-btn ${state.view === 'home' ? 'active' : ''}" data-action="home">Start</button>
            <button class="nav-btn ${state.view === 'learningPath' ? 'active' : ''}" data-action="learning-path">Lernpfad</button>
            <button class="nav-btn ${state.view === 'catalog' ? 'active' : ''}" data-action="catalog">Katalog</button>
            <button class="nav-btn ${state.view === 'database' ? 'active' : ''}" data-action="database">Datenbank</button>
            <button class="nav-btn ${state.view === 'statistics' ? 'active' : ''}" data-action="statistics">Statistik</button>
          </nav>
          <div class="top-actions">
            <button class="icon-btn install-btn" id="installBtn" data-action="install" hidden><span>Installieren</span></button>
            <button class="icon-btn" data-action="theme" title="Darstellung wechseln" aria-label="Darstellung wechseln">${store.theme === 'dark' ? '☀' : '◐'}</button>
          </div>
        </div>
      </header>
      <main>${content}
        <footer class="footer-note">
          <span>${total} aktive Fragen · Doppelte Fragen bleiben erhalten</span>
          <span>Excel-Datei: Teichi · Fachliche Betreuung: Bettina Walker</span>
          <span>Konzept & Produktidee: Christian Nitzsche · technische Umsetzung mit KI-Unterstützung</span>
          <button class="footer-link" type="button" data-action="info">Urheberschaft & Datenschutz</button>
          <span>${esc(databaseLabel())}</span>
        </footer>
      </main>
    </div>`;
  }

  function render() {
    clearInterval(timerHandle);
    document.documentElement.dataset.theme = store.theme;
    if (state.view === 'home') renderHome();
    else if (state.view === 'session') renderSession();
    else if (state.view === 'result') renderResult();
    else if (state.view === 'catalog') renderCatalog();
    else if (state.view === 'database') renderDatabase();
    else if (state.view === 'info') renderInfo();
    else if (state.view === 'breakPrompt') renderBreakPrompt();
    else if (state.view === 'game') renderGame();
    else if (state.view === 'startSetup') renderStartSetup();
    else if (state.view === 'statistics') renderStatistics();
    else if (state.view === 'learningPath') renderLearningPath();
    else if (state.view === 'documentSearch') renderDocumentSearch();
    else if (state.view === 'openBookHome') renderOpenBookHome();
    else if (state.view === 'openBookQuestion') renderOpenBookQuestion();
    const installButton = document.getElementById('installBtn');
    if (installButton) installButton.hidden = !deferredInstall;
    window.scrollTo({top: 0, behavior: 'instant'});
  }

  function renderHome() {
    const questions = getAllQuestions();
    const wrongQuestions = currentWrongQuestions();
    const totalAttempts = Object.values(store.stats || {}).reduce((sum, item) => sum + (item.attempts || 0), 0);
    const totalCorrect = Object.values(store.stats || {}).reduce((sum, item) => sum + (item.correct || 0), 0);
    const accuracy = totalAttempts ? Math.round(totalCorrect / totalAttempts * 100) : 0;
    const history = (store.history || []).slice(0, 5);
    const editedCount = Object.keys(store.overrides || {}).length;
    const customCount = (store.customQuestions || []).length;

    app.innerHTML = layout(`
      <section class="hero-panel">
        <div class="hero-content">
          <div class="eyebrow"><span class="status-dot"></span> QMB Lernplattform</div>
          <h1>Professionell lernen. Sicher prüfen. Wissen gezielt festigen.</h1>
          <p class="lead">Der vollständige Originaler Fragenbestand bleibt die Prüfungsgrundlage. Antwortpositionen werden in jedem Durchgang neu gemischt, damit kein erkennbares Lösungsmuster entsteht.</p>
          <div class="hero-actions">
            <button class="primary-btn large" data-action="learning-path">Geführten Lernpfad öffnen</button>
            <button class="secondary-btn large" data-action="start-quick-exam">Prüfung mit 45 Fragen</button>
            <button class="secondary-btn large" data-action="database">Fragendatenbank pflegen</button>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="visual-orbit orbit-one"></div>
          <div class="visual-orbit orbit-two"></div>
          <div class="visual-card main-visual-card">
            <div class="visual-icon">✓</div>
            <strong>${questions.length}</strong>
            <span>aktive Fragen</span>
          </div>
          <div class="visual-chip chip-one">${getCategories().length} Kategorien</div>
          <div class="visual-chip chip-two">${customCount} eigene Fragen</div>
        </div>
      </section>

      ${store.activeSession ? `<section class="resume-session-card">
        <div>
          <div class="eyebrow">Gespeicherter Durchgang</div>
          <h2>${esc(store.activeSession.label || 'Lernrunde')}</h2>
          <p>Du warst bei Frage <strong>${Math.min((store.activeSession.index || 0) + 1, store.activeSession.questions?.length || 0)}</strong> von <strong>${store.activeSession.questions?.length || 0}</strong>. Antworten, Reihenfolge und Zeitstand sind gespeichert.</p>
        </div>
        <div class="actions"><button class="primary-btn" data-action="resume-session">Genau dort fortsetzen</button><button class="ghost-btn" data-action="discard-session">Durchgang verwerfen</button></div>
      </section>` : ''}

      <section class="stats">
        <div class="stat"><div class="stat-icon">Q</div><div><strong>${questions.length}</strong><span>Fragen insgesamt</span></div></div>
        <div class="stat"><div class="stat-icon">＋</div><div><strong>${customCount}</strong><span>selbst ergänzt</span></div></div>
        <div class="stat"><div class="stat-icon">✎</div><div><strong>${editedCount}</strong><span>aktualisiert</span></div></div>
        <div class="stat"><div class="stat-icon">%</div><div><strong>${accuracy}%</strong><span>Trefferquote</span></div></div>
      </section>

      <section class="openbook-home-feature">
        <div><div class="eyebrow">Neu · Lernen mit externen Originalunterlagen</div><h2>Drei getrennte Dokumenten-Lernmodule</h2><p>Komplexe Freitextaufgaben zwingen zum Nachschlagen. Bei Fehlern erscheint nur die exakte Fundstelle – keine vorweggenommene Lösung.</p></div>
        <div class="actions"><button class="secondary-btn" data-action="start-openbook" data-source="iso">ISO-Lernmodul</button><button class="secondary-btn" data-action="start-openbook" data-source="modul1">Modul 1 Lernmodul</button><button class="secondary-btn" data-action="start-openbook" data-source="modul2">Modul 2 Lernmodul</button></div>
      </section>

      <section class="learning-path-feature">
        <div class="learning-path-feature-copy"><div class="eyebrow">Umfangreichster Lernbereich</div><h2>QMB Lernpfad – verstehen, verknüpfen, anwenden</h2><p>Die 473 App-Fragen werden mit ISO, TÜV Modul 1 und TÜV Modul 2 thematisch verbunden. Der Pfad führt dich in kleinen Etappen und reagiert mit passenden Lernhinweisen auf deinen Fortschritt.</p><div class="path-source-row"><span>ISO</span><span>TÜV Modul 1</span><span>TÜV Modul 2</span><span>App-Fragen</span></div></div><button class="primary-btn large" data-action="learning-path">Lernpfad starten</button>
      </section>

      <section class="document-search-home">
        <div><div class="eyebrow">Direkt in den Prüfungsunterlagen suchen</div><h2>Drei getrennte PDF-Suchen</h2><p>ISO, TÜV Modul 1 und TÜV Modul 2 werden jeweils als unverändertes Original-PDF geöffnet.</p></div>
        <div class="actions"><button class="secondary-btn" data-action="document-search" data-source="iso">ISO-Suche</button><button class="secondary-btn" data-action="document-search" data-source="modul1">Modul 1 Suche</button><button class="secondary-btn" data-action="document-search" data-source="modul2">Modul 2 Suche</button></div>
      </section>

      <section class="mode-grid">
        <article class="mode-card learn-card">
          <div class="mode-top"><div class="mode-icon">L</div><span class="mode-tag">Mit Sofortlösung</span></div>
          <h2>Lernmodus</h2>
          <p>Lösungen direkt prüfen, Hinweise lesen und falsch beantwortete Fragen automatisch sammeln.</p>
          <div class="form-grid">
            <div class="field"><label for="learnCategory">Kategorie</label><select id="learnCategory">${categoryOptions('all')}</select></div>
            <div class="field"><label for="learnOrder">Reihenfolge</label><select id="learnOrder"><option value="sequential">Geordnet</option><option value="random">Zufällig</option></select></div>
          </div>
          <div class="actions">
            <button class="primary-btn" data-action="start-learn">Lernen starten</button>
            <button class="secondary-btn" data-action="repeat-wrong" ${wrongQuestions.length ? '' : 'disabled'}>Fehlerfragen (${wrongQuestions.length})</button>
          </div>
        </article>

        <article class="mode-card exam-card">
          <div class="mode-top"><div class="mode-icon">P</div><span class="mode-tag">Mit Zeitmessung</span></div>
          <h2>Prüfungsmodus</h2>
          <p>Zufällige Fragen ohne Lösungshinweise. Die Auswertung erfolgt erst nach dem Abschluss.</p>
          <div class="form-grid">
            <div class="field"><label for="examCategory">Kategorie</label><select id="examCategory">${categoryOptions('all')}</select></div>
            <div class="field"><label for="examCount">Fragenanzahl</label><input id="examCount" type="number" min="1" max="${questions.length}" value="45"></div>
            <div class="field"><label for="passThreshold">Bestehensgrenze</label><div class="input-suffix"><input id="passThreshold" type="number" min="1" max="100" value="${store.passThreshold || 70}"><span>%</span></div></div>
          </div>
          <div class="actions"><button class="primary-btn" data-action="start-exam">Prüfung starten</button></div>
          <div class="hint">Richtig ist eine Frage nur, wenn exakt alle richtigen Antworten und keine falsche Antwort markiert wurden.</div>
        </article>

        <article class="utility-card">
          <div class="utility-icon">⌕</div><div><h3>Fragenkatalog</h3><p>Fragen, Antworten und Erläuterungen durchsuchen.</p></div><button class="round-btn" data-action="catalog">→</button>
        </article>
        <article class="utility-card database-utility">
          <div class="utility-icon">▦</div><div><h3>Wachsende Datenbank</h3><p>Fragen ergänzen, bearbeiten, sichern und übertragen.</p></div><button class="round-btn" data-action="database">→</button>
        </article>
        <article class="utility-card statistics-utility">
          <div class="utility-icon">▥</div><div><h3>Aktuelle & Langzeitstatistik</h3><p>Fortschritt, Lernfelder, Fehler und Antwortneigungen auswerten.</p></div><button class="round-btn" data-action="statistics">→</button>
        </article>
      </section>

      <section class="break-setting-card professional-status-card">
        <div class="break-setting-copy">
          <div class="eyebrow">Bewusste Lernsteuerung</div>
          <h2>Erholungspausen werden vor jeder Runde direkt abgefragt</h2>
          <p>Kein übersehbarer Schalter mehr. Du entscheidest vor jedem Lern- oder Prüfungsstart bewusst zwischen „mit Pause“ und „ohne Pause“.</p>
          <p><strong>${Math.max(0, store.breakNextAt - store.breakAnsweredTotal)} Fragen</strong> bis zum nächsten 50er-Meilenstein · insgesamt ${store.breakAnsweredTotal} gezählt.</p>
        </div>
        <div class="status-seal"><span>50</span><small>Fragen</small></div>
      </section>

      <section class="transparency-strip">
        <div>
          <strong>Excel-Grundlage: Teichi · Fachliche Betreuung: Bettina Walker · Konzept & Produktidee: Christian Nitzsche · technische Umsetzung mit OpenAI ChatGPT</strong>
          <p>Die App arbeitet lokal im Browser. Bei der Nutzung werden keine Fragen, Antworten oder Lernstände an einen KI-Dienst übertragen.</p>
        </div>
        <button class="ghost-btn" type="button" data-action="info">Details ansehen</button>
      </section>

      ${history.length ? `<section class="section-block">
        <div class="section-heading"><div><div class="eyebrow">Verlauf</div><h2>Letzte Prüfungen</h2></div><button class="ghost-btn" data-action="reset-progress">Lernstand zurücksetzen</button></div>
        <div class="history">${history.map(item => `<div class="history-row">
          <div class="history-symbol ${item.passed ? 'pass-bg' : 'fail-bg'}">${item.passed ? '✓' : '!'}</div>
          <div class="history-main"><strong>${esc(item.label)}</strong><span>${new Date(item.date).toLocaleDateString('de-DE')} · ${fmtTime(item.seconds)}</span></div>
          <span class="score ${item.passed ? 'pass' : 'fail'}">${item.percent}%</span>
        </div>`).join('')}</div>
      </section>` : ''}
    `);
  }

  function prepareQuestionsForSession(mode, pool, options = {}) {
    const selectedQuestions = mode === 'exam'
      ? shuffle(pool).slice(0, Math.min(options.count || 45, pool.length))
      : (options.random ? shuffle(pool) : [...pool]);
    const limitedQuestions = mode === 'path' ? selectedQuestions.slice(0, Math.min(options.count || 12, selectedQuestions.length)) : selectedQuestions;

    // Für jeden Durchgang werden die Antwortpositionen neu gemischt.
    // Der fachliche Inhalt und die Kennzeichnung der richtigen Lösungen bleiben unverändert.
    return limitedQuestions.map(question => ({
      ...question,
      answers: shuffle((question.answers || []).map(answer => ({...answer})))
    }));
  }

  function requestSessionStart(mode, pool, options = {}) {
    if (!pool.length) {
      toast('Für diese Auswahl sind keine Fragen vorhanden.');
      return;
    }
    state.pendingSession = {mode, pool, options};
    state.view = 'startSetup';
    render();
  }




  const VERIFIED_DOCUMENTS = {
    iso: {title:'ISO-Suche', file:'./docs/Iso_Nummern.pdf', label:'ISO-Unterlage'},
    modul1: {title:'TÜV Modul 1 Suche', file:'./docs/TUEV_QB_Modul1.pdf', label:'TÜV Modul 1'},
    modul2: {title:'TÜV Modul 2 Suche', file:'./docs/TUEV_QB_Modul2.pdf', label:'TÜV Modul 2'}
  };

  function verifiedSourceNotes(question) {
    const raw = [];
    if (question?.questionComment) raw.push(question.questionComment);
    (question?.answers || []).forEach(answer => { if (answer.comment) raw.push(answer.comment); });
    const unique = [...new Set(raw.map(x => String(x).trim()).filter(Boolean))];
    return unique.filter(note => /(ISO|DIN|TÜV|Modul\s*[12]|Kapitel|Kap\.)/i.test(note));
  }

  function renderDocumentSearch() {
    const source = state.documentSearchSource || 'iso';
    const doc = VERIFIED_DOCUMENTS[source] || VERIFIED_DOCUMENTS.iso;
    const cards = Object.entries(VERIFIED_DOCUMENTS).map(([id,item]) => `
      <button class="document-search-card ${id===source?'active':''}" data-action="select-document-search" data-source="${id}">
        <span class="document-search-icon">⌕</span><strong>${esc(item.title)}</strong><small>Suche direkt im Original-PDF</small>
      </button>`).join('');
    app.innerHTML = layout(`<section class="document-search-page">
      <div class="eyebrow">Prüfungsunterlagen</div><h1>Direkte PDF-Suche</h1>
      <p class="lead">Wähle das Dokument und öffne es. Die Suche erfolgt im Original-PDF über das Lupen-Symbol beziehungsweise „Im Dokument suchen“ des PDF-Readers.</p>
      <div class="document-search-grid">${cards}</div>
      <section class="document-search-focus"><div><div class="eyebrow">Ausgewählt</div><h2>${esc(doc.label)}</h2><p>Es wird ausschließlich das unveränderte Originaldokument geöffnet. Damit kannst du während der Prüfung direkt im zugelassenen PDF suchen.</p></div>
      <a class="primary-btn large" href="${doc.file}" target="_blank" rel="noopener">${esc(doc.label)} öffnen und durchsuchen</a></section>
      <div class="verified-only-note"><strong>Belegregel:</strong> Erklärungen in der App werden nur angezeigt, wenn eine eindeutige Fundstelle aus ISO, TÜV Modul 1 oder TÜV Modul 2 hinterlegt ist. Ohne Fundstelle wird kein Erklärungstext erzeugt.</div>
    </section>`);
  }

  function renderLearningPath() {
    const moduleCards = LEARNING_PATH_MODULES.map(module => {
      const st = moduleStats(module);
      const pool = questionsForLearningModule(module);
      const status = st.completed ? 'Prüfungsreif' : st.started ? 'In Bearbeitung' : 'Noch nicht begonnen';
      const cls = st.completed ? 'done' : st.started ? 'active' : '';
      return `<article class="path-module ${cls}">
        <div class="path-module-number">${module.icon}</div>
        <div class="path-module-main"><div class="path-module-head"><div><span class="path-status">${status}</span><h2>${esc(module.title)}</h2></div><strong>${st.attempts ? st.accuracy+'%' : '–'}</strong></div>
        <p>${esc(module.short)}</p><div class="path-progress"><span style="width:${st.completed?100:Math.min(90,st.attempts*8)}%"></span></div>
        <div class="path-meta"><span>${pool.length} passende Fragen</span><span>${st.attempts} Versuche</span><span>${st.correct} richtig</span></div>
        <details class="path-details"><summary>Lernziel und Quellen</summary><div><p><strong>Lernziel:</strong> ${esc(module.goal)}</p><p><strong>Denkimpuls:</strong> ${esc(module.impulse)}</p><ul><li>${esc(module.iso)}</li><li>${esc(module.m1)}</li><li>${esc(module.m2)}</li></ul></div></details>
        <div class="actions"><button class="primary-btn" data-action="start-path-module" data-module="${module.id}">${st.started ? 'Weiterlernen' : 'Abschnitt beginnen'}</button><button class="ghost-btn" data-action="open-path-docs">Dokumente öffnen</button></div></div>
      </article>`;
    }).join('');
    const completed=LEARNING_PATH_MODULES.filter(m=>moduleStats(m).completed).length;
    app.innerHTML=layout(`<div class="path-page">
      <section class="path-hero"><div><div class="eyebrow">Eigenständiger didaktischer Lernbereich</div><h1>QMB Lernpfad</h1><p class="lead">Entdecken → Verstehen → Verknüpfen → Anwenden → Prüfen → Wiederholen. Grundlage sind ISO, TÜV Modul 1, TÜV Modul 2 und der vollständige Fragenbestand der App.</p><div class="inspiration-note"><strong>Didaktische Inspiration</strong><p>Dieser eigenständig entwickelte Lernpfad würdigt öffentlich vermittelte Lernideen von <strong>Ricardo Leppe</strong>: Lernen soll neugierig machen, Zusammenhänge sichtbar machen und Menschen befähigen, Wissen selbstständig anzuwenden. Ricardo Leppe war an der Erstellung dieser App nicht beteiligt.</p></div></div><div class="path-overview"><strong>${completed}/${LEARNING_PATH_MODULES.length}</strong><span>Abschnitte abgeschlossen</span><div class="path-progress large"><span style="width:${completed/LEARNING_PATH_MODULES.length*100}%"></span></div></div></section>
      <section class="path-documents"><div><div class="eyebrow">Originalunterlagen</div><h2>Beim Lernen direkt nachschlagen</h2><p>Die Dokumente öffnen sich lokal. Nutze die Suchfunktion des PDF-Readers, um Begriffe und Kapitel selbst zu finden.</p></div><div class="actions"><button class="secondary-btn" data-action="document-search" data-source="iso">ISO-Suche</button><button class="secondary-btn" data-action="document-search" data-source="modul1">Modul 1 Suche</button><button class="secondary-btn" data-action="document-search" data-source="modul2">Modul 2 Suche</button></div></section>
      <section class="path-modules">${moduleCards}</section>
    </div>`);
  }

  function renderStartSetup() {
    const pending = state.pendingSession;
    if (!pending) { state.view = 'home'; render(); return; }
    const modeName = pending.mode === 'exam' ? 'Prüfung' : pending.mode === 'review' ? 'Fehlertraining' : 'Lernrunde';
    app.innerHTML = layout(`<section class="start-setup-shell">
      <div class="start-setup-badge">Vor dem Start</div>
      <h1>${modeName} vorbereiten</h1>
      <p class="lead">Möchtest du nach jeweils 50 beantworteten Fragen eine wechselnde Erholungspause nutzen?</p>
      <div class="start-choice-grid">
        <button class="start-choice positive" data-action="confirm-start" data-pause="yes">
          <span class="start-choice-icon">✓</span>
          <strong>Ja, Erholungspausen nutzen</strong>
          <small>Atemwelle, Fernblick und Lockerung wechseln automatisch.</small>
        </button>
        <button class="start-choice neutral" data-action="confirm-start" data-pause="no">
          <span class="start-choice-icon">→</span>
          <strong>Nein, direkt starten</strong>
          <small>Die Runde läuft ohne automatische Unterbrechung.</small>
        </button>
      </div>
      <div class="duration-panel">
        <label for="startBreakDuration">Pausendauer bei Auswahl „Ja“</label>
        <div class="duration-options">
          ${[2,3,4,5].map(min => `<label><input type="radio" name="startBreakDuration" value="${min}" ${Number(store.breakDurationMinutes || 3) === min ? 'checked' : ''}><span>${min} Min.</span></label>`).join('')}
        </div>
      </div>
      <div class="data-foundation-note"><strong>Prüfungsgrundlage:</strong> Der vorhandene ursprüngliche Fragenbestand bleibt vollständig erhalten. Fragen und Antworten werden nur neu angeordnet, nicht inhaltlich verändert.</div>
      <button class="ghost-btn" data-action="cancel-start">Zurück</button>
    </section>`);
  }

  function startSession(mode, pool, options = {}) {
    const questions = prepareQuestionsForSession(mode, pool, options);
    state.session = {
      mode,
      questions,
      index: 0,
      selections: {},
      checked: {},
      startedAt: Date.now(),
      endedAt: null,
      threshold: options.threshold || store.passThreshold || 70,
      label: options.label || 'Lernmodus',
      pathModuleId: options.pathModuleId || null,
      breakGameEnabled: Boolean(options.breakGameEnabled),
      breakDurationMinutes: Number(options.breakDurationMinutes || store.breakDurationMinutes || 3),
      completedUids: [],
      currentQuestionStartedAt: Date.now(),
      correctInSession: 0,
      wrongInSession: 0
    };
    state.pendingSession = null;
    state.view = 'session';
    saveActiveSession();
    render();
  }

  const BREAK_MODULES = [
    {id: 'breath', title: 'Atemwelle', subtitle: 'Ruhiger Rhythmus ohne Leistungsdruck', icon: '◯'},
    {id: 'distance', title: 'Fernblick-Suche', subtitle: 'Blick und Aufmerksamkeit vom Bildschirm lösen', icon: '⌁'},
    {id: 'move', title: 'Lockerungs-Roulette', subtitle: 'Kleine Bewegung statt weiterem Denksport', icon: '↻'}
  ];

  function registerAnsweredQuestion(question) {
    const session = state.session;
    if (!session || !session.breakGameEnabled) return false;
    if (!Array.isArray(session.completedUids)) session.completedUids = [];
    if (session.completedUids.includes(question.uid)) return false;
    session.completedUids.push(question.uid);
    store.breakAnsweredTotal = Number(store.breakAnsweredTotal || 0) + 1;
    if (!Number.isFinite(store.breakNextAt) || store.breakNextAt < 50) store.breakNextAt = 50;
    const reached = store.breakAnsweredTotal >= store.breakNextAt;
    saveStore();
    if (!reached) return false;
    const moduleIndex = Number(store.breakRotationIndex || 0) % BREAK_MODULES.length;
    state.breakPrompt = {
      returnView: 'session',
      milestone: store.breakNextAt,
      moduleIndex
    };
    store.breakNextAt += 50;
    store.breakRotationIndex = (moduleIndex + 1) % BREAK_MODULES.length;
    saveStore();
    state.view = 'breakPrompt';
    render();
    return true;
  }

  function renderBreakPrompt() {
    const milestone = state.breakPrompt?.milestone || store.breakAnsweredTotal;
    const module = BREAK_MODULES[state.breakPrompt?.moduleIndex || 0];
    app.innerHTML = layout(`<section class="break-prompt-card restorative-prompt">
      <div class="break-symbol">${module.icon}</div>
      <div class="eyebrow">${milestone} Fragen geschafft</div>
      <h1>Zeit für eine echte Entlastung</h1>
      <p class="lead">Als Nächstes: <strong>${module.title}</strong> – ${module.subtitle}.</p>
      <p>Die Pausen wechseln automatisch. Es gibt keine Punkte, keine Bestenliste und keine zusätzliche Prüfungsaufgabe.</p>
      <div class="break-choice-grid single-choice">
        <button class="break-choice featured" data-action="start-game" data-minutes="${state.session?.breakDurationMinutes || store.breakDurationMinutes || 3}"><strong>Pause starten</strong><span>${state.session?.breakDurationMinutes || store.breakDurationMinutes || 3} Minuten · ${module.title}</span></button>
      </div>
      <div class="actions centered-actions">
        <button class="secondary-btn" data-action="skip-game">Diesmal überspringen</button>
        <button class="ghost-btn" data-action="disable-game-session">Für diese Lernrunde ausschalten</button>
      </div>
    </section>`);
  }

  const MOVE_CUES = [
    'Schultern langsam nach hinten kreisen.',
    'Hände ausschütteln und Finger weit öffnen.',
    'Aufrichten, Kinn leicht zurücknehmen, ruhig ausatmen.',
    'Beide Füße fest aufstellen und die Beine kurz lockern.',
    'Arme nach oben strecken – nur so weit, wie es angenehm ist.'
  ];
  const DISTANCE_CUES = [
    'Schau aus dem Fenster oder mindestens sechs Meter weit.',
    'Finde drei ruhige Formen oder Farben in der Ferne.',
    'Lass den Blick weich werden und blinzle bewusst.',
    'Wechsle langsam zwischen einem nahen und einem fernen Punkt.'
  ];

  function updateRestTimer() {
    const game = state.game;
    if (!game || state.view !== 'game') return;
    const left = Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000));
    const el = document.getElementById('gameTime');
    if (el) el.textContent = fmtTime(left);
    const elapsed = Math.floor((Date.now() - game.startedAt) / 1000);
    const cueIndex = Math.floor(elapsed / 20);
    if (cueIndex !== game.cueIndex) {
      game.cueIndex = cueIndex;
      const cue = document.getElementById('restCue');
      if (cue) {
        if (game.module.id === 'move') cue.textContent = MOVE_CUES[cueIndex % MOVE_CUES.length];
        if (game.module.id === 'distance') cue.textContent = DISTANCE_CUES[cueIndex % DISTANCE_CUES.length];
      }
    }
    if (left <= 0) endGameBreak();
  }

  function startGameBreak(minutes) {
    const moduleIndex = state.breakPrompt?.moduleIndex ?? (Number(store.breakRotationIndex || 0) % BREAK_MODULES.length);
    state.game = {
      module: BREAK_MODULES[moduleIndex],
      startedAt: Date.now(),
      endsAt: Date.now() + minutes * 60 * 1000,
      minutes,
      cueIndex: -1
    };
    state.view = 'game';
    render();
  }

  function renderGame() {
    const game = state.game;
    let activity = '';
    if (game.module.id === 'breath') {
      activity = `<div class="breath-stage" aria-label="Ruhiger Atemrhythmus">
        <div class="breath-orb"><span>ruhig</span></div>
        <p id="restCue">Atme bequem ein, wenn der Kreis größer wird, und länger aus, wenn er kleiner wird.</p>
      </div>`;
    } else if (game.module.id === 'distance') {
      activity = `<div class="distance-stage">
        <div class="distance-icon">⌁</div>
        <p id="restCue">${DISTANCE_CUES[0]}</p>
        <p class="rest-small">Lege das Smartphone möglichst ab. Diese Pause funktioniert besser, wenn du nicht weiter auf den Bildschirm starrst.</p>
      </div>`;
    } else {
      activity = `<div class="move-stage">
        <div class="move-icon">↻</div>
        <p id="restCue">${MOVE_CUES[0]}</p>
        <p class="rest-small">Langsam und schmerzfrei bewegen. Es geht nicht um Training, sondern um einen Wechsel der Beanspruchung.</p>
      </div>`;
    }
    app.innerHTML = layout(`<section class="game-shell restorative-shell">
      <div class="game-head"><div><div class="eyebrow">Erholungspause ${game.module.icon}</div><h1>${game.module.title}</h1><p>${game.module.subtitle}</p></div>
      <div class="game-stats"><span>Restzeit <strong id="gameTime">${fmtTime(game.minutes * 60)}</strong></span></div></div>
      ${activity}
      <div class="actions centered-actions"><button class="secondary-btn" data-action="end-game">Pause beenden und weiterlernen</button></div>
    </section>`);
    timerHandle = setInterval(updateRestTimer, 1000);
    updateRestTimer();
  }

  function endGameBreak() {
    clearInterval(timerHandle);
    state.game = null;
    state.breakPrompt = null;
    state.view = state.session ? 'session' : 'home';
    render();
    toast('Erholungspause beendet – weiter geht’s.');
  }

  function renderSession() {
    const session = state.session;
    const question = session.questions[session.index];
    const selected = selectedFor(question.uid);
    const checked = Boolean(session.checked[question.uid]);
    const correct = correctIndexes(question);
    const isRight = sameSet(selected, correct);
    const percent = Math.round((session.index + 1) / session.questions.length * 100);

    const answers = question.answers.map((answer, index) => {
      const isSelected = selected.includes(index);
      let className = '';
      let badge = '';
      if (checked) {
        if (answer.correct) {
          className = isSelected ? 'correct' : 'missed';
          badge = isSelected ? '✓ RICHTIG AUSGEWÄHLT' : '✓ RICHTIGE LÖSUNG – NICHT AUSGEWÄHLT';
        } else if (isSelected) {
          className = 'incorrect';
          badge = '✕ FALSCH AUSGEWÄHLT';
        }
      }
      return `<label class="answer ${className}">
        <input type="checkbox" data-answer="${index}" ${isSelected ? 'checked' : ''} ${checked ? 'disabled' : ''}>
        <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
        <span class="answer-text">${esc(answer.text)}</span>
        ${badge ? `<span class="answer-badge ${answer.correct ? 'tag-ok' : 'tag-bad'}">${badge}</span>` : ''}
      </label>`;
    }).join('');

    let feedback = '';
    if (checked) {
      const comments = verifiedSourceNotes(question);
      feedback = `<div class="feedback ${isRight ? 'ok' : 'bad'}" role="status" aria-live="assertive">
        <div class="feedback-icon" aria-hidden="true">${isRight ? '✓' : '✕'}</div>
        <div><h3>${isRight ? 'RICHTIG' : 'FALSCH'}</h3>
        <p>${isRight ? 'Deine Auswahl stimmt vollständig mit der hinterlegten Lösung überein.' : 'Deine Auswahl ist nicht vollständig korrekt. Grün kennzeichnet die richtige Lösung; Rot kennzeichnet eine falsch ausgewählte Antwort.'}</p>
        ${comments.length ? `<div class="verified-evidence"><strong>Eindeutig hinterlegter Quellenbeleg:</strong><p>${esc(comments.join(' · '))}</p><div class="actions"><button class="mini-source-btn" data-action="document-search" data-source="iso">ISO prüfen</button><button class="mini-source-btn" data-action="document-search" data-source="modul1">Modul 1 prüfen</button><button class="mini-source-btn" data-action="document-search" data-source="modul2">Modul 2 prüfen</button></div></div>` : `<div class="unverified-evidence"><strong>Kein verifizierter Quellenbeleg hinterlegt.</strong><p>Aus Sicherheitsgründen wird für diese Frage keine Erklärung angezeigt.</p></div>`}</div>
      </div>`;
    }

    const isExam = session.mode === 'exam';
    app.innerHTML = layout(`<div class="session-wrap">
      <div class="session-head">
        <div class="session-meta">
          <span class="pill strong-pill">${esc(session.label)}</span>
          <span class="pill">${esc(question.categoryName || question.testName)}</span>
          <span class="pill">${session.index + 1} / ${session.questions.length}</span>
        </div>
        ${isExam ? '<div class="timer" id="timer">0:00</div>' : ''}
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
      <article class="question-card">
        <div class="question-label-row"><span class="question-id">Frage ${esc(question.displayId)}</span><span class="question-origin">${question.origin === 'custom' ? 'Eigene Datenbank' : 'Originaler Fragenbestand'}</span></div>
        <h2 class="question-text">${esc(question.question)}</h2>
        <div class="instruction">Eine oder mehrere Antworten können richtig sein.</div>
        ${session.mode === 'path' ? `<aside class="learning-coach"><span>Lernbegleiter</span><p>${esc(learningCoachMessage(session))}</p></aside>` : ''}
        <div class="answers">${answers}</div>
        ${feedback}
      </article>
      <div class="session-actions">
        <button class="secondary-btn" data-action="prev" ${session.index === 0 ? 'disabled' : ''}>← Zurück</button>
        <div class="spacer"></div>
        ${!isExam && !checked ? '<button class="primary-btn" data-action="check">Antwort prüfen</button>' : ''}
        ${!isExam && checked ? `<button class="primary-btn" data-action="next">${session.index === session.questions.length - 1 ? 'Lernrunde beenden' : 'Nächste Frage →'}</button>` : ''}
        ${isExam ? `<button class="secondary-btn" data-action="next" ${session.index === session.questions.length - 1 ? 'disabled' : ''}>Weiter →</button><button class="danger-btn" data-action="finish-exam">Prüfung abschließen</button>` : ''}
      </div>
    </div>`);

    if (isExam) {
      updateTimer();
      timerHandle = setInterval(updateTimer, 1000);
    }
  }

  function updateTimer() {
    const element = document.getElementById('timer');
    if (element && state.session) element.textContent = fmtTime((Date.now() - state.session.startedAt) / 1000);
  }

  function toggleAnswer(index, checked) {
    const session = state.session;
    const question = session.questions[session.index];
    if (session.checked[question.uid]) return;
    const selected = new Set(session.selections[question.uid] || []);
    checked ? selected.add(index) : selected.delete(index);
    session.selections[question.uid] = [...selected];
    saveActiveSession();
  }

  function recordAttempt(question, correct) {
    const session = state.session;
    const selected = session?.selections?.[question.uid] || [];
    const expected = correctIndexes(question);
    const responseSeconds = session?.currentQuestionStartedAt ? Math.max(0, Math.round((Date.now() - session.currentQuestionStartedAt) / 1000)) : 0;
    const stats = store.stats[question.uid] || {attempts: 0, correct: 0, wrong: 0};
    stats.attempts += 1;
    if (correct) stats.correct += 1; else stats.wrong = (stats.wrong || 0) + 1;
    stats.lastAttemptAt = new Date().toISOString();
    store.stats[question.uid] = stats;
    const wrong = new Set(store.wrongIds);
    correct ? wrong.delete(question.uid) : wrong.add(question.uid);
    store.wrongIds = [...wrong];
    store.attemptLog = [...(store.attemptLog || []), {
      at: new Date().toISOString(), uid: question.uid, displayId: question.displayId,
      learningFieldId: question.categoryId || 'unbekannt', learningField: question.categoryName || question.testName || 'Unbekannt',
      mode: session?.mode || 'unknown', correct, selectedCount: selected.length, correctCount: expected.length, responseSeconds
    }].slice(-10000);
    if (session) {
      if (correct) session.correctInSession = Number(session.correctInSession || 0) + 1;
      else session.wrongInSession = Number(session.wrongInSession || 0) + 1;
    }
    saveStore();
  }

  function checkLearning() {
    const session = state.session;
    const question = session.questions[session.index];
    if (session.checked[question.uid]) return;
    session.checked[question.uid] = true;
    recordAttempt(question, sameSet(selectedFor(question.uid), correctIndexes(question)));
    saveActiveSession();
    if (registerAnsweredQuestion(question)) return;
    render();
  }

  function nextQuestion() {
    const session = state.session;
    const current = session.questions[session.index];
    if (session.mode === 'exam' && (session.selections[current.uid] || []).length && registerAnsweredQuestion(current)) return;
    if (session.index >= session.questions.length - 1) {
      if (session.mode === 'exam') return;
      completeLearningSession();
      state.view = 'home';
      state.session = null;
      clearActiveSession();
      render();
      toast('Lernrunde abgeschlossen und gespeichert.');
      return;
    }
    session.index += 1;
    session.currentQuestionStartedAt = Date.now();
    saveActiveSession();
    render();
  }

  function prevQuestion() {
    if (state.session.index > 0) {
      state.session.index -= 1;
      state.session.currentQuestionStartedAt = Date.now();
      saveActiveSession();
      render();
    }
  }

  function completeLearningSession() {
    const session = state.session;
    if (session?.mode === 'path' && session.pathModuleId) {
      const answeredNow = Object.keys(session.checked || {}).length;
      const ratio = answeredNow ? Number(session.correctInSession || 0) / answeredNow : 0;
      store.learningPathProgress[session.pathModuleId] = {
        ...(store.learningPathProgress[session.pathModuleId] || {}),
        startedAt: store.learningPathProgress[session.pathModuleId]?.startedAt || new Date().toISOString(),
        lastAt: new Date().toISOString(), completed: answeredNow >= 6 && ratio >= .7
      };
      store.learningPathLastModule = session.pathModuleId;
    }
    if (!session) return;
    const seconds = Math.max(0, Math.round((Date.now() - session.startedAt) / 1000));
    const answered = Object.keys(session.checked || {}).length;
    const right = Number(session.correctInSession || 0);
    const percent = answered ? Math.round(right / answered * 100) : 0;
    store.sessionHistory = [{
      date: new Date().toISOString(), mode: session.mode, label: session.label,
      percent, right, wrong: Number(session.wrongInSession || 0), total: answered, seconds, completed: true
    }, ...(store.sessionHistory || [])].slice(0, 500);
    saveStore();
  }

  function finishExam() {
    const session = state.session;
    const unanswered = session.questions.filter(question => (session.selections[question.uid] || []).length === 0).length;
    if (unanswered && !confirm(`${unanswered} Frage(n) sind noch unbeantwortet. Prüfung trotzdem abschließen?`)) return;
    session.questions.forEach(question => {
      if ((session.selections[question.uid] || []).length && !session.completedUids.includes(question.uid)) {
        session.completedUids.push(question.uid);
        store.breakAnsweredTotal = Number(store.breakAnsweredTotal || 0) + 1;
      }
    });
    saveStore();
    session.endedAt = Date.now();
    session.results = session.questions.map(question => ({
      q: question,
      selected: session.selections[question.uid] || [],
      correct: sameSet(session.selections[question.uid] || [], correctIndexes(question))
    }));
    session.results.forEach(result => recordAttempt(result.q, result.correct));
    const right = session.results.filter(result => result.correct).length;
    const percent = Math.round(right / session.results.length * 100);
    const seconds = Math.round((session.endedAt - session.startedAt) / 1000);
    const passed = percent >= session.threshold;
    store.passThreshold = session.threshold;
    store.history = [{
      date: new Date().toISOString(), label: session.label, percent, right,
      total: session.results.length, seconds, passed
    }, ...(store.history || [])].slice(0, 50);
    store.sessionHistory = [{
      date: new Date().toISOString(), mode: 'exam', label: session.label, percent, right,
      wrong: session.results.length - right, total: session.results.length, seconds, passed, completed: true
    }, ...(store.sessionHistory || [])].slice(0, 500);
    store.activeSession = null;
    saveStore();
    state.view = 'result';
    render();
  }

  function renderResult() {
    const session = state.session;
    const results = session.results || [];
    const right = results.filter(result => result.correct).length;
    const wrong = results.length - right;
    const percent = Math.round(right / results.length * 100);
    const seconds = Math.round((session.endedAt - session.startedAt) / 1000);
    const passed = percent >= session.threshold;

    const wrongItems = results.filter(result => !result.correct).map((result, index) => {
      const selected = result.selected;
      return `<details class="wrong-item" ${index < 2 ? 'open' : ''}>
        <summary><span>${esc(result.q.displayId)}</span>${esc(result.q.question)}</summary>
        <div class="wrong-detail">${result.q.answers.map((answer, answerIndex) => {
          const wasSelected = selected.includes(answerIndex);
          let status = '';
          if (answer.correct && wasSelected) status = '<span class="result-answer-status ok">✓ RICHTIG AUSGEWÄHLT</span>';
          else if (answer.correct) status = '<span class="result-answer-status ok">✓ RICHTIGE LÖSUNG – NICHT AUSGEWÄHLT</span>';
          else if (wasSelected) status = '<span class="result-answer-status bad">✕ FALSCH AUSGEWÄHLT</span>';
          return `<div class="answer-line">${status}<span class="${answer.correct ? 'tag-ok' : wasSelected ? 'tag-bad' : ''}">${esc(answer.text)}</span></div>`;
        }).join('')}</div>
      </details>`;
    }).join('');

    app.innerHTML = layout(`<div class="session-wrap">
      <section class="result-hero ${passed ? 'result-pass' : 'result-fail'}">
        <div class="score-ring" style="--score:${percent * 3.6}deg;--score-color:${passed ? 'var(--ok)' : 'var(--bad)'}"><strong>${percent}%</strong></div>
        <div class="eyebrow">Prüfung beendet</div>
        <h1 class="${passed ? 'pass' : 'fail'}">${passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}</h1>
        <p>Bestehensgrenze: ${session.threshold}%</p>
        <div class="result-grid">
          <div class="result-box result-correct"><strong>${right}</strong><span>RICHTIG</span></div>
          <div class="result-box result-wrong"><strong>${wrong}</strong><span>FALSCH</span></div>
          <div class="result-box"><strong>${results.length}</strong><span>gesamt</span></div>
          <div class="result-box"><strong>${fmtTime(seconds)}</strong><span>Zeit</span></div>
        </div>
        <div class="actions centered">
          <button class="primary-btn" data-action="repeat-result-wrong" ${wrong ? '' : 'disabled'}>Fehlerfragen wiederholen</button>
          <button class="secondary-btn" data-action="new-exam">Neue Prüfung</button>
          <button class="ghost-btn" data-action="home">Startseite</button>
        </div>
      </section>
      ${wrong ? `<section class="section-block"><div class="section-heading"><div><div class="eyebrow">Auswertung</div><h2>Falsch beantwortete Fragen</h2></div></div><div class="wrong-list">${wrongItems}</div></section>` : '<div class="empty success-empty">Alle Fragen wurden richtig beantwortet.</div>'}
    </div>`);
  }


  function renderStatistics() {
    const attempts = store.attemptLog || [];
    const sessions = store.sessionHistory || [];
    const total = attempts.length;
    const correct = attempts.filter(item => item.correct).length;
    const accuracy = total ? Math.round(correct / total * 100) : 0;
    const totalSeconds = sessions.reduce((sum, item) => sum + Number(item.seconds || 0), 0);
    const fieldMap = new Map();
    attempts.forEach(item => {
      const key = item.learningFieldId || item.learningField || 'unbekannt';
      const row = fieldMap.get(key) || {name: item.learningField || key, attempts: 0, correct: 0, over: 0, under: 0, exact: 0, seconds: 0};
      row.attempts += 1;
      if (item.correct) row.correct += 1;
      if (item.selectedCount > item.correctCount) row.over += 1;
      else if (item.selectedCount < item.correctCount) row.under += 1;
      else row.exact += 1;
      row.seconds += Number(item.responseSeconds || 0);
      fieldMap.set(key, row);
    });
    const fields = [...fieldMap.values()].sort((a,b) => a.name.localeCompare(b.name, 'de'));
    const fieldRows = fields.map(row => {
      const pct = row.attempts ? Math.round(row.correct / row.attempts * 100) : 0;
      let tendency = 'ausgeglichen';
      if (row.over > row.under * 1.35 && row.over >= 3) tendency = 'häufig zu viele Antworten';
      else if (row.under > row.over * 1.35 && row.under >= 3) tendency = 'häufig zu wenige Antworten';
      const avg = row.attempts ? Math.round(row.seconds / row.attempts) : 0;
      return `<tr><td><strong>${esc(row.name)}</strong></td><td>${row.attempts}</td><td>${pct}%</td><td>${row.attempts-row.correct}</td><td>${esc(tendency)}</td><td>${fmtTime(avg)}</td></tr>`;
    }).join('');
    const hard = Object.entries(store.stats || {}).map(([uid, st]) => {
      const q = getQuestionByUid(uid, true);
      const attempts = Number(st.attempts || 0);
      return q && attempts ? {q, attempts, wrong: attempts - Number(st.correct || 0), pct: Math.round(Number(st.correct || 0)/attempts*100)} : null;
    }).filter(Boolean).sort((a,b) => (b.wrong-a.wrong) || (a.pct-b.pct)).slice(0,10);
    const hardRows = hard.map(item => `<tr><td>${esc(item.q.displayId)}</td><td>${esc(item.q.categoryName || item.q.testName)}</td><td>${item.attempts}</td><td>${item.wrong}</td><td>${item.pct}%</td></tr>`).join('');
    const recentSessions = sessions.slice(0,20).map(item => `<tr><td>${formatDate(item.date, true)}</td><td>${esc(item.label || item.mode)}</td><td>${item.total || 0}</td><td>${Number.isFinite(item.percent) ? item.percent+'%' : '–'}</td><td>${fmtTime(item.seconds || 0)}</td></tr>`).join('');
    const active = store.activeSession;
    const activeAnswered = active ? (active.mode === 'exam' ? Object.keys(active.selections || {}).filter(uid => (active.selections[uid] || []).length).length : Object.keys(active.checked || {}).length) : 0;

    app.innerHTML = layout(`<div class="statistics-page">
      <section class="page-hero compact-hero"><div><div class="eyebrow">Lernanalyse</div><h1>Aktuelle und langfristige Statistik</h1><p class="lead">Die Auswertung zeigt nicht nur Ergebnisse, sondern erkennt Fehlerschwerpunkte und Antwortneigungen in den einzelnen Lernfeldern.</p></div></section>
      ${active ? `<section class="current-session-stat"><div><div class="eyebrow">Aktueller Durchgang</div><h2>${esc(active.label || 'Lernrunde')}</h2><p>Position ${Math.min((active.index||0)+1, active.questions?.length||0)} von ${active.questions?.length||0} · ${activeAnswered} beantwortet · ${Number(active.correctInSession||0)} richtig · ${Number(active.wrongInSession||0)} falsch</p></div><button class="primary-btn" data-action="resume-session">Fortsetzen</button></section>` : '<section class="current-session-stat empty-current"><strong>Aktuell ist kein unterbrochener Durchgang gespeichert.</strong></section>'}
      <section class="stats statistics-summary"><div class="stat"><div class="stat-icon">Σ</div><div><strong>${total}</strong><span>Antworten langfristig</span></div></div><div class="stat"><div class="stat-icon">%</div><div><strong>${accuracy}%</strong><span>Gesamttrefferquote</span></div></div><div class="stat"><div class="stat-icon">↻</div><div><strong>${sessions.length}</strong><span>gespeicherte Durchläufe</span></div></div><div class="stat"><div class="stat-icon">◷</div><div><strong>${fmtTime(totalSeconds)}</strong><span>erfasste Lernzeit</span></div></div></section>
      <section class="section-block"><div class="section-heading"><div><div class="eyebrow">Auswertung nach Lernfeld</div><h2>Fehler und Neigungen</h2></div></div><div class="table-scroll"><table class="analytics-table"><thead><tr><th>Lernfeld</th><th>Antworten</th><th>Trefferquote</th><th>Fehler</th><th>erkannte Neigung</th><th>Ø Zeit</th></tr></thead><tbody>${fieldRows || '<tr><td colspan="6">Noch keine Daten vorhanden.</td></tr>'}</tbody></table></div></section>
      <section class="section-block"><div class="section-heading"><div><div class="eyebrow">Fehlerschwerpunkte</div><h2>Schwierigste Fragen</h2></div></div><div class="table-scroll"><table class="analytics-table"><thead><tr><th>Frage</th><th>Lernfeld</th><th>Versuche</th><th>Fehler</th><th>Quote</th></tr></thead><tbody>${hardRows || '<tr><td colspan="5">Noch keine Daten vorhanden.</td></tr>'}</tbody></table></div></section>
      <section class="section-block"><div class="section-heading"><div><div class="eyebrow">Verlauf</div><h2>Letzte Durchläufe</h2></div></div><div class="table-scroll"><table class="analytics-table"><thead><tr><th>Datum</th><th>Durchgang</th><th>Fragen</th><th>Ergebnis</th><th>Zeit</th></tr></thead><tbody>${recentSessions || '<tr><td colspan="5">Noch keine abgeschlossenen Durchläufe.</td></tr>'}</tbody></table></div></section>
    </div>`);
  }

  function renderInfo() {
    app.innerHTML = layout(`<div class="info-page">
      <section class="page-hero compact-hero">
        <div>
          <div class="eyebrow">Transparenz</div>
          <h1>Urheberschaft, KI-Unterstützung & Datenschutz</h1>
          <p class="lead">Klare Informationen zur fachlichen Grundlage, zur technischen Erstellung und zur lokalen Datenverarbeitung dieser App.</p>
        </div>
        <div class="page-hero-badge">Lokal<span>ohne Cloud-Zwang</span></div>
      </section>

      <div class="info-grid">
        <article class="info-card">
          <h2>Grundlage und Urheberschaft</h2>
          <p><strong>Ersteller der ursprünglichen Excel-Fragensammlung:</strong> Teichi.</p>
          <p><strong>Fachliche Betreuung des QMB-Lehrgangs:</strong> Bettina Walker.</p>
          <p><strong>Konzept, Produktidee und Projektleitung:</strong> Christian Nitzsche.</p>
          <p><strong>Technische Umsetzung und KI-Unterstützung:</strong> OpenAI ChatGPT – für Programmierung, Gestaltung und Strukturierung.</p>
          <div class="inspiration-note"><strong>Didaktische Inspiration des Lernpfads</strong><p>Der eigenständig entwickelte Lernpfad wurde durch öffentlich vermittelte Lernideen von <strong>Ricardo Leppe</strong> inspiriert. Ricardo Leppe war weder an der Entwicklung der App noch an der Erstellung, Prüfung oder Freigabe ihrer fachlichen Inhalte beteiligt.</p></div>
          <p>Die KI-Unterstützung wurde bei der Erstellung der App eingesetzt. Während der normalen Nutzung besteht keine Verbindung zu einem KI-Dienst; Fragen, Antworten und Lernergebnisse werden nicht an eine KI übermittelt.</p>
        </article>

        <article class="info-card privacy">
          <h2>Datenschutzfreundliche lokale Verarbeitung</h2>
          <p>Die App benötigt keine Registrierung und fragt weder Namen noch E-Mail-Adresse ab. Für die ausdrücklich gewünschten Funktionen speichert sie ausschließlich auf dem verwendeten Gerät beziehungsweise im Browser:</p>
          <ul>
            <li>Lernstand, Fehlerliste, Statistiken und Prüfungshistorie,</li>
            <li>Darstellungs- und Prüfungseinstellungen,</li>
            <li>eigene Fragen, Kategorien, Bearbeitungen und ausgeblendete Fragen.</li>
          </ul>
          <p>Die Speicherung erfolgt im lokalen Browserspeicher (<em>Local Storage</em>). Es gibt keine automatische Übermittlung an die genannten Ersteller oder Betreuer, einen KI-Anbieter oder sonstige Dritte.</p>
          <div class="info-badge-row">
            <span class="info-badge">keine Benutzerkonten</span>
            <span class="info-badge">keine Werbung</span>
            <span class="info-badge">keine Analyse- oder Trackingdienste</span>
            <span class="info-badge">keine externen Schriftarten</span>
            <span class="info-badge">kein Kamera-, Mikrofon- oder Standortzugriff</span>
          </div>
        </article>

        <article class="info-card">
          <h2>Export, Import und Löschung</h2>
          <p>Eine Datenübertragung findet nur statt, wenn du selbst eine Sicherungsdatei exportierst, weitergibst oder importierst. Diese Dateien können eigene Inhalte enthalten und sollten entsprechend geschützt aufbewahrt werden.</p>
          <p>Den Lernstand kannst du auf der Startseite zurücksetzen. Mit der folgenden Funktion werden sämtliche lokal gespeicherten App-Daten einschließlich eigener Fragen, Kategorien und Bearbeitungen gelöscht; die eingebettete ursprüngliche Fragenbasis bleibt Bestandteil der App-Datei.</p>
          <div class="actions"><button class="danger-btn" type="button" data-action="delete-all-local-data">Alle lokalen App-Daten löschen</button></div>
        </article>

        <article class="info-card warning">
          <h2>Hinweis bei öffentlicher Bereitstellung</h2>
          <p>Diese herunterladbare lokale Version sendet selbst keine Nutzungsdaten an einen Server. Wird die App später auf einer Website oder über einen App-Store veröffentlicht, können jedoch durch Hosting, Server-Protokolle, Updates oder Store-Dienste zusätzliche Datenverarbeitungen entstehen.</p>
          <p>Vor einer öffentlichen oder gewerblichen Veröffentlichung müssen deshalb insbesondere die verantwortliche Stelle mit Kontaktdaten, Hostinganbieter, Zwecke, Rechtsgrundlagen, Speicherdauer, Empfänger und Betroffenenrechte konkret ergänzt und rechtlich geprüft werden. Diese technische Datenschutzinformation ersetzt keine individuelle Rechtsberatung.</p>
        </article>
      </div>
      <div class="actions centered"><button class="primary-btn" type="button" data-action="home">Zur Startseite</button></div>
    </div>`);
  }

  function renderCatalog() {
    app.innerHTML = layout(`<section class="page-hero compact-hero">
      <div><div class="eyebrow">Nachschlagen</div><h1>Fragenkatalog</h1><p class="lead">Durchsuche den vollständigen aktuellen Datenbestand – einschließlich deiner eigenen und bearbeiteten Fragen.</p></div>
      <div class="page-hero-badge">${getAllQuestions().length}<span>aktive Fragen</span></div>
    </section>
    <section class="card catalog-card">
      <div class="catalog-toolbar">
        <div class="search-field"><span>⌕</span><input id="catalogSearch" type="search" placeholder="Frage oder Antwort durchsuchen …" value="${esc(state.catalogQuery)}"></div>
        <select id="catalogCategory">${categoryOptions(state.catalogCategory)}</select>
      </div>
      <div id="catalogResults"></div>
    </section>`);
    updateCatalogResults();
  }

  function updateCatalogResults() {
    const element = document.getElementById('catalogResults');
    if (!element) return;
    const query = state.catalogQuery.trim().toLowerCase();
    const list = getAllQuestions().filter(item =>
      (state.catalogCategory === 'all' || item.categoryId === state.catalogCategory) &&
      (!query || item.question.toLowerCase().includes(query) || item.answers.some(answer => answer.text.toLowerCase().includes(query)))
    );
    element.innerHTML = `<div class="catalog-count"><strong>${list.length}</strong> Treffer</div>
      <div class="catalog-list">${list.map(item => `<details class="catalog-item">
        <summary><span class="catalog-meta">${esc(item.displayId)}</span><span>${esc(item.question)}</span><span class="origin-badge ${item.origin}">${item.origin === 'custom' ? 'Eigene Frage' : item.updatedAt ? 'Bearbeitet' : 'Grundbestand'}</span></summary>
        <div class="catalog-detail">
          <div class="catalog-category">${esc(item.categoryName)}</div>
          ${item.answers.map(answer => `<div class="catalog-answer ${answer.correct ? 'is-correct' : ''}">${answer.correct ? '<span class="tag-ok">✓ </span>' : ''}${esc(answer.text)}${answer.comment ? `<div class="hint">${esc(answer.comment)}</div>` : ''}</div>`).join('')}
          ${item.questionComment ? `<div class="question-note"><strong>Hinweis:</strong> ${esc(item.questionComment)}</div>` : ''}
        </div>
      </details>`).join('')}</div>`;
  }

  function blankAnswer(index = 0) {
    return {text: '', correct: index === 0, comment: ''};
  }

  function renderAnswerRow(answer, index) {
    return `<div class="answer-editor" data-answer-row>
      <div class="answer-editor-head"><span class="answer-letter">${String.fromCharCode(65 + index)}</span><label class="correct-switch"><input type="checkbox" data-field="answer-correct" ${answer.correct ? 'checked' : ''}><span>Richtige Antwort</span></label><button type="button" class="mini-danger" data-action="remove-answer" title="Antwort entfernen">×</button></div>
      <input type="text" data-field="answer-text" value="${esc(answer.text)}" placeholder="Antwortmöglichkeit eingeben" required>
      <input type="text" data-field="answer-comment" value="${esc(answer.comment || '')}" placeholder="Optionaler Hinweis zu dieser Antwort">
    </div>`;
  }

  function renderDatabase() {
    const allQuestions = getAllQuestions();
    const customCount = (store.customQuestions || []).length;
    const editedCount = Object.keys(store.overrides || {}).length;
    const archivedCount = (store.archivedIds || []).length;
    const editingQuestion = state.editingUid ? getQuestionByUid(state.editingUid, true) : null;
    const formQuestion = editingQuestion || {
      categoryId: getCategories()[0]?.id || 'test-1', categoryName: getCategories()[0]?.name || 'Test 1',
      displayId: '', question: '', questionComment: '', answers: [blankAnswer(0), blankAnswer(1), blankAnswer(2)]
    };

    app.innerHTML = layout(`
      <section class="page-hero database-hero">
        <div>
          <div class="eyebrow"><span class="status-dot"></span> Pflegebereich</div>
          <h1>Wachsende Fragendatenbank</h1>
          <p class="lead">Neue Fragen und Änderungen werden lokal gespeichert und sofort in allen Bereichen der App verwendet. Mit Sicherung und Import kannst du den Datenbestand übertragen.</p>
        </div>
        <div class="database-health">
          <div class="health-ring"><strong>${allQuestions.length}</strong><span>aktiv</span></div>
          <div><strong>Letzte Änderung</strong><span>${esc(formatDate(store.databaseUpdatedAt, true))}</span></div>
        </div>
      </section>

      <section class="db-stats">
        <div class="db-stat"><span>Grundbestand</span><strong>${BASE_QUESTIONS.length}</strong></div>
        <div class="db-stat"><span>Eigene Fragen</span><strong>${customCount}</strong></div>
        <div class="db-stat"><span>Bearbeitete Fragen</span><strong>${editedCount}</strong></div>
        <div class="db-stat"><span>Kategorien</span><strong>${getCategories().length}</strong></div>
      </section>

      <section class="database-layout">
        <article class="card editor-card">
          <div class="section-heading compact-heading"><div><div class="eyebrow">${editingQuestion ? 'Frage aktualisieren' : 'Datenbank erweitern'}</div><h2>${editingQuestion ? 'Frage bearbeiten' : 'Neue Frage anlegen'}</h2></div>${editingQuestion ? '<button class="ghost-btn" data-action="cancel-edit">Abbrechen</button>' : ''}</div>
          <form id="questionForm" novalidate>
            <input type="hidden" id="editingUid" value="${esc(editingQuestion?.uid || '')}">
            <div class="form-grid two-col">
              <div class="field"><label for="questionCategory">Kategorie</label><select id="questionCategory">${categoryOptions(formQuestion.categoryId, true).replace('<option value="all"', '<option value="all" disabled')}</select></div>
              <div class="field"><label for="questionDisplayId">Fragenkennung</label><input id="questionDisplayId" type="text" value="${esc(formQuestion.displayId || '')}" placeholder="z. B. 3.46 oder Eigene 1"></div>
            </div>
            <div class="field new-category-field ${formQuestion.categoryId === '__new__' ? '' : 'hidden'}" id="newCategoryWrap"><label for="newCategoryName">Name der neuen Kategorie</label><input id="newCategoryName" type="text" placeholder="z. B. Interne Audits"></div>
            <div class="field"><label for="questionText">Frage</label><textarea id="questionText" rows="4" placeholder="Frage vollständig eingeben" required>${esc(formQuestion.question || '')}</textarea></div>
            <div class="field"><label for="questionComment">Erklärung oder allgemeiner Hinweis <span>optional</span></label><textarea id="questionComment" rows="2" placeholder="Zusätzliche Erläuterung zur Lösung">${esc(formQuestion.questionComment || '')}</textarea></div>
            <div class="answer-editor-section">
              <div class="answer-section-title"><div><strong>Antwortmöglichkeiten</strong><span>Mindestens zwei Antworten und mindestens eine richtige Antwort</span></div><button type="button" class="secondary-btn small" data-action="add-answer">＋ Antwort hinzufügen</button></div>
              <div id="answerEditorList">${formQuestion.answers.map(renderAnswerRow).join('')}</div>
            </div>
            <div class="form-message" id="formMessage" hidden></div>
            <div class="actions"><button type="submit" class="primary-btn">${editingQuestion ? 'Änderungen speichern' : 'Frage zur Datenbank hinzufügen'}</button>${editingQuestion?.origin === 'base' ? '<span class="hint inline-hint">Die Originalfrage bleibt als Grundlage erhalten; gespeichert wird eine aktualisierte Version.</span>' : ''}</div>
          </form>
        </article>

        <aside class="database-tools">
          <article class="tool-card">
            <div class="tool-icon">⇩</div><div><h3>Datenbank sichern</h3><p>Eigene Fragen, Bearbeitungen und Kategorien als JSON-Datei exportieren.</p></div>
            <button class="secondary-btn full-btn" data-action="export-database">Sicherung exportieren</button>
          </article>
          <article class="tool-card">
            <div class="tool-icon">⇧</div><div><h3>Sicherung importieren</h3><p>Eine zuvor exportierte Datenbank zusammenführen oder ersetzen.</p></div>
            <select id="importMode"><option value="merge">Mit Datenbestand zusammenführen</option><option value="replace">Eigene Datenbank ersetzen</option></select>
            <button class="secondary-btn full-btn" data-action="choose-import">JSON-Datei auswählen</button>
            <input id="databaseImport" type="file" accept="application/json,.json" hidden>
          </article>
          <article class="tool-card safety-card">
            <div class="tool-icon">i</div><div><h3>Wichtig zur Speicherung</h3><p>Die Daten liegen auf diesem Gerät in diesem Browser. Für Gerätewechsel oder als Schutz vor Datenverlust regelmäßig exportieren.</p></div>
          </article>
          ${archivedCount ? `<article class="tool-card"><div class="tool-icon">↺</div><div><h3>${archivedCount} ausgeblendete Frage(n)</h3><p>Ausgeblendete Fragen wieder in die aktive Datenbank aufnehmen.</p></div><button class="ghost-btn full-btn" data-action="restore-archived">Alle wiederherstellen</button></article>` : ''}
        </aside>
      </section>

      <section class="section-block manager-section">
        <div class="section-heading"><div><div class="eyebrow">Verwalten</div><h2>Aktueller Fragenbestand</h2><p>${allQuestions.length} aktive Fragen; Wiederholungen werden nicht entfernt.</p></div></div>
        <div class="manager-toolbar">
          <div class="search-field"><span>⌕</span><input id="managerSearch" type="search" placeholder="Frage suchen …" value="${esc(state.managerQuery)}"></div>
          <select id="managerCategory">${categoryOptions(state.managerCategory)}</select>
          <select id="managerOrigin"><option value="all" ${state.managerOrigin === 'all' ? 'selected' : ''}>Alle Quellen</option><option value="custom" ${state.managerOrigin === 'custom' ? 'selected' : ''}>Eigene Fragen</option><option value="edited" ${state.managerOrigin === 'edited' ? 'selected' : ''}>Bearbeitete Originalfragen</option><option value="base" ${state.managerOrigin === 'base' ? 'selected' : ''}>Unveränderter Grundbestand</option></select>
        </div>
        <div id="managerResults"></div>
      </section>
    `);
    updateManagerResults();
  }

  function updateManagerResults() {
    const element = document.getElementById('managerResults');
    if (!element) return;
    const query = state.managerQuery.trim().toLowerCase();
    const list = getAllQuestions().filter(question => {
      const originMatches = state.managerOrigin === 'all' ||
        (state.managerOrigin === 'custom' && question.origin === 'custom') ||
        (state.managerOrigin === 'edited' && question.origin === 'base' && Boolean(question.updatedAt)) ||
        (state.managerOrigin === 'base' && question.origin === 'base' && !question.updatedAt);
      return originMatches &&
        (state.managerCategory === 'all' || question.categoryId === state.managerCategory) &&
        (!query || question.question.toLowerCase().includes(query) || question.displayId.toLowerCase().includes(query));
    });

    element.innerHTML = `<div class="manager-count"><strong>${list.length}</strong> Fragen in der Auswahl</div>
      <div class="manager-list">${list.slice(0, 300).map(question => `<article class="manager-item">
        <div class="manager-question">
          <div class="manager-meta"><span>${esc(question.displayId)}</span><span>${esc(question.categoryName)}</span><span class="origin-badge ${question.origin}">${question.origin === 'custom' ? 'Eigene Frage' : question.updatedAt ? 'Bearbeitet' : 'Grundbestand'}</span></div>
          <h3>${esc(question.question)}</h3>
          <p>${question.answers.length} Antwortmöglichkeiten · ${correctIndexes(question).length} richtige Antwort(en)</p>
        </div>
        <div class="manager-actions">
          <button class="secondary-btn small" data-action="edit-question" data-uid="${esc(question.uid)}">Bearbeiten</button>
          <button class="ghost-btn small" data-action="archive-question" data-uid="${esc(question.uid)}">${question.origin === 'custom' ? 'Löschen' : 'Ausblenden'}</button>
        </div>
      </article>`).join('')}</div>
      ${list.length > 300 ? '<div class="hint list-limit">Aus Leistungsgründen werden die ersten 300 Treffer angezeigt. Nutze Suche oder Filter für eine genauere Auswahl.</div>' : ''}`;
  }

  function addAnswerEditor(answer = blankAnswer()) {
    const list = document.getElementById('answerEditorList');
    if (!list) return;
    const index = list.querySelectorAll('[data-answer-row]').length;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderAnswerRow(answer, index);
    list.appendChild(wrapper.firstElementChild);
    renumberAnswerEditors();
  }

  function renumberAnswerEditors() {
    document.querySelectorAll('#answerEditorList [data-answer-row]').forEach((row, index) => {
      const letter = row.querySelector('.answer-letter');
      if (letter) letter.textContent = String.fromCharCode(65 + index);
    });
  }

  function collectQuestionForm() {
    const categorySelect = document.getElementById('questionCategory');
    let categoryId = categorySelect.value;
    let categoryName = '';
    let newCategory = null;
    if (categoryId === '__new__') {
      categoryName = document.getElementById('newCategoryName').value.trim();
      if (!categoryName) throw new Error('Bitte einen Namen für die neue Kategorie eingeben.');
      categoryId = slugify(categoryName);
      newCategory = {id: categoryId, name: categoryName, createdAt: new Date().toISOString()};
    } else {
      const category = getCategories().find(item => item.id === categoryId);
      categoryName = category?.name || 'Eigene Fragen';
    }

    const questionText = document.getElementById('questionText').value.trim();
    if (!questionText) throw new Error('Bitte einen Fragetext eingeben.');

    const answers = [...document.querySelectorAll('#answerEditorList [data-answer-row]')].map(row => ({
      text: row.querySelector('[data-field="answer-text"]').value.trim(),
      correct: row.querySelector('[data-field="answer-correct"]').checked,
      comment: row.querySelector('[data-field="answer-comment"]').value.trim()
    })).filter(answer => answer.text);

    if (answers.length < 2) throw new Error('Bitte mindestens zwei Antwortmöglichkeiten eingeben.');
    if (!answers.some(answer => answer.correct)) throw new Error('Bitte mindestens eine Antwort als richtig markieren.');

    return {
      categoryId,
      categoryName,
      displayId: document.getElementById('questionDisplayId').value.trim() || nextDisplayId(categoryId, categoryName),
      question: questionText,
      questionComment: document.getElementById('questionComment').value.trim(),
      answers,
      newCategory
    };
  }

  function nextDisplayId(categoryId, categoryName) {
    const questions = getAllQuestions().filter(question => question.categoryId === categoryId);
    const testMatch = categoryId.match(/^test-(\d+)$/);
    if (testMatch) {
      const testNumber = Number(testMatch[1]);
      const numbers = questions.map(question => {
        const match = String(question.displayId).match(/^(\d+)\.(\d+)$/);
        return match && Number(match[1]) === testNumber ? Number(match[2]) : 0;
      });
      return `${testNumber}.${Math.max(0, ...numbers) + 1}`;
    }
    return `${categoryName} ${questions.length + 1}`;
  }

  function saveQuestionFromForm(event) {
    event.preventDefault();
    const message = document.getElementById('formMessage');
    try {
      const data = collectQuestionForm();
      const editingUid = document.getElementById('editingUid').value;
      const now = new Date().toISOString();
      if (data.newCategory) store.customCategories.push(data.newCategory);
      delete data.newCategory;

      if (editingUid) {
        const existing = getQuestionByUid(editingUid, true);
        if (!existing) throw new Error('Die zu bearbeitende Frage wurde nicht gefunden.');
        if (existing.origin === 'custom') {
          const index = store.customQuestions.findIndex(question => question.uid === editingUid);
          store.customQuestions[index] = {...store.customQuestions[index], ...data, updatedAt: now};
        } else {
          store.overrides[editingUid] = {...data, updatedAt: now};
        }
        toast('Frage wurde aktualisiert.');
      } else {
        const uid = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        store.customQuestions.push({
          ...data, uid, originalId: data.displayId, sourceSheet: 'Eigene Fragendatenbank',
          sourceRow: null, createdAt: now, updatedAt: now
        });
        toast('Neue Frage wurde zur Datenbank hinzugefügt.');
      }
      state.editingUid = null;
      touchDatabase();
      render();
    } catch (error) {
      message.hidden = false;
      message.textContent = error.message || 'Die Frage konnte nicht gespeichert werden.';
      message.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  }

  function editQuestion(uid) {
    state.editingUid = uid;
    state.view = 'database';
    render();
    setTimeout(() => document.getElementById('questionForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}), 50);
  }

  function archiveQuestion(uid) {
    const question = getQuestionByUid(uid);
    if (!question) return;
    if (question.origin === 'custom') {
      if (!confirm('Diese selbst angelegte Frage wirklich dauerhaft löschen?')) return;
      store.customQuestions = store.customQuestions.filter(item => item.uid !== uid);
      delete store.stats[uid];
      store.wrongIds = store.wrongIds.filter(id => id !== uid);
      toast('Eigene Frage wurde gelöscht.');
    } else {
      if (!confirm('Diese Originalfrage aus Lernmodus, Prüfung und Katalog ausblenden? Sie kann später wiederhergestellt werden.')) return;
      store.archivedIds = [...new Set([...(store.archivedIds || []), uid])];
      store.wrongIds = store.wrongIds.filter(id => id !== uid);
      toast('Originalfrage wurde ausgeblendet.');
    }
    if (state.editingUid === uid) state.editingUid = null;
    touchDatabase();
    render();
  }

  function restoreArchived() {
    if (!(store.archivedIds || []).length) return;
    if (!confirm('Alle ausgeblendeten Fragen wieder aktivieren?')) return;
    store.archivedIds = [];
    touchDatabase();
    render();
    toast('Ausgeblendete Fragen wurden wiederhergestellt.');
  }

  function exportDatabase() {
    const payload = {
      app: 'QMB Prüfungstrainer',
      schemaVersion: APP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      baseQuestionCount: BASE_QUESTIONS.length,
      database: {
        customCategories: store.customCategories || [],
        customQuestions: store.customQuestions || [],
        overrides: store.overrides || {},
        archivedIds: store.archivedIds || [],
        databaseUpdatedAt: store.databaseUpdatedAt
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `QMB_Lernplattform_Datenbank_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast('Datenbanksicherung wurde erstellt.');
  }

  function mergeById(existing, incoming, idField = 'id') {
    const map = new Map(existing.map(item => [item[idField], item]));
    incoming.forEach(item => { if (item?.[idField]) map.set(item[idField], item); });
    return [...map.values()];
  }

  async function importDatabase(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const database = payload.database || payload;
      if (!database || !Array.isArray(database.customQuestions) || typeof database.overrides !== 'object') {
        throw new Error('Die Datei ist keine gültige QMB-Lernplattform-Datensicherung.');
      }
      const mode = document.getElementById('importMode')?.value || 'merge';
      if (mode === 'replace') {
        if (!confirm('Die aktuell selbst angelegten Fragen, Bearbeitungen und Kategorien werden ersetzt. Fortfahren?')) return;
        store.customCategories = Array.isArray(database.customCategories) ? database.customCategories : [];
        store.customQuestions = database.customQuestions;
        store.overrides = database.overrides || {};
        store.archivedIds = Array.isArray(database.archivedIds) ? database.archivedIds : [];
      } else {
        store.customCategories = mergeById(store.customCategories || [], database.customCategories || [], 'id');
        store.customQuestions = mergeById(store.customQuestions || [], database.customQuestions || [], 'uid');
        store.overrides = {...(store.overrides || {}), ...(database.overrides || {})};
        store.archivedIds = [...new Set([...(store.archivedIds || []), ...(database.archivedIds || [])])];
      }
      state.editingUid = null;
      touchDatabase();
      render();
      toast('Datenbank wurde erfolgreich importiert.');
    } catch (error) {
      alert(error.message || 'Die Datenbank konnte nicht importiert werden.');
    }
  }

  function toast(message) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const element = document.createElement('div');
    element.className = 'toast';
    element.innerHTML = `<span>✓</span>${esc(message)}`;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 3000);
  }


  function deleteAllLocalData() {
    const accepted = confirm('Wirklich sämtliche lokal gespeicherten App-Daten löschen? Dazu gehören Lernstand, Prüfungshistorie, eigene Fragen, Kategorien und Bearbeitungen. Dieser Schritt kann nur über eine zuvor exportierte Sicherung rückgängig gemacht werden.');
    if (!accepted) return;
    localStorage.removeItem(STORE_KEY);
    store = {...defaultStore};
    state = {
      view: 'home',
      session: null,
      catalogQuery: '',
      catalogCategory: 'all',
      managerQuery: '',
      managerCategory: 'all',
      managerOrigin: 'all',
      editingUid: null,
    breakPrompt: null,
    game: null,
      pendingSession: null,
    openBookSource: null,
    openBookIndex: 0,
    openBookFeedback: null,
    openBookStartedAt: null
    };
    document.documentElement.dataset.theme = store.theme;
    render();
    toast('Alle lokalen App-Daten wurden gelöscht.');
  }

  function resetProgress() {
    if (!confirm('Lernstand, Fehlerliste und Prüfungshistorie wirklich löschen? Die Fragendatenbank bleibt erhalten.')) return;
    store.wrongIds = [];
    store.stats = {};
    store.history = [];
    store.attemptLog = [];
    store.sessionHistory = [];
    store.activeSession = null;
    store.learningPathProgress = {};
    store.openBookProgress = {};
    store.openBookHistory = [];
    store.learningPathLastModule = null;
    saveStore();
    render();
    toast('Lernstand wurde zurückgesetzt.');
  }

  document.addEventListener('submit', event => {
    if (event.target.id === 'openBookForm') { event.preventDefault(); checkOpenBookAnswer(document.getElementById('openBookAnswer')?.value || ''); return; }
    if (event.target.id === 'questionForm') saveQuestionFromForm(event);
  });

  document.addEventListener('change', event => {
    if (event.target.matches('[data-answer]')) toggleAnswer(Number(event.target.dataset.answer), event.target.checked);
    if (event.target.id === 'examCategory') {
      const pool = poolFor(event.target.value);
      const input = document.getElementById('examCount');
      input.max = pool.length;
      input.value = Math.min(45, pool.length);
    }
    if (event.target.id === 'catalogCategory') {
      state.catalogCategory = event.target.value;
      updateCatalogResults();
    }
    if (event.target.id === 'managerCategory') {
      state.managerCategory = event.target.value;
      updateManagerResults();
    }
    if (event.target.id === 'managerOrigin') {
      state.managerOrigin = event.target.value;
      updateManagerResults();
    }
    if (event.target.id === 'questionCategory') {
      const wrap = document.getElementById('newCategoryWrap');
      wrap?.classList.toggle('hidden', event.target.value !== '__new__');
    }
    if (event.target.id === 'breakGameEnabled') {
      store.breakGameEnabled = event.target.checked;
      saveStore();
      render();
      toast(store.breakGameEnabled ? 'Minispiel-Pause eingeschaltet.' : 'Minispiel-Pause ausgeschaltet.');
    }
    if (event.target.id === 'databaseImport') importDatabase(event.target.files?.[0]);
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'catalogSearch') {
      state.catalogQuery = event.target.value;
      updateCatalogResults();
    }
    if (event.target.id === 'managerSearch') {
      state.managerQuery = event.target.value;
      updateManagerResults();
    }
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'start-openbook') {
      state.openBookSource = button.dataset.source || 'iso';
      const module=OPEN_BOOK_MODULES[state.openBookSource];
      const firstUnsolved=module.questions.findIndex(q=>openBookQuestionStats(q.id).correct===0);
      state.openBookIndex=firstUnsolved>=0?firstUnsolved:0; state.openBookFeedback=null; state.openBookStartedAt=Date.now(); state.view='openBookQuestion'; render();
    } else if (action === 'openbook-home') {
      state.openBookFeedback=null; state.view='openBookHome'; render();
    } else if (action === 'next-openbook') {
      const module=OPEN_BOOK_MODULES[state.openBookSource]; state.openBookIndex=(state.openBookIndex+1)%module.questions.length; state.openBookFeedback=null; state.openBookStartedAt=Date.now(); render();
    } else if (action === 'document-search') {
      state.documentSearchSource = button.dataset.source || 'iso';
      state.view = 'documentSearch'; render();
    } else if (action === 'select-document-search') {
      state.documentSearchSource = button.dataset.source || 'iso';
      render();
    } else if (action === 'learning-path') {
      if (state.session && !state.session.endedAt) saveActiveSession();
      state.view = 'learningPath'; render();
    } else if (action === 'start-path-module') {
      const module = LEARNING_PATH_MODULES.find(m => m.id === button.dataset.module);
      if (!module) return;
      store.learningPathProgress[module.id] = {...(store.learningPathProgress[module.id]||{}), startedAt:(store.learningPathProgress[module.id]?.startedAt||new Date().toISOString()), lastAt:new Date().toISOString()};
      store.learningPathLastModule = module.id; saveStore();
      const pool = questionsForLearningModule(module);
      requestSessionStart('path', pool, {random:true, count:Math.min(12,pool.length), label:`Lernpfad · ${module.title}`, pathModuleId:module.id});
    } else if (action === 'open-path-docs') {
      document.querySelector('.path-documents')?.scrollIntoView({behavior:'smooth'});
    } else if (action === 'confirm-start') {
      const pending = state.pendingSession;
      if (!pending) { state.view = 'home'; render(); return; }
      const useBreaks = button.dataset.pause === 'yes';
      const duration = Number(document.querySelector('input[name="startBreakDuration"]:checked')?.value || 3);
      store.breakGameEnabled = useBreaks;
      store.breakDurationMinutes = duration;
      saveStore();
      startSession(pending.mode, pending.pool, {...pending.options, breakGameEnabled: useBreaks, breakDurationMinutes: duration});
    } else if (action === 'cancel-start') {
      state.pendingSession = null;
      state.view = 'home';
      render();
    } else if (action === 'test-break') {
      state.breakPrompt = {returnView: state.session ? 'session' : 'home', milestone: store.breakAnsweredTotal, moduleIndex: Number(store.breakRotationIndex || 0) % BREAK_MODULES.length};
      state.view = 'breakPrompt'; render();
    } else if (action === 'start-game') {
      startGameBreak(Number(button.dataset.minutes) || 2);
    } else if (action === 'skip-game') {
      state.breakPrompt = null; state.view = state.session ? 'session' : 'home'; render();
    } else if (action === 'disable-game-session') {
      if (state.session) state.session.breakGameEnabled = false;
      state.breakPrompt = null; state.view = state.session ? 'session' : 'home'; render();
      toast('Erholungspause für diese Lernrunde ausgeschaltet.');
    } else if (action === 'end-game') endGameBreak();
    else if (action === 'home') {
      if (state.session && !state.session.endedAt) saveActiveSession(); state.view = 'home'; state.editingUid = null; render();
    } else if (action === 'theme') {
      setTheme(store.theme === 'dark' ? 'light' : 'dark');
    } else if (action === 'install' && deferredInstall) {
      deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render();
    } else if (action === 'start-quick-exam') {
      requestSessionStart('exam', getAllQuestions(), {count: 45, threshold: store.passThreshold || 70, label: 'Prüfung · 45 Fragen'});
    } else if (action === 'start-learn') {
      const category = document.getElementById('learnCategory').value;
      const random = document.getElementById('learnOrder').value === 'random';
      const label = category === 'all' ? 'Lernmodus · alle Kategorien' : `Lernmodus · ${getCategories().find(item => item.id === category)?.name || category}`;
      requestSessionStart('learn', poolFor(category), {random, label});
    } else if (action === 'repeat-wrong') {
      requestSessionStart('review', currentWrongQuestions(), {random: false, label: 'Fehlerfragen'});
    } else if (action === 'start-exam') {
      const category = document.getElementById('examCategory').value;
      const pool = poolFor(category);
      const count = Math.max(1, Math.min(Number(document.getElementById('examCount').value) || 45, pool.length));
      const threshold = Math.max(1, Math.min(Number(document.getElementById('passThreshold').value) || 70, 100));
      const label = category === 'all' ? `Prüfung · ${count} Fragen` : `Prüfung · ${getCategories().find(item => item.id === category)?.name || category}`;
      requestSessionStart('exam', pool, {count, threshold, label});
    } else if (action === 'check') {
      checkLearning();
    } else if (action === 'next') {
      nextQuestion();
    } else if (action === 'prev') {
      prevQuestion();
    } else if (action === 'finish-exam') {
      finishExam();
    } else if (action === 'catalog') {
      if (state.session && !state.session.endedAt) saveActiveSession(); state.view = 'catalog'; render();
    } else if (action === 'database') {
      if (state.session && !state.session.endedAt) saveActiveSession();
      state.view = 'database'; render();
    } else if (action === 'statistics') {
      if (state.session && !state.session.endedAt) saveActiveSession();
      state.view = 'statistics'; render();
    } else if (action === 'info') {
      if (state.session && !state.session.endedAt) saveActiveSession(); state.view = 'info'; render();
    } else if (action === 'reset-progress') {
      resetProgress();
    } else if (action === 'delete-all-local-data') {
      deleteAllLocalData();
    } else if (action === 'repeat-result-wrong') {
      const wrong = state.session.results.filter(result => !result.correct).map(result => result.q);
      requestSessionStart('review', wrong, {random: false, label: 'Fehler aus letzter Prüfung'});
    } else if (action === 'new-exam') {
      state.view = 'home'; state.session = null; render();
      setTimeout(() => document.getElementById('examCategory')?.focus(), 0);
    } else if (action === 'add-answer') {
      addAnswerEditor();
    } else if (action === 'remove-answer') {
      const rows = document.querySelectorAll('#answerEditorList [data-answer-row]');
      if (rows.length <= 2) { toast('Mindestens zwei Antwortfelder müssen bestehen bleiben.'); return; }
      button.closest('[data-answer-row]')?.remove();
      renumberAnswerEditors();
    } else if (action === 'edit-question') {
      editQuestion(button.dataset.uid);
    } else if (action === 'archive-question') {
      archiveQuestion(button.dataset.uid);
    } else if (action === 'cancel-edit') {
      state.editingUid = null; render();
    } else if (action === 'restore-archived') {
      restoreArchived();
    } else if (action === 'export-database') {
      exportDatabase();
    } else if (action === 'choose-import') {
      document.getElementById('databaseImport')?.click();
    }
  });

  document.addEventListener('keydown', event => {
    if (state.view === 'game') {
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft') moveGame(-1);
      else if (event.key === 'ArrowRight') moveGame(1);
      else if (event.key === 'ArrowDown') stepGame();
      else if (event.key === 'ArrowUp') rotateGame();
      else if (event.key === ' ') dropGame();
      else if (event.key === 'Escape') endGameBreak();
      return;
    }
    if (event.key === 'Escape' && state.view !== 'home') {
      if (state.session && !state.session.endedAt) saveActiveSession(); state.view = 'home'; state.editingUid = null; render();
    }
  });

  window.addEventListener('beforeunload', () => { if (state.session && !state.session.endedAt) saveActiveSession(); });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
    const button = document.getElementById('installBtn');
    if (button) button.hidden = false;
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  render();
})();
