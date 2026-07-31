(() => {
  'use strict';

  const BASE_QUESTIONS = Array.isArray(window.QUESTION_DATA) ? window.QUESTION_DATA : [];
  const STORE_KEY = 'verkaeufertrainer-v1';
  const APP_SCHEMA_VERSION = 21;
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
    openBookHistory: [],
    openBookDifficulty: 'easy',
    openBookSavedAnswers: {},
    openBookHelpUsage: {},
    openBookReflections: {},
    pathHelpUsage: {},
    auditJourneyProgress: {},
    auditJourneyLastChapter: null,
    auditHelpUsage: {}
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
    openBookStartedAt: null,
    openBookHelpVisible: false,
    openBookDifficulty: 'easy'
  };



  const OPEN_BOOK_MODULES = {};

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
  function openBookDifficultyLabel(level) {
    return level === 'easy' ? 'Leicht' : level === 'normal' ? 'Normal' : 'Schwer';
  }
  function openBookUpperChapter(q) {
    const src = String(q.source || '');
    const m = src.match(/(?:Kapitel|Abschnitt)\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return `Oberkapitel ${m[1].split('.')[0]}`;
    return src.split(',')[0] || 'Themengebiet des Dokuments';
  }
  function openBookHelpText(q, level) {
    if (level === 'hard') return 'Im Schwierigkeitsgrad „Schwer“ ist keine Recherchehilfe vorgesehen.';
    if (level === 'normal') return `Suche im ${openBookUpperChapter(q)}. Die genaue Unterstelle musst du selbst bestimmen.`;
    return `Gezielte Orientierung: ${q.source}. Achte auf die dort vollständig aufgeführten Anforderungen und Bedingungen.`;
  }
  function renderOpenBookHome() {
    state.view = 'home';
    render();
  }
  function renderOpenBookQuestion() {
    state.view = 'home';
    render();
  }
  function checkOpenBookAnswer(value) {
    const q=currentOpenBookQuestion(); if(!q)return;
    const text=normalizeOpenBookAnswer(value);
    const matched=q.hints.filter(h=>text.includes(normalizeOpenBookAnswer(h))).length;
    const total=q.hints.length;
    const ratio=total?matched/total:0;
    const correct=matched>=q.min;
    const old=openBookQuestionStats(q.id);
    store.openBookSavedAnswers[q.id]=value;
    store.openBookProgress[q.id]={attempts:(old.attempts||0)+1,correct:(old.correct||0)+(correct?1:0),lastAt:new Date().toISOString(),source:state.openBookSource,bestRatio:Math.max(old.bestRatio||0,ratio),difficulty:state.openBookDifficulty};
    store.openBookHistory.unshift({id:q.id,source:state.openBookSource,correct,matched,total,ratio,difficulty:state.openBookDifficulty,helpUsed:store.openBookHelpUsage?.[q.id]||0,date:new Date().toISOString(),seconds:state.openBookStartedAt?Math.round((Date.now()-state.openBookStartedAt)/1000):0});
    store.openBookHistory=store.openBookHistory.slice(0,500); saveStore();
    state.openBookFeedback={correct,matched,total,ratio}; render();
  }

  const LEARNING_PATH_MODULES = [{"id":"kapitel-1","order":1,"title":"Warenbeschaffung und Sortimentspolitik","short":"Du beginnst im Markt und gestaltest ein Sortiment, das wirklich zum Kundenbedarf passt.","icon":"01","categoryId":"kapitel-1","goal":"Sortiment, Beschaffung, Bedienungsformen und Kundenbedarf sicher unterscheiden.","station":"Erster Rundgang durch Verkaufsraum und Lager","people":"Marktleiterin Mara Stein und Einkäufer Ben Hoffmann","arc":"Am ersten Arbeitstag erkennst du, dass ein volles Regal noch kein gutes Sortiment ist.","milestone":"Du erhältst Verantwortung für die erste Sortimentsentscheidung.","anchor":"Ein langes Regal mit einer auffälligen Lücke beim meistgesuchten Artikel."},{"id":"kapitel-2","order":2,"title":"Warenbestandssteuerung und Inventur","short":"Du vergleichst Soll- und Istbestände und suchst die Ursachen für Abweichungen.","icon":"02","categoryId":"kapitel-2","goal":"Bestände, Inventur, Differenzen sowie Unter- und Überbestände beurteilen.","station":"Frühmorgendliche Bestandsaufnahme","people":"Mara Stein und Lagerkollege Emir Kaya","arc":"Eine Bestandsliste passt nicht zum Regal. Du musst herausfinden, wo die Ware geblieben ist.","milestone":"Du leitest deine erste kontrollierte Bestandsprüfung.","anchor":"Zählliste in der Hand, leeres Fach im Regal und eine ungeklärte Differenz."},{"id":"kapitel-3","order":3,"title":"Warenbestandsveränderungen","short":"Du verfolgst jede Warenbewegung vom Eingang bis zum Verkauf, Schwund oder Verderb.","icon":"03","categoryId":"kapitel-3","goal":"Bestandsmehrungen, Bestandsminderungen und ihre Ursachen richtig zuordnen.","station":"Wareneingang, Verkaufsfläche und Abschriftenplatz","people":"Emir Kaya und Verkäuferin Sophie Neumann","arc":"Eine Lieferung kommt an, Ware wird verkauft und beschädigte Artikel müssen ausgebucht werden.","milestone":"Du kannst den Weg einer Ware vollständig nachvollziehen.","anchor":"Eine Kiste kommt hinein, ein Einkaufswagen fährt hinaus, beschädigte Ware liegt daneben."},{"id":"kapitel-4","order":4,"title":"Warenwirtschaftliche Prozesse und Buchführung","short":"Du verbindest Ware, Beleg, Rechnung und Buchung zu einem nachvollziehbaren Ablauf.","icon":"04","categoryId":"kapitel-4","goal":"Warenwirtschaftliche Abläufe und grundlegende Buchführungszusammenhänge verstehen.","station":"Büro hinter dem Verkaufsraum","people":"Mara Stein und Buchhalterin Jana Wolf","arc":"Eine Lieferung ist angekommen, doch ein Beleg fehlt. Du musst den Vorgang sauber rekonstruieren.","milestone":"Du stellst den ersten lückenlosen Waren- und Belegfluss her.","anchor":"Ware, Lieferschein, Rechnung und Kassenbon bilden eine geschlossene Kette."},{"id":"kapitel-5","order":5,"title":"Kosten- und Leistungsrechnung","short":"Du lernst, warum hoher Umsatz ohne Kostenkontrolle noch keinen Erfolg bedeutet.","icon":"05","categoryId":"kapitel-5","goal":"Kosten, Leistungen, Kostenarten und betriebliche Zusammenhänge sicher unterscheiden.","station":"Monatsauswertung im Marktleiterbüro","people":"Mara Stein und Controller Tobias Kern","arc":"Die Kasse war voll, trotzdem ist das Ergebnis schwächer als erwartet. Du suchst die Kostentreiber.","milestone":"Du präsentierst deine erste einfache Kostenanalyse.","anchor":"Eine volle Kasse steht vor einem Schatten aus Miete, Personal und Energie."},{"id":"kapitel-6","order":6,"title":"Deckungsbeitragsrechnung","short":"Du vergleichst Artikel nicht nur nach Absatz, sondern nach ihrem Beitrag zum Betriebserfolg.","icon":"06","categoryId":"kapitel-6","goal":"Deckungsbeiträge berechnen und für Sortimentsentscheidungen nutzen.","station":"Sortimentsbesprechung mit Verkaufszahlen","people":"Tobias Kern und Einkäufer Ben Hoffmann","arc":"Zwei Produkte verkaufen sich gut, aber nur eines trägt wirklich stark zur Deckung der Fixkosten bei.","milestone":"Du begründest eine Sortimentsentscheidung mit dem Deckungsbeitrag.","anchor":"Zwei Preisschilder, zwei Kostenstapel – übrig bleibt jeweils ein unterschiedlich großer Beitrag."},{"id":"kapitel-7","order":7,"title":"Kurzfristige Erfolgsrechnung und Lagerkennzahlen","short":"Du erkennst, welche Ware Kapital bindet und welche sich schnell und erfolgreich dreht.","icon":"07","categoryId":"kapitel-7","goal":"Kurzfristigen Erfolg, Lagerumschlag und Lagerdauer richtig beurteilen.","station":"Lageranalyse nach Quartalsende","people":"Emir Kaya und Tobias Kern","arc":"Einige Artikel laufen schnell, andere stehen wochenlang. Du untersuchst die Folgen für Ergebnis und Kapital.","milestone":"Du entwickelst einen Plan für langsame Lagerbestände.","anchor":"Ein schnell drehendes Regalrad neben einem staubigen Kartonstapel."},{"id":"kapitel-8","order":8,"title":"Wirtschaftlichkeit, Rentabilität und Produktivität","short":"Du setzt Ergebnis, Einsatz und Kapital ins richtige Verhältnis.","icon":"08","categoryId":"kapitel-8","goal":"Wirtschaftlichkeit, Rentabilität und Produktivität unterscheiden und berechnen.","station":"Vergleich zweier Marktbereiche","people":"Mara Stein und Tobias Kern","arc":"Zwei Teams arbeiten gleich lang, erzielen aber unterschiedliche Ergebnisse. Du klärst, welche Kennzahl was aussagt.","milestone":"Du bewertest Leistung nicht mehr nur nach Umsatz.","anchor":"Zwei gleich große Sanduhren, aber unterschiedlich volle Ergebniskörbe."},{"id":"kapitel-9","order":9,"title":"Limitrechnung im Einkauf","short":"Du rechnest vom geplanten Verkaufspreis zurück und bestimmst die tragbare Einkaufsgrenze.","icon":"09","categoryId":"kapitel-9","goal":"Einkaufslimits und Rückwärtskalkulation sicher anwenden.","station":"Preisverhandlung mit einem Lieferanten","people":"Ben Hoffmann und Lieferantin Frau Adler","arc":"Ein neues Produkt ist attraktiv, aber der Einkaufspreis darf die Kalkulationsgrenze nicht überschreiten.","milestone":"Du setzt erstmals ein begründetes Einkaufslimit.","anchor":"Auf dem Einkaufszettel verläuft eine rote Linie: Bis hierhin – nicht darüber."},{"id":"kapitel-10","order":10,"title":"Finanzierung","short":"Du planst, wie notwendige Investitionen bezahlt werden, ohne die Zahlungsfähigkeit zu gefährden.","icon":"10","categoryId":"kapitel-10","goal":"Finanzierungsarten, Kapitalbedarf und Liquidität beurteilen.","station":"Planung einer neuen Kühlanlage","people":"Mara Stein und Bankberaterin Frau Reuter","arc":"Die alte Kühlung muss ersetzt werden. Du vergleichst Eigenmittel, Kredit und weitere Finanzierungswege.","milestone":"Du legst einen tragfähigen Finanzierungsvorschlag vor.","anchor":"Eine neue Kühltheke steht zwischen Sparschwein und Kreditvertrag."},{"id":"kapitel-11","order":11,"title":"Umsatzsteuer und Vorsteuer","short":"Du trennst sauber, was der Markt beim Verkauf einnimmt und beim Einkauf abziehen kann.","icon":"11","categoryId":"kapitel-11","goal":"Umsatzsteuer, Vorsteuer und Zahllast korrekt einordnen und berechnen.","station":"Rechnungsprüfung im Büro","people":"Jana Wolf und Tobias Kern","arc":"Einkaufs- und Verkaufsrechnungen liegen nebeneinander. Du musst die steuerlichen Seiten richtig zuordnen.","milestone":"Du erklärst die Umsatzsteuerkette verständlich.","anchor":"Zwei Rechnungen zeigen in entgegengesetzte Richtungen: Einkauf und Verkauf."},{"id":"kapitel-12","order":12,"title":"Anlagegüter und Anschaffungskosten","short":"Du unterscheidest kurzfristige Ware von langfristig genutzten Betriebsmitteln.","icon":"12","categoryId":"kapitel-12","goal":"Anlagegüter und Anschaffungskosten vollständig und korrekt erfassen.","station":"Umbau des Kassenbereichs","people":"Mara Stein und Techniker David Scholz","arc":"Neue Kassen und Regale werden geliefert. Du klärst, welche Kosten zum Anlagegut gehören.","milestone":"Du stellst die vollständigen Anschaffungskosten zusammen.","anchor":"Ein Joghurt verlässt den Markt schnell, eine Kasse bleibt jahrelang stehen."},{"id":"kapitel-13","order":13,"title":"Handelsrecht und Unternehmensformen","short":"Du schaust hinter den Markt und verstehst Kaufmannseigenschaft, Firma und Rechtsform.","icon":"13","categoryId":"kapitel-13","goal":"Handelsrechtliche Grundlagen und Unternehmensformen sicher unterscheiden.","station":"Gespräch mit der Geschäftsführung","people":"Geschäftsführer Daniel Krüger und Mara Stein","arc":"Der Markt soll erweitert werden. Du prüfst, welche rechtlichen Strukturen und Folgen zu beachten sind.","milestone":"Du kannst die passende Unternehmensform sachlich vergleichen.","anchor":"Ein Ladenschild steht vor mehreren Türen mit unterschiedlichen Rechtsformen."},{"id":"kapitel-14","order":14,"title":"Vollmachten und Vertretung","short":"Du erkennst, wer welche Entscheidungen treffen, Bestellungen auslösen oder Verträge schließen darf.","icon":"14","categoryId":"kapitel-14","goal":"Vollmachten und Vertretungsbefugnisse korrekt abgrenzen.","station":"Vertretung der Marktleitung während einer Abwesenheit","people":"Mara Stein, Daniel Krüger und du als Schichtverantwortlicher","arc":"Mara ist nicht im Haus. Mehrere Entscheidungen warten, aber nicht jede darfst du allein treffen.","milestone":"Du handelst erstmals sicher innerhalb deiner Befugnisse.","anchor":"Ein Schlüsselbund trägt unterschiedlich große Schlüssel für unterschiedlich große Befugnisse."},{"id":"kapitel-15","order":15,"title":"Kundenberatung und Verkaufspsychologie","short":"Du lernst, Bedarf zu erkennen und Kunden ohne Druck zur passenden Lösung zu führen.","icon":"15","categoryId":"kapitel-15","goal":"Beratungsphasen, Bedarfsermittlung und Verkaufspsychologie anwenden.","station":"Beratung auf der Verkaufsfläche","people":"Verkäuferin Sophie Neumann und verschiedene Kundinnen und Kunden","arc":"Ein Kunde steht unsicher vor dem Regal. Du musst fragen, zuhören und passend empfehlen.","milestone":"Du führst ein vollständiges Beratungsgespräch selbstständig.","anchor":"Zwischen Kunde und Regal entsteht eine klare Brücke aus Fragen und Zuhören."},{"id":"kapitel-16","order":16,"title":"Kundenbeschwerden, Umtausch und Reklamation","short":"Du löst schwierige Kundensituationen ruhig, rechtlich sauber und serviceorientiert.","icon":"16","categoryId":"kapitel-16","goal":"Beschwerde, Reklamation, Gewährleistung, Umtausch und Kulanz unterscheiden.","station":"Servicepunkt an einem vollen Samstagnachmittag","people":"Sophie Neumann, Mara Stein und ein verärgerter Kunde","arc":"Ein Kunde verlangt sofort Geld zurück. Du klärst Anspruch, Ursache und angemessene Lösung.","milestone":"Du verwandelst eine Beschwerde in eine professionelle Lösung.","anchor":"Ein rotes Ausrufezeichen wird durch ruhiges Zuhören zu einem grünen Haken."},{"id":"kapitel-17","order":17,"title":"Zahlungsarten","short":"Du verstehst, wie unterschiedliche Zahlungswege funktionieren und welche Risiken sie tragen.","icon":"17","categoryId":"kapitel-17","goal":"Bar-, Karten-, Rechnungs- und digitale Zahlungen sicher beurteilen.","station":"Kassenbereich und Tagesabschluss","people":"Kassiererin Leonie Brandt und Jana Wolf","arc":"Mehrere Zahlungen laufen gleichzeitig. Du ordnest Verfahren, Belege, Risiken und Sicherheit richtig zu.","milestone":"Du führst einen fehlerfreien Tagesabschluss durch.","anchor":"Münzen, Karte, Smartphone und Rechnung treffen sich an einer Kasse."},{"id":"kapitel-18","order":18,"title":"Marketing und Marketingmix","short":"Du planst ein Angebot nicht nur als Werbung, sondern über Produkt, Preis, Kommunikation und Vertrieb.","icon":"18","categoryId":"kapitel-18","goal":"Marketingmix und Marketinginstrumente praxisnah anwenden.","station":"Planung einer regionalen Aktionswoche","people":"Marketingleiterin Nele Fischer und Mara Stein","arc":"Ein regionales Produkt soll bekannter werden. Du entwickelst den vollständigen Marketingmix.","milestone":"Du verantwortest deine erste kleine Marketingaktion.","anchor":"Vier Zahnräder greifen ineinander: Produkt, Preis, Kommunikation und Vertrieb."},{"id":"kapitel-19","order":19,"title":"Marketingstrategien und Nachhaltigkeit","short":"Du verbindest Positionierung, langfristige Kundenwirkung und glaubwürdige Nachhaltigkeit.","icon":"19","categoryId":"kapitel-19","goal":"Marketingstrategien und Nachhaltigkeitsmaßnahmen kritisch beurteilen.","station":"Strategierunde zur Zukunft des Marktes","people":"Nele Fischer, Daniel Krüger und ein regionaler Lieferant","arc":"Der Markt will nachhaltiger auftreten, darf aber keine leeren Versprechen machen.","milestone":"Du entwickelst eine glaubwürdige, langfristige Positionierung.","anchor":"Ein grünes Versprechen steht auf einem Fundament aus überprüfbaren Maßnahmen."},{"id":"kapitel-20","order":20,"title":"Marktforschung","short":"Du ersetzt Vermutungen durch Daten, Beobachtungen und systematische Befragungen.","icon":"20","categoryId":"kapitel-20","goal":"Methoden und Abläufe der Marktforschung richtig auswählen und auswerten.","station":"Untersuchung sinkender Kundenfrequenz","people":"Nele Fischer und ein kleines Befragungsteam","arc":"Weniger Kunden kommen am Nachmittag. Du untersuchst Ursachen statt vorschnell zu handeln.","milestone":"Du legst eine datengestützte Handlungsempfehlung vor.","anchor":"Eine Lupe liegt über Kundenwegen, Zahlen und Antworten."},{"id":"kapitel-21","order":21,"title":"Kundenbindung, Öffentlichkeitsarbeit und Standortmarketing","short":"Du machst den Markt zu einem verlässlichen Teil seines Umfelds und stärkst langfristige Beziehungen.","icon":"21","categoryId":"kapitel-21","goal":"Kundenbindung, Öffentlichkeitsarbeit und Standortmaßnahmen planen.","station":"Vorbereitung eines Stadtteilfests","people":"Nele Fischer, Stammkundin Frau Berger und örtliche Partner","arc":"Der Markt möchte nicht nur verkaufen, sondern im Stadtteil sichtbar und vertrauenswürdig bleiben.","milestone":"Du entwickelst ein vollständiges lokales Bindungskonzept.","anchor":"Viele Wege aus dem Stadtteil führen zu einem Markt mit offenen Türen."},{"id":"kapitel-22","order":22,"title":"Onlinehandel und Multi-Channel","short":"Du verbindest Laden, Website, Smartphone und Abholung zu einem einheitlichen Kundenerlebnis.","icon":"22","categoryId":"kapitel-22","goal":"Onlinehandel und Multi-Channel-Prozesse sicher beurteilen.","station":"Einführung eines Bestell- und Abholservices","people":"IT-Koordinatorin Kim Lorenz, Sophie Neumann und Mara Stein","arc":"Kunden wollen online bestellen und im Markt abholen. Du verbindest die Kanäle ohne Informationsbruch.","milestone":"Du begleitest den ersten erfolgreichen Multi-Channel-Auftrag.","anchor":"Smartphone, Lager und Ladentheke sind durch eine durchgehende Linie verbunden."},{"id":"kapitel-23","order":23,"title":"Unternehmensgründung und Businessplan","short":"Du bündelst alles Gelernte und planst einen eigenen kleinen Handelsbetrieb.","icon":"23","categoryId":"kapitel-23","goal":"Geschäftsidee, Markt, Kapital, Rentabilität, Liquidität und Businessplan zusammenführen.","station":"Abschlussprojekt: dein eigenes Marktkonzept","people":"Mara Stein, Daniel Krüger und du als angehender Unternehmer","arc":"Aus dem neuen Verkäufer ist ein unternehmerisch denkender Profi geworden. Nun entsteht dein eigener Plan.","milestone":"Du präsentierst einen tragfähigen Businessplan und schließt die Lernreise ab.","anchor":"Vom ersten Regal führt ein Weg bis zum eigenen Ladenschild."}];

  function questionsForLearningModule(module) {
    return getAllQuestions().filter(question => question.categoryId === module.categoryId);
  }

  function moduleStats(module) {
    const ids = new Set(questionsForLearningModule(module).map(q=>q.uid));
    const logs = (store.attemptLog||[]).filter(a=>ids.has(a.uid));
    const correct = logs.filter(a=>a.correct).length;
    const accuracy = logs.length ? Math.round(correct/logs.length*100) : 0;
    const progress = store.learningPathProgress?.[module.id] || {};
    let stage = 'Noch nicht begonnen';
    if (logs.length >= 50 && accuracy >= 85) stage = 'Sehr sicher geübt';
    else if (logs.length >= 30 && accuracy >= 75) stage = 'Stabil im Aufbau';
    else if (logs.length >= 10) stage = 'Im Aufbau';
    else if (logs.length || progress.startedAt) stage = 'Begonnen';
    return {attempts:logs.length, correct, accuracy, stage, started:!!progress.startedAt || logs.length > 0};
  }

  function learningCoachMessage(session) {
    if (!session || session.mode !== 'path') return '';
    const answered = Number(session.pathAnsweredTotal || 0);
    const wrong = Number(session.wrongInSession || 0);
    const untilBreak = Math.max(0, Number(session.breakNextAtInSession || 50) - Number(session.breakAnsweredInSession || 0));
    if (session.breakGameEnabled && untilBreak > 0 && untilBreak <= 3) return `Noch ${untilBreak} ${untilBreak === 1 ? 'Frage' : 'Fragen'} bis zur Erholungspause. Danach wird die Verkäufer-Lernreise an derselben Szene fortgesetzt.`;
    if (answered >= 4 && wrong >= Math.ceil(answered * .5)) return 'Die Etappe fordert dich gerade. Nutze die Szene nach der Antwort, um den Zusammenhang zu verstehen – nicht die Position der Lösung.';
    if (answered >= 5 && Number(session.correctInSession || 0) / answered >= .8) return 'Du handelst zunehmend sicher. Begründe die Entscheidung weiter wie ein verantwortlicher Verkäufer und nicht nur aus dem Gedächtnis.';
    return 'Zuerst entscheidest du selbst. Danach wird die fortlaufende Geschichte vom ersten Arbeitstag bis zum eigenen Marktkonzept weitererzählt.';
  }

  const CARAT_AUDIT_CHAPTERS = [];

  function questionsForAuditChapter(chapter) {
    return getAllQuestions().filter(q => Number(q.caratChapter) === Number(chapter.number));
  }

  function auditChapterStats(chapter) {
    const ids = new Set(questionsForAuditChapter(chapter).map(q => q.uid));
    const logs = (store.attemptLog || []).filter(a => ids.has(a.uid));
    const correct = logs.filter(a => a.correct).length;
    const accuracy = logs.length ? Math.round(correct / logs.length * 100) : 0;
    const progress = store.auditJourneyProgress?.[chapter.id] || {};
    return {attempts: logs.length, correct, accuracy, started: Boolean(progress.startedAt || logs.length), completed: Boolean(progress.completed)};
  }

  function auditCoachMessage(session) {
    const answered = Number(session.auditAnsweredTotal || 0);
    const untilBreak = Math.max(0, Number(session.breakNextAtInSession || 50) - Number(session.breakAnsweredInSession || 0));
    if (session.breakGameEnabled && untilBreak > 0 && untilBreak <= 3) return `Noch ${untilBreak} ${untilBreak === 1 ? 'Frage' : 'Fragen'} bis zur Erholungspause. Die Auditreise wird danach genau hier fortgesetzt.`;
    if (!answered) return 'Versuche zuerst die neutrale Originalfrage. Die CARAT-Hilfe übersetzt sie bei Bedarf in eine beobachtbare Auditsituation, ohne die Lösung zu nennen.';
    return 'Nach jeder Antwort wird die zusammenhängende CARAT-Geschichte fortgesetzt. Beobachtung, Bewertung und fachliche Quelle bleiben getrennt.';
  }

  function renderAuditJourney() {
    state.view = 'learningPath';
    render();
  }

  function activeSessionPositionText(session) {
    if (!session) return '';
    if (session.mode === 'path') {
      return `Verkäufer-Lernreise · <strong>${Number(session.pathAnsweredTotal || 0)}</strong> Szenen beantwortet · Geschichte, Antwortmischung und genauer Stand sind gespeichert.`;
    }
    if (session.mode === 'audit') {
      return `CARAT-Auditreise · Kapitel <strong>${session.auditChapterNumber || session.questions?.[0]?.caratChapter || '–'}</strong> · Frage <strong>${Math.min((session.index || 0) + 1, session.questions?.length || 0)}</strong> von <strong>${session.questions?.length || 0}</strong>. Geschichte, Hilfe und Antwortreihenfolge sind gespeichert.`;
    }
    return `Du warst bei Frage <strong>${Math.min((session.index || 0) + 1, session.questions?.length || 0)}</strong> von <strong>${session.questions?.length || 0}</strong>. Antworten, Reihenfolge und Zeitstand sind gespeichert.`;
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
    const saved = store.activeSession;
    if (!saved || !Array.isArray(saved.questions) || !saved.questions.length) return false;
    const restored = JSON.parse(JSON.stringify(saved));
    restored.index = Math.max(0, Math.min(Number(restored.index || 0), restored.questions.length - 1));
    restored.selections = restored.selections && typeof restored.selections === 'object' ? restored.selections : {};
    restored.checked = restored.checked && typeof restored.checked === 'object' ? restored.checked : {};
    restored.hints = restored.hints && typeof restored.hints === 'object' ? restored.hints : {};
    restored.caratHelpShown = restored.caratHelpShown && typeof restored.caratHelpShown === 'object' ? restored.caratHelpShown : {};
    restored.completedUids = Array.isArray(restored.completedUids) ? restored.completedUids : [];
    restored.currentQuestionStartedAt = Date.now();
    if (!Number.isFinite(Number(restored.breakAnsweredInSession))) restored.breakAnsweredInSession = restored.completedUids.length;
    if (!Number.isFinite(Number(restored.breakNextAtInSession)) || Number(restored.breakNextAtInSession) < 50) {
      restored.breakNextAtInSession = (Math.floor(Number(restored.breakAnsweredInSession || 0) / 50) + 1) * 50;
    }
    if (restored.mode === 'path') {
      restored.pathAnsweredTotal = Number(restored.pathAnsweredTotal || Object.keys(restored.checked).length || 0);
      restored.pathCycle = Number(restored.pathCycle || 1);
    }
    if (restored.mode === 'audit') {
      restored.auditAnsweredTotal = Number(restored.auditAnsweredTotal || Object.keys(restored.checked).length || 0);
      restored.auditChapterId = restored.auditChapterId || restored.questions?.[0]?.caratChapterId || null;
    }
    state.session = restored;
    state.breakPrompt = null;
    state.game = null;
    state.pendingSession = null;
    state.view = 'session';
    saveActiveSession();
    return true;
  }

  function clearActiveSession() {
    store.activeSession = null;
    saveStore();
  }

  function discardActiveSession() {
    clearInterval(timerHandle);
    if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
    state.session = null;
    state.breakPrompt = null;
    state.game = null;
    state.pendingSession = null;
    store.activeSession = null;
    saveStore();
    state.view = 'home';
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
        openBookHistory: Array.isArray(parsed.openBookHistory) ? parsed.openBookHistory : [],
        pathHelpUsage: parsed.pathHelpUsage && typeof parsed.pathHelpUsage === 'object' ? parsed.pathHelpUsage : {},
        auditJourneyProgress: parsed.auditJourneyProgress && typeof parsed.auditJourneyProgress === 'object' ? parsed.auditJourneyProgress : {},
        auditJourneyLastChapter: parsed.auditJourneyLastChapter || null,
        auditHelpUsage: parsed.auditHelpUsage && typeof parsed.auditHelpUsage === 'object' ? parsed.auditHelpUsage : {}
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

  function randomIndex(maxExclusive) {
    if (maxExclusive <= 1) return 0;
    if (globalThis.crypto?.getRandomValues) {
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      const value = new Uint32Array(1);
      do globalThis.crypto.getRandomValues(value); while (value[0] >= limit);
      return value[0] % maxExclusive;
    }
    return Math.floor(Math.random() * maxExclusive);
  }

  function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
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

  function sessionQuestionKey(question) {
    return question?.sessionUid || question?.uid || '';
  }

  function selectedForQuestion(question) {
    return state.session?.selections?.[sessionQuestionKey(question)] || [];
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
    const baseCategoryId = question.categoryId || `kapitel-${question.test}`;
    const baseCategoryName = question.categoryName || question.testName || `Kapitel ${question.test}`;
    return {
      ...question,
      ...override,
      answers: Array.isArray(override.answers) ? override.answers : question.answers,
      categoryId: override.categoryId || baseCategoryId,
      categoryName: override.categoryName || baseCategoryName,
      testName: override.categoryName || baseCategoryName,
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
    for (const question of getAllQuestions()) {
      if (!map.has(question.categoryId)) {
        map.set(question.categoryId, {
          id: question.categoryId,
          name: question.categoryName || `Kapitel ${question.test || ''}`.trim(),
          kind: question.origin === 'custom' ? 'custom' : 'base',
          order: Number(question.test || question.chapter || 1000)
        });
      }
    }
    for (const category of store.customCategories || []) {
      if (category?.id && category?.name && !map.has(category.id)) {
        map.set(category.id, {id: category.id, name: category.name, kind: 'custom', order: 1000});
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
            <div class="brand-mark"><span>V</span></div>
            <div class="brand-copy">
              <div class="brand-title">Verkäufertrainer</div>
              <div class="brand-sub">Lern- und Testplattform · 23 Kapitel</div>
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
          <span>${total} aktive Fragen · 23 Kapitel mit jeweils 40 Fragen</span>
          <span>Fragenbasis: Excel-Arbeitsmappe „Multiple Choice Kapitel 1 bis 23“</span>
          <span>Konzept & Umsetzung: Christian Nitzsche · technische Unterstützung durch KI</span>
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
    else if (state.view === 'auditJourney') renderAuditJourney();
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
          <div class="eyebrow"><span class="status-dot"></span> Verkäufertrainer</div>
          <h1>Verkaufen verstehen. Kaufmännisch rechnen. Sicher testen.</h1>
          <p class="lead">920 Multiple-Choice-Fragen aus 23 Kapiteln bilden die vollständige Lern- und Testgrundlage. Eine oder mehrere Antworten können richtig sein; die Antwortpositionen werden bei jedem Durchgang neu gemischt.</p>
          <div class="hero-actions">
            <button class="primary-btn large" data-action="learning-path">Verkäufer-Lernreise starten</button>
            <button class="secondary-btn large" data-action="start-quick-exam">Test mit 45 Fragen</button>
            <button class="secondary-btn large" data-action="database">Fragendatenbank pflegen</button>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="visual-orbit orbit-one"></div><div class="visual-orbit orbit-two"></div>
          <div class="visual-card main-visual-card"><div class="visual-icon">✓</div><strong>${questions.length}</strong><span>aktive Fragen</span></div>
          <div class="visual-chip chip-one">${getCategories().length} Kapitel</div>
          <div class="visual-chip chip-two">${customCount} eigene Fragen</div>
        </div>
      </section>

      ${store.activeSession ? `<section class="resume-session-card"><div><div class="eyebrow">Gespeicherter Durchgang</div><h2>${esc(store.activeSession.label || 'Lernrunde')}</h2><p>${activeSessionPositionText(store.activeSession)}</p></div><div class="actions"><button class="primary-btn" type="button" data-action="resume-session">Genau dort fortsetzen</button><button class="ghost-btn" type="button" data-action="discard-session">Durchgang verwerfen</button></div></section>` : ''}

      <section class="stats">
        <div class="stat"><div class="stat-icon">V</div><div><strong>${questions.length}</strong><span>Fragen insgesamt</span></div></div>
        <div class="stat"><div class="stat-icon">23</div><div><strong>${getCategories().length}</strong><span>Kapitel</span></div></div>
        <div class="stat"><div class="stat-icon">✎</div><div><strong>${editedCount}</strong><span>aktualisiert</span></div></div>
        <div class="stat"><div class="stat-icon">%</div><div><strong>${accuracy}%</strong><span>Trefferquote</span></div></div>
      </section>

      <section class="learning-path-feature seller-journey-feature">
        <div class="learning-path-feature-copy"><div class="eyebrow">Durchgehende Geschichte · 23 Etappen</div><h2>Vom ersten Arbeitstag bis zum eigenen Marktkonzept</h2><p>Jede der 920 Fragen wird zuerst neutral beantwortet. Danach folgt die passende Verkaufsszene mit Lösungseinordnung, Korrektur und Gedächtnisanker.</p><div class="path-source-row"><span>Warenwirtschaft</span><span>Rechnungswesen</span><span>Recht</span><span>Verkauf & Marketing</span></div></div><button class="primary-btn large" data-action="learning-path">Lernreise öffnen</button>
      </section>

      <section class="mode-grid">
        <article class="mode-card learn-card">
          <div class="mode-top"><div class="mode-icon">L</div><span class="mode-tag">Mit Sofortlösung</span></div>
          <h2>Lernmodus</h2><p>Lösungen direkt prüfen und falsch beantwortete Fragen automatisch sammeln.</p>
          <div class="form-grid"><div class="field"><label for="learnCategory">Kapitel</label><select id="learnCategory">${categoryOptions('all')}</select></div><div class="field"><label for="learnOrder">Reihenfolge</label><select id="learnOrder"><option value="sequential">Geordnet</option><option value="random">Zufällig</option></select></div></div>
          <div class="actions"><button class="primary-btn" data-action="start-learn">Lernen starten</button><button class="secondary-btn" data-action="repeat-wrong" ${wrongQuestions.length ? '' : 'disabled'}>Fehlerfragen (${wrongQuestions.length})</button></div>
        </article>
        <article class="mode-card exam-card">
          <div class="mode-top"><div class="mode-icon">T</div><span class="mode-tag">Mit Zeitmessung</span></div>
          <h2>Testmodus</h2><p>Zufällige Verkäuferfragen ohne Lösungshinweise. Die Auswertung erfolgt erst am Ende.</p>
          <div class="form-grid"><div class="field"><label for="examCategory">Kapitel</label><select id="examCategory">${categoryOptions('all')}</select></div><div class="field"><label for="examCount">Fragenanzahl</label><input id="examCount" type="number" min="1" max="${questions.length}" value="45"></div><div class="field"><label for="passThreshold">Bestehensgrenze</label><div class="input-suffix"><input id="passThreshold" type="number" min="1" max="100" value="${store.passThreshold || 70}"><span>%</span></div></div></div>
          <div class="actions"><button class="primary-btn" data-action="start-exam">Test starten</button></div>
          <div class="hint">Richtig ist eine Frage nur, wenn exakt alle richtigen und keine falsche Antwort markiert wurden.</div>
        </article>
        <article class="utility-card"><div class="utility-icon">⌕</div><div><h3>Fragenkatalog</h3><p>Alle 920 Fragen und Lösungen durchsuchen.</p></div><button class="round-btn" data-action="catalog">→</button></article>
        <article class="utility-card database-utility"><div class="utility-icon">▦</div><div><h3>Wachsende Datenbank</h3><p>Fragen ergänzen, bearbeiten, sichern und übertragen.</p></div><button class="round-btn" data-action="database">→</button></article>
        <article class="utility-card statistics-utility"><div class="utility-icon">▥</div><div><h3>Statistik</h3><p>Fortschritt, Kapitel und Fehler auswerten.</p></div><button class="round-btn" data-action="statistics">→</button></article>
      </section>

      <section class="break-setting-card professional-status-card"><div class="break-setting-copy"><div class="eyebrow">Bewusste Lernsteuerung</div><h2>Erholungspause nach jeweils 50 Fragen</h2><p>Vor jedem Lern- oder Testdurchgang entscheidest du, ob die wechselnden Pausen genutzt werden. Die Zählung beginnt bei jeder neuen Runde bei null.</p></div><div class="status-seal"><span>50</span><small>Fragen</small></div></section>

      <section class="transparency-strip"><div><strong>Fragenbasis: 23 Kapitel · 920 Verkäuferfragen · technische Umsetzung mit KI-Unterstützung</strong><p>Die App arbeitet lokal im Browser. Fragen, Antworten und Lernstände werden nicht an einen KI-Dienst übertragen.</p></div><button class="ghost-btn" type="button" data-action="info">Details ansehen</button></section>

      ${history.length ? `<section class="section-block"><div class="section-heading"><div><div class="eyebrow">Verlauf</div><h2>Letzte Tests</h2></div><button class="ghost-btn" data-action="reset-progress">Lernstand zurücksetzen</button></div><div class="history">${history.map(item => `<div class="history-row"><div class="history-symbol ${item.passed ? 'pass-bg' : 'fail-bg'}">${item.passed ? '✓' : '!'}</div><div class="history-main"><strong>${esc(item.label)}</strong><span>${new Date(item.date).toLocaleDateString('de-DE')} · ${fmtTime(item.seconds)}</span></div><span class="score ${item.passed ? 'pass' : 'fail'}">${item.percent}%</span></div>`).join('')}</div></section>` : ''}
    `);
  }

  function prepareQuestionsForSession(mode, pool, options = {}) {
    const selectedQuestions = mode === 'exam'
      ? shuffle(pool).slice(0, Math.min(options.count || 45, pool.length))
      : (options.random ? shuffle(pool) : [...pool]);
    const runId = options.runId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const cycle = Number(options.cycle || 1);

    // Für jeden Durchgang werden nur die Antwortpositionen neu gemischt.
    // Die Fragenreihenfolge im Lernpfad bleibt stabil, damit kein festes Zahlenmuster gelernt wird.
    // Im Lernpfad wird der vollständige Fragenpool verwendet – keine Begrenzung auf 12 Fragen.
    return selectedQuestions.map((question, index) => ({
      ...question,
      sessionUid: `${question.uid}::${runId}::${cycle}::${index}`,
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




  const VERIFIED_DOCUMENTS = {};

  function verifiedSourceNotes(question) {
    const raw = [];
    if (question?.questionComment) raw.push(question.questionComment);
    (question?.answers || []).forEach(answer => { if (answer.comment) raw.push(answer.comment); });
    const unique = [...new Set(raw.map(x => String(x).trim()).filter(Boolean))];
    return unique.filter(note => /(ISO|DIN|TÜV|Modul\s*[12]|Kapitel|Kap\.)/i.test(note));
  }

  function renderDocumentSearch() {
    state.view = 'home';
    render();
  }

  function renderLearningPath() {
    const moduleCards = LEARNING_PATH_MODULES.map(module => {
      const st = moduleStats(module);
      const pool = questionsForLearningModule(module);
      const activePath = store.activeSession?.mode === 'path' && store.activeSession?.pathModuleId === module.id;
      const status = activePath ? 'Lernreise pausiert' : st.stage;
      const cls = (st.started || activePath) ? 'active' : '';
      return `<article class="path-module seller-journey-card ${cls}">
        <div class="path-module-number">${module.icon}</div>
        <div class="path-module-main"><div class="path-module-head"><div><span class="path-status">Etappe ${module.order} · ${status}</span><h2>${esc(module.title)}</h2></div><strong>${st.attempts ? st.accuracy+'%' : '–'}</strong></div>
        <p class="journey-arc">${esc(module.arc)}</p>
        <div class="journey-location"><span>Ort</span><strong>${esc(module.station)}</strong></div>
        <div class="journey-people"><span>Begleitung</span><strong>${esc(module.people)}</strong></div>
        <div class="path-progress"><span style="width:${Math.min(100, st.attempts / Math.max(1, pool.length) * 100)}%"></span></div>
        <div class="path-meta"><span>${pool.length} Szenen</span><span>${st.attempts} Versuche</span><span>${st.correct} richtig</span></div>
        <details class="path-details"><summary>Etappenziel und Abschluss</summary><div><p>${esc(module.goal)}</p><p><strong>Meilenstein:</strong> ${esc(module.milestone)}</p><p><strong>Gedächtnisbild:</strong> ${esc(module.anchor)}</p></div></details>
        <div class="actions"><button class="primary-btn" data-action="${activePath ? 'resume-session' : 'start-path-module'}" data-module="${module.id}">${activePath ? 'Genau hier weitererzählen' : st.started ? 'Etappe neu beginnen' : 'Etappe beginnen'}</button></div></div>
      </article>`;
    }).join('');
    const totalPathAnswers = LEARNING_PATH_MODULES.reduce((sum,m)=>sum+moduleStats(m).attempts,0);
    app.innerHTML=layout(`<div class="path-page seller-journey-page">
      <section class="path-hero seller-journey-hero"><div><div class="eyebrow">23 Etappen · 920 Verkaufsszenen</div><h1>Verkäufer-Lernreise</h1><p class="lead">Du beginnst als neuer Verkäufer in einem deutschen Lebensmittelmarkt. Mit jeder Etappe wächst deine Verantwortung – vom ersten Regal bis zum eigenen tragfähigen Marktkonzept.</p><div class="journey-principle"><strong>Frage zuerst – Geschichte danach.</strong><span>Die Hilfe gibt nur eine Denkrichtung. Die Lösung erscheint erst nach deiner Entscheidung.</span></div></div><div class="path-overview"><strong>${totalPathAnswers}</strong><span>beantwortete Szenen</span><div class="path-progress large"><span style="width:${Math.min(100,totalPathAnswers/9.2)}%"></span></div><small>Fortschritt und genaue Szene werden lokal auf diesem Gerät gespeichert.</small></div></section>
      <section class="journey-timeline-intro"><strong>Deine Entwicklung</strong><span>Verkäufer → Schichtverantwortung → kaufmännisches Denken → Marketing → eigenes Geschäft</span></section>
      <section class="path-modules">${moduleCards}</section>
    </div>`);
  }

  function renderStartSetup() {
    const pending = state.pendingSession;
    if (!pending) { state.view = 'home'; render(); return; }
    const modeName = pending.mode === 'exam' ? 'Test' : pending.mode === 'review' ? 'Fehlertraining' : pending.mode === 'path' ? 'Verkäufer-Lernreise' : 'Lernrunde';
    app.innerHTML = layout(`<section class="start-setup-shell">
      <div class="start-setup-badge">Vor dem Start</div><h1>${modeName} vorbereiten</h1>
      <p class="lead">Möchtest du nach jeweils 50 beantworteten Fragen eine wechselnde Erholungspause nutzen?</p>
      <div class="start-choice-grid"><button class="start-choice positive" data-action="confirm-start" data-pause="yes"><span class="start-choice-icon">✓</span><strong>Ja, Erholungspausen nutzen</strong><small>Atemwelle, Fernblick und Lockerung wechseln automatisch.</small></button><button class="start-choice neutral" data-action="confirm-start" data-pause="no"><span class="start-choice-icon">→</span><strong>Nein, direkt starten</strong><small>Die Runde läuft ohne automatische Unterbrechung.</small></button></div>
      <div class="duration-panel"><label for="startBreakDuration">Pausendauer bei Auswahl „Ja“</label><div class="duration-options">${[2,3,4,5].map(min => `<label><input type="radio" name="startBreakDuration" value="${min}" ${Number(store.breakDurationMinutes || 3) === min ? 'checked' : ''}><span>${min} Min.</span></label>`).join('')}</div></div>
      <div class="data-foundation-note"><strong>Fragenbasis:</strong> 920 Verkäuferfragen aus 23 Kapiteln. Im Lernreisemodus besitzt jede Frage zusätzlich eine Verkaufsszene, eine lösungsfreie Hilfe und einen Gedächtnisanker. Fragen und Lösungsschlüssel bleiben unverändert; nur die Antwortpositionen werden neu gemischt.</div>
      <button class="ghost-btn" data-action="cancel-start">Zurück</button>
    </section>`);
  }

  function startSession(mode, pool, options = {}) {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const questions = prepareQuestionsForSession(mode, pool, {...options, runId, cycle: 1});
    state.session = {
      mode,
      questions,
      index: 0,
      selections: {},
      checked: {},
      hints: {},
      caratHelpShown: {},
      startedAt: Date.now(),
      endedAt: null,
      threshold: options.threshold || store.passThreshold || 70,
      label: options.label || 'Lernmodus',
      pathModuleId: options.pathModuleId || null,
      auditChapterId: options.auditChapterId || null,
      auditChapterNumber: options.auditChapterNumber || null,
      breakGameEnabled: Boolean(options.breakGameEnabled),
      breakDurationMinutes: Number(options.breakDurationMinutes || store.breakDurationMinutes || 3),
      breakAnsweredInSession: 0,
      breakNextAtInSession: 50,
      completedUids: [],
      sessionRunId: runId,
      pathPoolUids: mode === 'path' ? pool.map(question => question.uid) : [],
      pathCycle: mode === 'path' ? 1 : 0,
      pathAnsweredTotal: 0,
      auditAnsweredTotal: 0,
      currentQuestionStartedAt: Date.now(),
      correctInSession: 0,
      wrongInSession: 0
    };
    state.pendingSession = null;
    state.view = 'session';
    saveActiveSession();
    render();
  }

  function speechAvailable() {
    return Boolean(globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance);
  }

  function speakInstruction(text) {
    if (!speechAvailable() || !text) return false;
    globalThis.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'de-DE';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    globalThis.speechSynthesis.speak(utterance);
    return true;
  }

  function currentRestInstruction() {
    const game = state.game;
    if (!game) return '';
    if (game.module.id === 'distance') return DISTANCE_CUES[Math.max(0, game.cueIndex) % DISTANCE_CUES.length] || DISTANCE_CUES[0];
    if (game.module.id === 'move') return MOVE_CUES[Math.max(0, game.cueIndex) % MOVE_CUES.length] || MOVE_CUES[0];
    return 'Atme bequem ein, wenn der Kreis größer wird, und etwas länger aus, wenn er kleiner wird.';
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
    const key = sessionQuestionKey(question);
    if (session.completedUids.includes(key)) return false;
    session.completedUids.push(key);
    session.breakAnsweredInSession = Number(session.breakAnsweredInSession || 0) + 1;
    store.breakAnsweredTotal = Number(store.breakAnsweredTotal || 0) + 1;
    if (!Number.isFinite(Number(session.breakNextAtInSession)) || Number(session.breakNextAtInSession) < 50) session.breakNextAtInSession = 50;
    const reached = Number(session.breakAnsweredInSession) >= Number(session.breakNextAtInSession);
    saveStore();
    if (!reached) return false;
    const moduleIndex = Number(store.breakRotationIndex || 0) % BREAK_MODULES.length;
    state.breakPrompt = {
      returnView: 'session',
      milestone: session.breakNextAtInSession,
      moduleIndex
    };
    session.breakNextAtInSession += 50;
    store.breakRotationIndex = (moduleIndex + 1) % BREAK_MODULES.length;
    saveActiveSession();
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
      <p>Die Pausen wechseln automatisch. Es gibt keine Punkte, keine Bestenliste und keine zusätzliche Testaufgabe.</p>
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
      if ((game.module.id === 'move' || game.module.id === 'distance') && cueIndex > 0) {
        speakInstruction(currentRestInstruction());
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
    window.setTimeout(() => speakInstruction(currentRestInstruction()), 250);
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
        <p class="rest-small">Lege das Gerät ab und löse den Blick vom Bildschirm. Die nächste Anweisung wird automatisch vorgelesen.</p>
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
      <div class="actions centered-actions">${speechAvailable() ? '<button class="primary-btn" data-action="speak-break">🔊 Anweisung noch einmal vorlesen</button>' : '<span class="speech-unavailable">Sprachausgabe ist in diesem Browser nicht verfügbar.</span>'}<button class="secondary-btn" data-action="end-game">Pause beenden und weiterlernen</button></div>
    </section>`);
    timerHandle = setInterval(updateRestTimer, 1000);
    updateRestTimer();
  }

  function endGameBreak() {
    clearInterval(timerHandle);
    if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
    state.game = null;
    state.breakPrompt = null;
    state.view = state.session ? 'session' : 'home';
    render();
    toast('Erholungspause beendet – weiter geht’s.');
  }

  function renderSession() {
    const session = state.session;
    const question = session.questions[session.index];
    const questionKey = sessionQuestionKey(question);
    const selected = selectedForQuestion(question);
    const checked = Boolean(session.checked[questionKey]);
    const correct = correctIndexes(question);
    const isRight = sameSet(selected, correct);
    const breakBase = Math.max(0, Number(session.breakNextAtInSession || 50) - 50);
    const percent = session.mode === 'path'
      ? Math.max(0, Math.min(100, ((Number(session.breakAnsweredInSession || 0) - breakBase) / 50) * 100))
      : Math.round((session.index + 1) / session.questions.length * 100);
    const pathQuestionNumber = Math.max(1, Number(session.pathAnsweredTotal || 0) + (checked ? 0 : 1));
    const untilBreak = Math.max(0, Number(session.breakNextAtInSession || 50) - Number(session.breakAnsweredInSession || 0));
    const hintVisible = Boolean(session.hints?.[questionKey]);
    const caratHelpVisible = Boolean(session.caratHelpShown?.[questionKey]);
    const journeyModule = session.mode === 'path' ? LEARNING_PATH_MODULES.find(item => item.id === session.pathModuleId) : null;

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
        ${checked && answer.comment ? `<span class="answer-explanation"><strong>${answer.correct ? 'Warum richtig:' : 'Warum nicht:'}</strong> ${esc(answer.comment)}</span>` : ''}
      </label>`;
    }).join('');

    let feedback = '';
    if (checked) {
      feedback = `<div class="feedback ${isRight ? 'ok' : 'bad'}" role="status" aria-live="assertive">
        <div class="feedback-icon" aria-hidden="true">${isRight ? '✓' : '✕'}</div>
        <div><h3>${isRight ? 'RICHTIG' : 'FALSCH'}</h3>
        <p>${isRight ? 'Deine Auswahl stimmt vollständig mit dem hinterlegten Lösungsschlüssel überein.' : 'Deine Auswahl ist nicht vollständig korrekt. Grün kennzeichnet richtige Lösungen; Rot kennzeichnet falsch ausgewählte Antworten.'}</p>
        ${question.questionComment ? `<div class="solution-explanation"><strong>Erklärung:</strong><p>${esc(question.questionComment)}</p></div>` : ''}
        </div>
      </div>`;
    }

    const isExam = session.mode === 'exam';
    app.innerHTML = layout(`<div class="session-wrap">
      <div class="session-head">
        <div class="session-meta">
          <span class="pill strong-pill">${esc(session.label)}</span>
          <span class="pill">${esc(question.categoryName || question.testName)}</span>
          <span class="pill">${session.mode === 'path' ? `Lernreise · Szene ${esc(question.sellerSceneId || pathQuestionNumber)}` : session.mode === 'audit' ? `CARAT Tag ${question.caratChapter} · ${session.index + 1} / ${session.questions.length}` : `${session.index + 1} / ${session.questions.length}`}</span>
          ${session.mode === 'path' && session.breakGameEnabled ? `<span class="pill">${untilBreak} bis Pause</span>` : ''}
        </div>
        ${isExam ? '<div class="timer" id="timer">0:00</div>' : ''}
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
      <article class="question-card">
        <div class="question-label-row"><span class="question-id">Frage ${esc(question.displayId)}</span><span class="question-origin">${question.origin === 'custom' ? 'Eigene Datenbank' : 'Originaler Fragenbestand'}</span></div>
        <h2 class="question-text">${esc(question.question)}</h2>
        <div class="instruction">Eine oder mehrere Antworten können richtig sein.</div>
        ${session.mode === 'path' && journeyModule ? `<section class="journey-context-strip"><div><span>Etappe ${journeyModule.order}</span><strong>${esc(journeyModule.title)}</strong></div><div><span>Aktueller Ort</span><strong>${esc(question.sellerStation || journeyModule.station)}</strong></div><div><span>Entwicklung</span><strong>${esc(journeyModule.milestone)}</strong></div></section>` : ''}
        ${session.mode === 'path' ? `<aside class="learning-coach seller-coach"><span>Verkaufsbegleiter</span><p>${esc(learningCoachMessage(session))}</p></aside>` : ''}
        ${session.mode === 'audit' ? `<aside class="learning-coach audit-coach"><span>Auditorenbegleiter</span><p>${esc(auditCoachMessage(session))}</p></aside>` : ''}
        ${session.mode === 'audit' && question.caratHelp && !checked ? `<div class="carat-question-help">${caratHelpVisible ? `<div><div class="carat-story-kicker">Hilfe · Auditszene ohne Lösung</div><p>${esc(question.caratHelp)}</p></div>` : '<p>Die neutrale Originalfrage bleibt unverändert. Öffne die CARAT-Szene nur, wenn du die abstrakte Formulierung in einer betrieblichen Beobachtung sehen möchtest.</p>'}<button class="secondary-btn" data-action="show-carat-help" ${caratHelpVisible ? 'disabled' : ''}>${caratHelpVisible ? 'CARAT-Szene geöffnet' : 'Im CARAT-Audit verstehen'}</button></div>` : ''}
        ${session.mode === 'path' && (question.sellerHelp || question.pathHint) && !checked ? `<div class="path-question-help seller-question-help">${hintVisible ? `<div><strong>Hilfe ohne Lösung:</strong><p>${esc(question.sellerHelp || question.pathHint)}</p></div>` : '<p>Öffne eine Denkhilfe zur Verkaufssituation. Sie strukturiert die Aufgabe, nennt aber keine richtige Antwort.</p>'}<button class="secondary-btn" data-action="show-path-hint" ${hintVisible ? 'disabled' : ''}>${hintVisible ? 'Denkhilfe geöffnet' : 'Denkhilfe öffnen'}</button></div>` : ''}
        <div class="answers">${answers}</div>
        ${feedback}
        ${session.mode === 'path' && checked ? `<section class="seller-story-resolution ${isRight ? 'story-right' : 'story-correction'}"><div class="seller-story-kicker">Verkäufer-Lernreise · Etappe ${question.sellerChapter || question.chapter} · Szene ${esc(question.sellerSceneId || question.displayId)}</div><h3>${isRight ? 'Deine Entscheidung trägt die Geschichte weiter' : 'Die Verkaufsszene korrigiert den Denkweg'}</h3><p>${esc(question.sellerStory || '')}</p>${!isRight ? '<p class="seller-correction-rule"><strong>Korrektur:</strong> Vergleiche deine Auswahl nacheinander mit den grün markierten Lösungen. Entscheidend ist der fachliche Zusammenhang – nicht die Position der Antwort.</p>' : ''}<div class="seller-memory-anchor"><strong>Gedächtnisanker:</strong> ${esc(question.sellerAnchor || '')}</div><div class="seller-next-milestone"><strong>Dein Weg:</strong> ${esc(question.sellerMilestone || journeyModule?.milestone || '')}</div></section>` : ''}
      </article>
      <div class="session-actions">
        <button class="secondary-btn" data-action="prev" ${session.index === 0 ? 'disabled' : ''}>← Zurück</button>
        <div class="spacer"></div>
        ${!isExam && !checked ? '<button class="primary-btn" data-action="check">Antwort prüfen</button>' : ''}
        ${!isExam && checked ? `<button class="primary-btn" data-action="next">${session.mode === 'path' ? 'Nächste Szene →' : session.mode === 'audit' ? (session.index === session.questions.length - 1 ? 'Auditkapitel abschließen' : 'Audit fortsetzen →') : session.index === session.questions.length - 1 ? 'Lernrunde beenden' : 'Nächste Frage →'}</button>` : ''}
        ${(session.mode === 'path' || session.mode === 'audit') ? `<button class="ghost-btn" data-action="pause-path">${session.mode === 'audit' ? 'Auditreise pausieren' : 'Lernreise pausieren'}</button>` : ''}
        ${isExam ? `<button class="secondary-btn" data-action="next" ${session.index === session.questions.length - 1 ? 'disabled' : ''}>Weiter →</button><button class="danger-btn" data-action="finish-exam">Test abschließen</button>` : ''}
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
    const key = sessionQuestionKey(question);
    if (session.checked[key]) return;
    const selected = new Set(session.selections[key] || []);
    checked ? selected.add(index) : selected.delete(index);
    session.selections[key] = [...selected];
    saveActiveSession();
  }

  function recordAttempt(question, correct) {
    const session = state.session;
    const selected = session?.selections?.[sessionQuestionKey(question)] || [];
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
      if (session.mode === 'path' && session.pathModuleId) {
        session.pathAnsweredTotal = Number(session.pathAnsweredTotal || 0) + 1;
        const progress = store.learningPathProgress[session.pathModuleId] || {};
        const attempts = Number(progress.attempts || 0) + 1;
        const correctAnswers = Number(progress.correct || 0) + (correct ? 1 : 0);
        store.learningPathProgress[session.pathModuleId] = {
          ...progress,
          startedAt: progress.startedAt || new Date().toISOString(),
          lastAt: new Date().toISOString(),
          attempts,
          correct: correctAnswers
        };
      }
    }
    saveStore();
  }

  function checkLearning() {
    const session = state.session;
    const question = session.questions[session.index];
    const key = sessionQuestionKey(question);
    if (session.checked[key]) return;
    session.checked[key] = true;
    recordAttempt(question, sameSet(selectedForQuestion(question), correctIndexes(question)));
    saveActiveSession();
    if (registerAnsweredQuestion(question)) return;
    render();
  }

  function continueLearningPath(session) {
    const module = LEARNING_PATH_MODULES.find(item => item.id === session.pathModuleId);
    const pool = module
      ? questionsForLearningModule(module)
      : (session.pathPoolUids || []).map(uid => getQuestionByUid(uid)).filter(Boolean);
    if (!pool.length) {
      toast('Für diesen Lernpfad sind keine weiteren Fragen verfügbar.');
      return;
    }
    const nextCycle = Number(session.pathCycle || 1) + 1;
    const nextQuestions = prepareQuestionsForSession('path', pool, {
      random: false,
      runId: session.sessionRunId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      cycle: nextCycle
    });
    session.questions = nextQuestions;
    session.index = 0;
    session.selections = {};
    session.checked = {};
    session.hints = {};
    session.completedUids = [];
    session.pathCycle = nextCycle;
    session.currentQuestionStartedAt = Date.now();
    saveActiveSession();
    render();
    toast('Der Lernpfad läuft ohne Unterbrechung mit neu gemischten Antworten weiter.');
  }

  function nextQuestion() {
    const session = state.session;
    const current = session.questions[session.index];
    const currentKey = sessionQuestionKey(current);
    if (session.mode === 'exam' && (session.selections[currentKey] || []).length && registerAnsweredQuestion(current)) return;
    if (session.index >= session.questions.length - 1) {
      if (session.mode === 'exam') return;
      if (session.mode === 'path') {
        continueLearningPath(session);
        return;
      }
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
    if (session?.mode === 'audit' && session.auditChapterId) {
      const answeredNow = Object.keys(session.checked || {}).length;
      const oldProgress = store.auditJourneyProgress[session.auditChapterId] || {};
      store.auditJourneyProgress[session.auditChapterId] = {...oldProgress, startedAt: oldProgress.startedAt || new Date().toISOString(), lastAt: new Date().toISOString(), completed: answeredNow >= session.questions.length};
      store.auditJourneyLastChapter = session.auditChapterId;
    }
    if (session?.mode === 'path' && session.pathModuleId) {
      const answeredNow = Object.keys(session.checked || {}).length;
      const ratio = answeredNow ? Number(session.correctInSession || 0) / answeredNow : 0;
      const oldProgress = store.learningPathProgress[session.pathModuleId] || {};
      store.learningPathProgress[session.pathModuleId] = {
        ...oldProgress,
        startedAt: oldProgress.startedAt || new Date().toISOString(),
        lastAt: new Date().toISOString(),
        completed: oldProgress.completed || (answeredNow >= 6 && ratio >= .7)
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
    const unanswered = session.questions.filter(question => (session.selections[sessionQuestionKey(question)] || []).length === 0).length;
    if (unanswered && !confirm(`${unanswered} Frage(n) sind noch unbeantwortet. Test trotzdem abschließen?`)) return;
    session.questions.forEach(question => {
      const key = sessionQuestionKey(question);
      if ((session.selections[key] || []).length && !session.completedUids.includes(key)) {
        session.completedUids.push(key);
        session.breakAnsweredInSession = Number(session.breakAnsweredInSession || 0) + 1;
        store.breakAnsweredTotal = Number(store.breakAnsweredTotal || 0) + 1;
      }
    });
    saveStore();
    session.endedAt = Date.now();
    session.results = session.questions.map(question => ({
      q: question,
      selected: session.selections[sessionQuestionKey(question)] || [],
      correct: sameSet(session.selections[sessionQuestionKey(question)] || [], correctIndexes(question))
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
        <div class="eyebrow">Test beendet</div>
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
          <button class="secondary-btn" data-action="new-exam">Neuer Test</button>
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
    const fields = [...fieldMap.values()].sort((a,b) => {
      const aPct = a.attempts ? a.correct / a.attempts : 1;
      const bPct = b.attempts ? b.correct / b.attempts : 1;
      return (aPct - bPct) || ((b.attempts-b.correct) - (a.attempts-a.correct)) || a.name.localeCompare(b.name, 'de', {numeric:true});
    });
    const fieldRows = fields.map(row => {
      const pct = row.attempts ? Math.round(row.correct / row.attempts * 100) : 0;
      const avg = row.attempts ? Math.round(row.seconds / row.attempts) : 0;
      const tendency = `${row.over}× zu viele · ${row.under}× zu wenige · ${row.exact}× gleiche Anzahl`;
      return `<tr><td><strong>${esc(row.name)}</strong></td><td>${row.attempts}</td><td>${pct}%</td><td>${row.attempts-row.correct}</td><td><strong>${row.over}</strong></td><td><strong>${row.under}</strong></td><td>${row.exact}</td><td><span class="tendency-detail">${esc(tendency)}</span></td><td>${fmtTime(avg)}</td></tr>`;
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
      ${active ? `<section class="current-session-stat"><div><div class="eyebrow">Aktueller Durchgang</div><h2>${esc(active.label || 'Lernrunde')}</h2><p>${active.mode === 'path' ? `Fortlaufend · ${Number(active.pathAnsweredTotal || 0)} beantwortet` : `Position ${Math.min((active.index||0)+1, active.questions?.length||0)} von ${active.questions?.length||0}`} · ${Number(active.correctInSession||0)} richtig · ${Number(active.wrongInSession||0)} falsch</p></div><button class="primary-btn" data-action="resume-session">Fortsetzen</button></section>` : '<section class="current-session-stat empty-current"><strong>Aktuell ist kein unterbrochener Durchgang gespeichert.</strong></section>'}
      <section class="stats statistics-summary"><div class="stat"><div class="stat-icon">Σ</div><div><strong>${total}</strong><span>Antworten langfristig</span></div></div><div class="stat"><div class="stat-icon">%</div><div><strong>${accuracy}%</strong><span>Gesamttrefferquote</span></div></div><div class="stat"><div class="stat-icon">↻</div><div><strong>${sessions.length}</strong><span>gespeicherte Durchläufe</span></div></div><div class="stat"><div class="stat-icon">◷</div><div><strong>${fmtTime(totalSeconds)}</strong><span>erfasste Lernzeit</span></div></div></section>
      <section class="section-block"><div class="section-heading"><div><div class="eyebrow">Auswertung nach Lernfeld</div><h2>Fehler und Antwortanzahl – exakt gezählt</h2><p class="section-note">Die schwierigsten Lernfelder stehen zuerst. „Gleiche Anzahl“ bedeutet nur, dass gleich viele Antworten wie erforderlich markiert wurden; die Auswahl kann trotzdem inhaltlich falsch gewesen sein.</p></div></div><div class="table-scroll"><table class="analytics-table exact-stat-table"><thead><tr><th>Lernfeld</th><th>Antworten</th><th>Trefferquote</th><th>Fehler</th><th>Zu viel</th><th>Zu wenig</th><th>Gleiche Anzahl</th><th>Exakte Häufigkeit</th><th>Ø Zeit</th></tr></thead><tbody>${fieldRows || '<tr><td colspan="9">Noch keine Daten vorhanden.</td></tr>'}</tbody></table></div></section>
      <section class="section-block"><div class="section-heading"><div><div class="eyebrow">Fehlerschwerpunkte</div><h2>Schwierigste Fragen</h2></div></div><div class="table-scroll"><table class="analytics-table"><thead><tr><th>Frage</th><th>Lernfeld</th><th>Versuche</th><th>Fehler</th><th>Quote</th></tr></thead><tbody>${hardRows || '<tr><td colspan="5">Noch keine Daten vorhanden.</td></tr>'}</tbody></table></div></section>
      <section class="section-block"><div class="section-heading"><div><div class="eyebrow">Verlauf</div><h2>Letzte Durchläufe</h2></div></div><div class="table-scroll"><table class="analytics-table"><thead><tr><th>Datum</th><th>Durchgang</th><th>Fragen</th><th>Ergebnis</th><th>Zeit</th></tr></thead><tbody>${recentSessions || '<tr><td colspan="5">Noch keine abgeschlossenen Durchläufe.</td></tr>'}</tbody></table></div></section>
    </div>`);
  }

  function renderInfo() {
    app.innerHTML = layout(`<div class="info-page">
      <section class="page-hero compact-hero"><div><div class="eyebrow">Transparenz</div><h1>Urheberschaft, KI-Unterstützung & Datenschutz</h1><p class="lead">Informationen zur Fragenbasis, technischen Umsetzung und lokalen Datenverarbeitung des Verkäufertrainers.</p></div><div class="page-hero-badge">Lokal<span>ohne Cloud-Zwang</span></div></section>
      <div class="info-grid">
        <article class="info-card"><h2>Grundlage und Umsetzung</h2><p><strong>Fragenbasis:</strong> Excel-Arbeitsmappe „Multiple Choice Kapitel 1 bis 23“ mit 920 Fragen.</p><p><strong>Konzept und Projektleitung:</strong> Christian Nitzsche.</p><p><strong>Technische Umsetzung und KI-Unterstützung:</strong> OpenAI ChatGPT für Programmierung, Gestaltung und Strukturierung.</p><p>Während der normalen Nutzung besteht keine Verbindung zu einem KI-Dienst; Fragen, Antworten und Lernergebnisse werden nicht an eine KI übermittelt.</p></article>
        <article class="info-card privacy"><h2>Datenschutzfreundliche lokale Verarbeitung</h2><p>Die App benötigt keine Registrierung. Sie speichert Lernstand, Fehlerliste, Statistiken, Testhistorie, Einstellungen sowie eigene Bearbeitungen ausschließlich im lokalen Browserspeicher.</p><div class="info-badge-row"><span class="info-badge">keine Benutzerkonten</span><span class="info-badge">keine Werbung</span><span class="info-badge">keine Trackingdienste</span><span class="info-badge">keine externen Schriftarten</span></div></article>
        <article class="info-card"><h2>Export, Import und Löschung</h2><p>Daten werden nur übertragen, wenn du selbst eine Sicherungsdatei exportierst, weitergibst oder importierst. Die eingebettete Fragenbasis bleibt Bestandteil der App.</p><div class="actions"><button class="danger-btn" type="button" data-action="delete-all-local-data">Alle lokalen App-Daten löschen</button></div></article>
        <article class="info-card warning"><h2>Hinweis bei öffentlicher Bereitstellung</h2><p>Diese lokale Version sendet keine Nutzungsdaten an einen Server. Bei einer späteren Veröffentlichung über Website oder App-Store müssen Hosting, Verantwortlichkeit und Datenschutzangaben gesondert geprüft und ergänzt werden.</p></article>
      </div><div class="actions centered"><button class="primary-btn" type="button" data-action="home">Zur Startseite</button></div>
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
      categoryId: getCategories()[0]?.id || 'kapitel-1', categoryName: getCategories()[0]?.name || 'Kapitel 1',
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
      if (!confirm('Diese Originalfrage aus Lernmodus, Test und Katalog ausblenden? Sie kann später wiederhergestellt werden.')) return;
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
      app: 'Verkäufertrainer',
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
    anchor.download = `Verkaeufertrainer_Datenbank_${new Date().toISOString().slice(0, 10)}.json`;
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
        throw new Error('Die Datei ist keine gültige Verkäufertrainer-Datensicherung.');
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
    const accepted = confirm('Wirklich sämtliche lokal gespeicherten App-Daten löschen? Dazu gehören Lernstand, Testhistorie, eigene Fragen, Kategorien und Bearbeitungen. Dieser Schritt kann nur über eine zuvor exportierte Sicherung rückgängig gemacht werden.');
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
    openBookStartedAt: null,
    openBookHelpVisible: false,
    openBookDifficulty: 'easy'
    };
    document.documentElement.dataset.theme = store.theme;
    render();
    toast('Alle lokalen App-Daten wurden gelöscht.');
  }

  function resetProgress() {
    if (!confirm('Lernstand, Fehlerliste und Testhistorie wirklich löschen? Die Fragendatenbank bleibt erhalten.')) return;
    store.wrongIds = [];
    store.stats = {};
    store.history = [];
    store.attemptLog = [];
    store.sessionHistory = [];
    store.activeSession = null;
    store.learningPathProgress = {};
    store.auditJourneyProgress = {};
    store.auditJourneyLastChapter = null;
    store.auditHelpUsage = {};
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
    if (event.target.id === 'openBookConfidence') { const q=currentOpenBookQuestion(); if(q){ const old=store.openBookProgress[q.id]||{}; store.openBookProgress[q.id]={...old,confidence:event.target.value}; saveStore(); } }

  });

  document.addEventListener('input', event => {
    if (event.target.id === 'catalogSearch') {
      state.catalogQuery = event.target.value;
      updateCatalogResults();
    }
    if (event.target.id === 'openBookTransfer') { const q=currentOpenBookQuestion(); if(q){store.openBookReflections[q.id]=event.target.value; saveStore();} }
    if (event.target.id === 'managerSearch') {
      state.managerQuery = event.target.value;
      updateManagerResults();
    }
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'set-openbook-difficulty') {
      state.openBookDifficulty = button.dataset.level || 'easy'; store.openBookDifficulty = state.openBookDifficulty; saveStore(); render();
    } else if (action === 'openbook-help') {
      const q=currentOpenBookQuestion(); state.openBookHelpVisible=true; if(q){store.openBookHelpUsage[q.id]=(store.openBookHelpUsage[q.id]||0)+1; saveStore();} render();
    } else if (action === 'start-openbook') {
      state.openBookSource = button.dataset.source || 'iso';
      const module=OPEN_BOOK_MODULES[state.openBookSource];
      const firstUnsolved=module.questions.findIndex(q=>openBookQuestionStats(q.id).correct===0);
      state.openBookIndex=firstUnsolved>=0?firstUnsolved:0; state.openBookFeedback=null; state.openBookHelpVisible=false; state.openBookDifficulty=store.openBookDifficulty||'easy'; state.openBookStartedAt=Date.now(); state.view='openBookQuestion'; render();
    } else if (action === 'openbook-home') {
      state.openBookFeedback=null; state.openBookHelpVisible=false; state.view='openBookHome'; render();
    } else if (action === 'next-openbook') {
      const module=OPEN_BOOK_MODULES[state.openBookSource]; state.openBookIndex=(state.openBookIndex+1)%module.questions.length; state.openBookFeedback=null; state.openBookHelpVisible=false; state.openBookStartedAt=Date.now(); render();
    } else if (action === 'document-search') {
      state.documentSearchSource = button.dataset.source || 'iso';
      state.view = 'documentSearch'; render();
    } else if (action === 'select-document-search') {
      state.documentSearchSource = button.dataset.source || 'iso';
      render();
    } else if (action === 'resume-session') {
      event.preventDefault();
      button.disabled = true;
      if (restoreActiveSession()) {
        render();
        toast('Der gespeicherte Durchgang wurde exakt fortgesetzt.');
      } else {
        state.view = 'home'; render(); toast('Der gespeicherte Durchgang ist unvollständig oder nicht mehr vorhanden.');
      }
    } else if (action === 'discard-session') {
      event.preventDefault();
      button.disabled = true;
      discardActiveSession();
      render();
      toast('Gespeicherter Durchgang wurde vollständig verworfen.');
    } else if (action === 'audit-journey') {
      if (state.session && !state.session.endedAt) saveActiveSession();
      state.view = 'auditJourney'; render();
    } else if (action === 'start-audit-chapter') {
      const chapter = CARAT_AUDIT_CHAPTERS.find(ch => Number(ch.number) === Number(button.dataset.chapter));
      if (!chapter) return;
      const pool = questionsForAuditChapter(chapter);
      store.auditJourneyProgress[chapter.id] = {...(store.auditJourneyProgress[chapter.id] || {}), startedAt: store.auditJourneyProgress[chapter.id]?.startedAt || new Date().toISOString(), lastAt: new Date().toISOString()};
      store.auditJourneyLastChapter = chapter.id; saveStore();
      requestSessionStart('audit', pool, {random:false, label:`CARAT Auditreise · Tag ${chapter.number}: ${chapter.title}`, auditChapterId:chapter.id, auditChapterNumber:chapter.number});
    } else if (action === 'open-audit-docs') {
      document.querySelector('.audit-documents')?.scrollIntoView({behavior:'smooth'});
    } else if (action === 'show-carat-help') {
      const question = state.session?.questions?.[state.session.index];
      if (question) {
        const key = sessionQuestionKey(question);
        state.session.caratHelpShown = state.session.caratHelpShown || {};
        state.session.caratHelpShown[key] = true;
        store.auditHelpUsage[question.uid] = Number(store.auditHelpUsage[question.uid] || 0) + 1;
        saveActiveSession(); render();
      }
    } else if (action === 'show-path-hint') {
      const question = state.session?.questions?.[state.session.index];
      if (question) {
        const key = sessionQuestionKey(question);
        state.session.hints = state.session.hints || {};
        state.session.hints[key] = true;
        store.pathHelpUsage[question.uid] = Number(store.pathHelpUsage[question.uid] || 0) + 1;
        saveActiveSession();
        render();
      }
    } else if (action === 'speak-break') {
      if (!speakInstruction(currentRestInstruction())) toast('Sprachausgabe ist in diesem Browser nicht verfügbar.');
    } else if (action === 'pause-path') {
      saveActiveSession();
      const auditMode = state.session?.mode === 'audit';
      state.view = auditMode ? 'auditJourney' : 'learningPath';
      render();
      toast(auditMode ? 'Auditreise pausiert. Du kannst genau hier fortsetzen.' : 'Lernreise pausiert. Die genaue Szene ist gespeichert.');
    } else if (action === 'learning-path') {
      if (state.session && !state.session.endedAt) saveActiveSession();
      state.view = 'learningPath'; render();
    } else if (action === 'start-path-module') {
      const module = LEARNING_PATH_MODULES.find(m => m.id === button.dataset.module);
      if (!module) return;
      store.learningPathProgress[module.id] = {...(store.learningPathProgress[module.id]||{}), startedAt:(store.learningPathProgress[module.id]?.startedAt||new Date().toISOString()), lastAt:new Date().toISOString()};
      store.learningPathLastModule = module.id; saveStore();
      const pool = questionsForLearningModule(module);
      requestSessionStart('path', pool, {random:false, label:`Verkäufer-Lernreise · Etappe ${module.order}: ${module.title}`, pathModuleId:module.id});
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
      const pendingMode = state.pendingSession?.mode;
      state.pendingSession = null;
      state.view = pendingMode === 'audit' ? 'auditJourney' : pendingMode === 'path' ? 'learningPath' : 'home';
      render();
    } else if (action === 'test-break') {
      state.breakPrompt = {returnView: state.session ? 'session' : 'home', milestone: state.session?.breakAnsweredInSession || 0, moduleIndex: Number(store.breakRotationIndex || 0) % BREAK_MODULES.length};
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
      requestSessionStart('exam', getAllQuestions(), {count: 45, threshold: store.passThreshold || 70, label: 'Test · 45 Fragen'});
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
      const label = category === 'all' ? `Test · ${count} Fragen` : `Test · ${getCategories().find(item => item.id === category)?.name || category}`;
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
      requestSessionStart('review', wrong, {random: false, label: 'Fehler aus letztem Test'});
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
