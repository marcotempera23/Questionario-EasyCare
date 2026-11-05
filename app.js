'use strict';

/* ==========================================================
   CONFIGURAZIONE INVIO RISPOSTE
   Inserisci qui i dati del tuo progetto Supabase.
   Finché i campi sono vuoti, le risposte vengono solo
   stampate nella console del browser (utile per i test).
   ========================================================== */
const CONFIG = {
  SUPABASE_URL: 'https://fqzvpwiujvjvdricqokg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_FNCvkAFCzVpZCsYWLdksag_ihtjfNNI', // chiave "Publishable" (sb_publishable_…) oppure "anon public" (eyJ…)
  TABLE: 'risposte_questionario',
  VERSION: '1.1',
};

const DRAFT_KEY = 'easycare-questionario-v1';

/* ==========================================================
   DEFINIZIONE DELLE DOMANDE
   type: single | multi | ages | textarea | contact | info
   showIf(a): la domanda compare solo se restituisce true
   endIf(a):  se true, il questionario termina dopo questa domanda
   Opzioni:  other → campo "specifica"; exclusive → deseleziona le altre;
             sub → sotto-scelta obbligatoria; count → selettore numerico
   ========================================================== */
const o = (v, l, extra = {}) => ({ v, l, ...extra });
const OTHER = (l = 'Altro') => o('altro', l, { other: true });
const YES_NO = [o('si', 'Sì'), o('no', 'No')];

// Ruoli che seguono il percorso "familiari"; tutti gli altri (compresi tutore e
// amministratore di sostegno) seguono il percorso "professionisti"
const FAMILY_ROLES = ['familiare', 'amico', 'vicino', 'informale', 'assistente_sociale'];
const ADS_ROLES = ['ads', 'tutore'];

const path = (a) => (!a.categoria ? null : FAMILY_ROLES.includes(a.categoria) ? 'fam' : 'pro');
const isFam = (a) => path(a) === 'fam';
const isPro = (a) => path(a) === 'pro';
const isAdsRole = (a) => ADS_ROLES.includes(a.categoria);
// Tutore/AdS (domanda 2) vedono il blocco subito dopo la domanda 4, senza la domanda 5
const showAdsBlock = (a) =>
  isFam(a) ? a.fam_ads_nominato === 'si_io' : isPro(a) && (isAdsRole(a) || a.pro_ads === 'si');

const S = {
  you: 'Su di te',
  exp: 'La tua esperienza',
  role: 'Il tuo incarico',
  work: 'Il tuo lavoro',
  org: 'Organizzazione e strumenti',
  sol: 'La nostra soluzione',
  op: (a) => (isPro(a) ? 'La tua opinione da esperto' : 'Le tue opinioni contano'),
};

const SOLUTION_ITEMS = [
  'Appuntamenti e visite',
  'Promemoria, annotazioni e scadenze',
  'Documenti sanitari e amministrativi',
  'Storico delle condizioni, delle misurazioni e degli eventi dell’assistito',
  'Turni, compiti e attività svolte',
  'Spese, pagamenti e rendiconti',
  'Comunicazioni e coordinamento',
  'Piani di cura, terapie e indicazioni alimentari',
  'Pratiche previdenziali e assistenziali',
];

const AGE_OPTIONS = [
  o('meno_65', 'Meno di 65 anni'),
  o('65-74', '65-74 anni'),
  o('75-84', '75-84 anni'),
  o('oltre_85', 'Oltre 85 anni'),
];

const TOOLS_OPTIONS = [
  o('messaggistica', 'WhatsApp o altre app di messaggistica'),
  o('telefonate', 'Telefonate'),
  o('agenda_cartacea', 'Agenda cartacea'),
  o('email', 'Email'),
  o('fogli_calcolo', 'Excel o altri fogli di calcolo'),
  o('calendario_condiviso', 'Calendario condiviso'),
  o('app_dedicate', 'Applicazioni dedicate alla salute o all’assistenza', { other: true, otherPh: 'Se sì, quali?' }),
  o('nessuno', 'Nessuno strumento particolare', { exclusive: true }),
  OTHER(),
];

const SUPPORT_OPTIONS = [
  o('per_nulla', 'Per nulla supportato'),
  o('poco', 'Poco supportato'),
  o('abbastanza', 'Abbastanza supportato'),
  o('molto', 'Molto supportato'),
  o('pienamente', 'Pienamente supportato'),
  o('nessuno_strumento', 'Non utilizzo strumenti specifici'),
];

const FREQUENCY_OPTIONS = [
  o('mai', 'Mai'),
  o('raramente', 'Raramente'),
  o('qualche_volta', 'Qualche volta'),
  o('spesso', 'Spesso'),
  o('molto_spesso', 'Molto spesso'),
];

const Q = [
  /* ---------- Parte comune ---------- */
  {
    id: 'fascia_eta', section: S.you, type: 'single',
    title: 'Qual è la tua fascia di età?',
    options: [o('18-34', '18-34 anni'), o('35-44', '35-44 anni'), o('45-54', '45-54 anni'), o('55-64', '55-64 anni'), o('65+', '65 anni o più')],
  },
  {
    id: 'sesso', section: S.you, type: 'single',
    title: 'Sesso',
    options: [o('donna', 'Donna'), o('uomo', 'Uomo'), o('non_indicato', 'Preferisco non indicarlo')],
  },
  {
    id: 'coinvolto', section: S.you, type: 'single',
    title: 'Sei attualmente coinvolto/a nell’assistenza di una o più persone anziane o fragili?',
    options: YES_NO,
  },
  {
    id: 'esperienza_passata', section: S.you, type: 'single',
    showIf: (a) => a.coinvolto === 'no',
    title: 'Hai avuto esperienze passate in cui hai assistito un anziano o una persona che ne aveva bisogno?',
    options: YES_NO,
    endIf: (a) => a.esperienza_passata === 'no',
  },
  {
    id: 'categoria', section: S.you, type: 'single',
    title: 'A quale categoria appartieni?',
    help: 'Scegli la voce che ti descrive meglio.',
    options: [
      o('familiare', 'Familiare della persona assistita', {
        subTitle: 'Che rapporto hai con la persona assistita?',
        sub: [
          o('figlio', 'Figlio/a'),
          o('coniuge', 'Coniuge / Partner'),
          o('fratello', 'Fratello / Sorella'),
          o('nipote', 'Nipote'),
          o('genitore', 'Genitore'),
          o('altro_parente', 'Altro rapporto di parentela'),
        ],
      }),
      o('amico', 'Amico o conoscente'),
      o('vicino', 'Vicino di casa'),
      o('informale', 'Assistente informale', { hint: 'Persona che presta assistenza regolarmente senza essere familiare' }),
      o('ads', 'Amministratore di sostegno'),
      o('tutore', 'Tutore'),
      o('professionista', 'Professionista dell’assistenza domiciliare', {
        subTitle: 'Qual è il tuo ruolo?',
        sub: [
          o('badante_convivente', 'Badante convivente'),
          o('badante_non_convivente', 'Badante non convivente'),
          o('oss', 'OSS (operatore socio-sanitario)'),
          o('infermiere', 'Infermiere'),
          o('fisioterapista', 'Fisioterapista'),
          o('educatore', 'Educatore professionale'),
          o('collaboratore_domestico', 'Collaboratore domestico'),
          o('case_manager', 'Case manager'),
          OTHER(),
        ],
      }),
      o('assistente_sociale', 'Assistente sociale'),
      o('operatore_rsa', 'Operatore di struttura residenziale / RSA'),
      OTHER(),
    ],
  },

  /* ---------- Percorso FAMILIARI ---------- */
  {
    id: 'fam_piu_assistiti', section: S.exp, type: 'single', showIf: isFam,
    title: 'Assisti più di una persona?',
    options: [
      o('si', 'Sì', { count: { key: 'fam_num_assistiti', min: 2, max: 20, label: 'Quante persone assisti?' } }),
      o('no', 'No'),
    ],
  },
  {
    id: 'fam_eta_assistiti', section: S.exp, type: 'ages', showIf: isFam,
    count: (a) => (a.fam_piu_assistiti === 'si' ? a.fam_num_assistiti || 2 : 1),
    title: (a) => (a.fam_piu_assistiti === 'si'
      ? 'Qual è la fascia di età delle persone assistite?'
      : 'Qual è la fascia di età della persona assistita?'),
    help: (a) => (a.fam_piu_assistiti === 'si' ? 'Indica la fascia di età per ciascuna persona.' : ''),
    options: AGE_OPTIONS,
  },
  {
    id: 'fam_ads_nominato', section: S.exp, type: 'single', showIf: isFam,
    title: 'È stato nominato un amministratore di sostegno?',
    options: [
      o('si_io', 'Sì, sono io'),
      o('si_altro', 'Sì, un’altra persona', { hint: 'Un altro parente o una figura professionale' }),
      o('no', 'No'),
    ],
  },

  /* ---------- Percorso PROFESSIONISTI (prima parte) ---------- */
  {
    id: 'pro_num_assistiti', section: S.work, type: 'single', showIf: isPro,
    title: 'Quante persone assisti mediamente?',
    options: [o('1', '1'), o('2-5', '2-5'), o('6-10', '6-10'), o('oltre_10', 'Oltre 10')],
  },
  {
    id: 'pro_eta_media', section: S.work, type: 'single', showIf: isPro,
    title: 'Qual è la fascia di età media delle persone assistite?',
    options: AGE_OPTIONS,
  },
  {
    id: 'pro_ads', section: S.work, type: 'single',
    showIf: (a) => isPro(a) && !isAdsRole(a),
    title: 'Sei l’amministratore di sostegno/tutore dell’assistito?',
    options: YES_NO,
  },

  /* ---------- Blocco AMMINISTRATORE DI SOSTEGNO / TUTORE (comune) ---------- */
  {
    id: 'ads_aspetti', section: S.role, type: 'multi', showIf: showAdsBlock,
    title: 'Di quali aspetti ti occupi nel tuo incarico?',
    options: [
      o('economica', 'Gestione economica e patrimoniale'),
      o('amministrative', 'Pratiche amministrative e rapporti con enti'),
      o('contratti', 'Contratti e servizi assistenziali'),
      o('domiciliare', 'Organizzazione dell’assistenza domiciliare'),
      o('coordinamento', 'Coordinamento di familiari e professionisti'),
      o('sanitaria', 'Visite e documentazione sanitaria'),
      o('monitoraggio', 'Monitoraggio delle condizioni del beneficiario'),
      o('rendiconti', 'Relazioni e rendiconti'),
      o('autorizzazioni', 'Autorizzazioni del giudice tutelare'),
      o('decisioni_sanitarie', 'Decisioni sanitarie, se previste dall’incarico'),
      OTHER(),
    ],
  },
  {
    id: 'ads_attivita', section: S.role, type: 'multi', showIf: showAdsBlock,
    title: 'Quali attività incidono maggiormente sul tuo tempo e sulla complessità del tuo incarico?',
    options: [
      o('documenti', 'Reperire, aggiornare, organizzare informazioni e documenti'),
      o('economia', 'Gestire entrate, spese e disponibilità economiche del beneficiario'),
      o('relazioni', 'Preparare relazioni, rendiconti e documentazione periodica'),
      o('enti', 'Gestire pratiche con enti pubblici, amministrazioni e istituzioni'),
      o('comunicazione', 'Comunicare e coordinarsi con familiari, assistenti e professionisti coinvolti'),
      o('organizzazione', 'Organizzare assistenza, visite, appuntamenti e attività necessarie'),
      o('monitoraggio', 'Monitorare le condizioni, i bisogni e le necessità del beneficiario'),
      o('scadenze', 'Tenere sotto controllo scadenze, adempimenti e attività da svolgere'),
      o('storico', 'Ricostruire lo storico di attività, decisioni e comunicazioni'),
      o('imprevisti', 'Gestire imprevisti e situazioni urgenti'),
      OTHER(),
    ],
  },
  {
    id: 'ads_frequenza_rendiconto', section: S.role, type: 'single', showIf: showAdsBlock,
    title: 'Con quale frequenza devi presentare una relazione o un rendiconto al giudice tutelare?',
    options: [
      o('6_mesi', 'Ogni 6 mesi'),
      o('annuale', 'Annualmente'),
      o('diversa', 'Con una periodicità differente indicata dal giudice'),
      o('su_richiesta', 'Soltanto su richiesta'),
      o('non_ancora', 'Non ho ancora presentato il primo rendiconto'),
      o('non_so', 'Non so'),
    ],
  },
  {
    id: 'ads_difficolta_rendiconto', section: S.role, type: 'multi', showIf: showAdsBlock,
    title: 'Quali sono le maggiori difficoltà nella preparazione del rendiconto?',
    options: [
      o('raccolta_documenti', 'Raccogliere fatture, ricevute e altri documenti'),
      o('entrate_uscite', 'Ricostruire entrate, uscite e saldi bancari'),
      o('giustificativi', 'Associare le spese ai relativi giustificativi'),
      o('eventi_anno', 'Ricostruire le attività e gli eventi dell’anno'),
      o('condizioni', 'Descrivere le condizioni personali e sociali del beneficiario'),
      o('modulistica', 'Comprendere quali informazioni inserire e come compilare la modulistica'),
      o('coordinamento', 'Coordinarsi con familiari, professionisti o consulenti'),
      o('scadenze', 'Rispettare tempi e scadenze'),
      o('nessuna', 'Non incontro particolari difficoltà', { exclusive: true }),
      OTHER(),
    ],
  },
  {
    id: 'ads_preparazione_rendiconto', section: S.role, type: 'multi', showIf: showAdsBlock,
    title: 'Come prepari attualmente il rendiconto?',
    options: [
      o('autonomia', 'Interamente in autonomia', { exclusive: true }),
      o('familiare', 'Con l’aiuto di un familiare'),
      o('commercialista', 'Con l’aiuto di un commercialista'),
      o('avvocato', 'Con l’aiuto di un avvocato'),
      o('associazione', 'Con il supporto di un’associazione o servizio dedicato'),
      o('software', 'Utilizzando un software o un gestionale'),
      OTHER(),
    ],
  },
  {
    id: 'ads_onere_burocratico', section: S.role, type: 'single', showIf: showAdsBlock,
    title: 'Quanto ritieni difficile e dispendioso l’impegno burocratico e amministrativo richiesto dal tuo incarico?',
    options: [
      o('per_nulla', 'Per nulla gravoso'),
      o('poco', 'Poco gravoso'),
      o('abbastanza', 'Abbastanza gravoso'),
      o('molto', 'Molto gravoso'),
      o('estremamente', 'Estremamente gravoso'),
    ],
  },

  /* ---------- Percorso FAMILIARI (seconda parte) ---------- */
  {
    id: 'fam_stessa_citta', section: S.exp, type: 'single', showIf: isFam,
    title: (a) => (a.fam_piu_assistiti === 'si'
      ? 'Attualmente risiedi nella stessa città delle persone che assisti?'
      : 'Attualmente risiedi nella stessa città della persona che assisti?'),
    options: [
      o('si', 'Sì'),
      o('no', 'No', {
        subTitle: 'A che distanza vivi dalla persona assistita?',
        sub: [
          o('entro_20km', 'Entro 20 km'),
          o('20-50km', 'Tra 20 e 50 km'),
          o('50-100km', 'Tra 50 e 100 km'),
          o('oltre_100km', 'Oltre 100 km'),
        ],
      }),
    ],
  },
  {
    id: 'fam_durata', section: S.exp, type: 'single', showIf: isFam,
    title: 'Da quanto tempo sei coinvolto/a nell’assistenza?',
    options: [o('meno_6_mesi', 'Meno di 6 mesi'), o('6-12_mesi', 'Da 6 a 12 mesi'), o('1-3_anni', 'Da 1 a 3 anni'), o('oltre_3_anni', 'Più di 3 anni')],
  },
  {
    id: 'fam_persone_famiglia', section: S.exp, type: 'single', showIf: isFam,
    title: 'Quante persone della stessa famiglia partecipano attivamente alla gestione e all’assistenza?',
    options: [o('solo_io', 'Solo io'), o('2', '2 persone'), o('3-4', '3–4 persone'), o('5+', '5 o più persone')],
  },
  {
    id: 'fam_figure_esterne', section: S.exp, type: 'multi', showIf: isFam,
    title: 'Sono presenti figure professionali esterne?',
    options: [
      o('assistente_informale', 'Assistente informale'),
      o('ads_tutore', 'Amministratore di sostegno / Tutore'),
      o('collaboratore_domestico', 'Collaboratore domestico'),
      o('oss', 'OSS (operatore socio-sanitario)'),
      o('infermiere', 'Infermiere'),
      o('fisioterapista', 'Fisioterapista'),
      o('altri_sanitari', 'Altri professionisti medico/sanitari'),
      o('assistente_sociale', 'Assistente sociale'),
      o('nessuna', 'Nessuna', { exclusive: true }),
      OTHER(),
    ],
  },
  {
    id: 'fam_strumenti', section: S.org, type: 'multi', showIf: isFam,
    title: 'Quali strumenti utilizzate oggi per coordinarvi?',
    options: TOOLS_OPTIONS,
  },
  {
    id: 'fam_supporto_strumenti', section: S.org, type: 'single', showIf: isFam,
    title: 'Quanto ti senti supportato/a dagli strumenti che utilizzi?',
    options: SUPPORT_OPTIONS,
  },
  {
    id: 'fam_difficolta_coordinamento', section: S.org, type: 'single', showIf: isFam,
    title: 'Quanto trovi difficile coordinare informazioni, appuntamenti, aspetti economici e attività tra le persone coinvolte nell’assistenza?',
    options: [
      o('per_nulla', 'Per nulla difficile'),
      o('poco', 'Poco difficile'),
      o('abbastanza', 'Abbastanza difficile'),
      o('molto', 'Molto difficile'),
      o('estremamente', 'Estremamente difficile'),
      o('non_applicabile', 'Non applicabile: mi occupo da solo/a dell’assistenza'),
    ],
  },
  {
    id: 'fam_tranquillita', section: S.org, type: 'single', showIf: isFam,
    title: 'Quanto ti senti tranquillo/a rispetto all’assistenza che la persona riceve quando non sei presente?',
    options: [
      o('per_nulla', 'Per nulla tranquillo/a'),
      o('poco', 'Poco tranquillo/a'),
      o('abbastanza', 'Abbastanza tranquillo/a'),
      o('molto', 'Molto tranquillo/a'),
      o('completamente', 'Completamente tranquillo/a'),
    ],
  },
  {
    id: 'fam_aspetto_stressante', section: S.org, type: 'single', showIf: isFam,
    title: 'Quale aspetto trovi più stressante?',
    help: 'Scegli quello che pesa di più.',
    options: [
      o('appuntamenti_scadenze', 'Ricordare appuntamenti e scadenze'),
      o('coordinare_persone', 'Coordinare familiari, badanti o personale di supporto'),
      o('dati_informazioni', 'Tenere traccia di dati e informazioni rilevanti'),
      o('burocrazia', 'Gestire documenti e pratiche (burocrazia)'),
      o('quadro_situazione', 'Mantenere un quadro chiaro della situazione attuale e passata'),
      o('prenotazioni', 'Gestire prenotazioni e visite'),
      o('terapie', 'Gestire terapie e medicinali, piani di cura, dieta, ecc.'),
      o('spese', 'Controllo e gestione delle spese'),
      o('trovare_professionisti', 'Trovare figure professionali adatte alle proprie esigenze'),
      OTHER(),
    ],
  },
  {
    id: 'fam_tempo_settimanale', section: S.org, type: 'single', showIf: isFam,
    title: 'Quanto tempo dedichi mediamente, ogni settimana, all’organizzazione dei bisogni e all’assistenza della persona assistita?',
    options: [o('meno_1h', 'Meno di 1 ora'), o('1-3h', '1–3 ore'), o('3-5h', '3–5 ore'), o('5-10h', '5–10 ore'), o('oltre_10h', 'Più di 10 ore')],
  },
  {
    id: 'fam_adeguatezza_tempo', section: S.org, type: 'single', showIf: isFam,
    title: 'Quanto ritieni adeguato il tempo che dedichi alla persona assistita rispetto alle sue necessità?',
    options: [
      o('insufficiente', 'Del tutto insufficiente'),
      o('poco', 'Poco adeguato'),
      o('abbastanza', 'Abbastanza adeguato'),
      o('pienamente', 'Pienamente adeguato'),
    ],
  },

  /* ---------- Percorso PROFESSIONISTI (seconda parte) ---------- */
  {
    id: 'pro_anzianita', section: S.work, type: 'single', showIf: isPro,
    title: 'Da quanto tempo svolgi questa attività?',
    options: [o('meno_1', 'Meno di 1 anno'), o('1-3', '1-3 anni'), o('3-5', '3-5 anni'), o('oltre_5', 'Oltre 5 anni')],
  },
  {
    id: 'pro_contesto', section: S.work, type: 'multi', showIf: isPro,
    title: 'In quale contesto operi principalmente?',
    options: [
      o('domiciliare_privata', 'Assistenza domiciliare privata'),
      o('domiciliare_pubblica', 'Assistenza domiciliare pubblica'),
      o('cooperativa', 'Cooperativa sociale'),
      o('rsa', 'RSA / Casa di riposo'),
      o('pubblico_ospedale', 'Servizio pubblico/ospedale'),
      o('clinica', 'Clinica di cura'),
      OTHER(),
    ],
  },
  {
    id: 'pro_confronto', section: S.work, type: 'multi', showIf: isPro,
    title: 'Con chi ti confronti più frequentemente per la gestione dell’assistito?',
    options: [
      o('familiari', 'Familiari'),
      o('assistenti_informali', 'Assistenti informali'),
      o('altri_professionisti', 'Altri professionisti'),
      o('medici', 'Medici'),
      o('ads_tutore_as', 'Amministratore di sostegno/tutore/Assistente sociale'),
      OTHER(),
    ],
  },
  {
    id: 'pro_difficolta', section: S.work, type: 'multi', showIf: isPro,
    title: 'Quali difficoltà incontri più spesso nell’ambito delle attività per l’assistito?',
    options: [
      o('info_incomplete', 'Informazioni incomplete o mancanti'),
      o('info_contrastanti', 'Informazioni contrastanti ricevute da persone diverse'),
      o('contattare_familiari', 'Difficoltà a contattare i familiari'),
      o('programmazione', 'Programmazione visite e attività'),
      o('nessun_riferimento', 'Assenza di una persona di riferimento'),
      o('documentazione', 'Gestione documentazione'),
      o('piano_terapeutico', 'Gestione piano terapeutico'),
      o('coordinamento', 'Difficoltà di allineamento/coordinamento con le figure coinvolte'),
      o('passaggio_consegne', 'Difficoltà nel passaggio di consegne'),
      OTHER(),
    ],
  },
  {
    id: 'pro_strumenti', section: S.org, type: 'multi', showIf: isPro,
    title: 'Quali strumenti utilizzi per coordinare e organizzare il tuo lavoro?',
    options: TOOLS_OPTIONS,
  },
  {
    id: 'pro_supporto_strumenti', section: S.org, type: 'single', showIf: isPro,
    title: 'Quanto ti senti supportato/a dagli strumenti che utilizzi per organizzare e svolgere il tuo lavoro?',
    options: SUPPORT_OPTIONS,
  },
  {
    id: 'pro_persone_coinvolte', section: S.org, type: 'single', showIf: isPro,
    title: 'Quante persone diverse, tra professionisti e familiari, coinvolge mediamente ogni assistito?',
    options: [o('nessuna', 'Nessuna'), o('1-2', '1-2'), o('3-5', '3-5'), o('6-10', '6-10'), o('oltre_10', 'Oltre 10')],
  },
  {
    id: 'pro_complessita_coordinamento', section: S.org, type: 'single', showIf: isPro,
    title: 'Quanto ritieni complesso il coordinamento tra le persone coinvolte nell’assistenza?',
    options: [
      o('per_nulla', 'Per nulla complesso'),
      o('poco', 'Poco complesso'),
      o('abbastanza', 'Abbastanza complesso'),
      o('molto', 'Molto complesso'),
      o('estremamente', 'Estremamente complesso'),
    ],
  },
  {
    id: 'pro_attivita_tempo', section: S.org, type: 'single', showIf: isPro,
    title: 'Quale attività occupa più tempo nel tuo lavoro, oltre all’assistenza diretta della persona?',
    options: [
      o('telefonate', 'Telefonate'),
      o('messaggi', 'Scambio di messaggi'),
      o('aggiornare_info', 'Tenere aggiornate le informazioni e dati clinico/sanitari sull’assistito e sulle attività svolte'),
      o('scambio_info', 'Scambio di informazioni'),
      o('allineamento', 'Allineamento con altre figure professionali e non'),
      o('documenti', 'Recupero documenti'),
      o('appuntamenti', 'Organizzazione appuntamenti'),
      OTHER(),
    ],
  },
  {
    id: 'pro_ricerca_info', section: S.org, type: 'single', showIf: isPro,
    title: 'Ti è mai capitato di dover cercare informazioni/documenti/dati che avrebbero dovuto essere facilmente disponibili per lo svolgimento del tuo lavoro?',
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'pro_info_difficili', section: S.org, type: 'multi', showIf: isPro,
    title: 'Quali informazioni/documenti/dati risultano più difficili da reperire?',
    options: [
      o('terapie', 'Terapie in corso e rispetto delle indicazioni medico/sanitarie'),
      o('esiti', 'Esiti di visite ed esami'),
      o('contatti_familiari', 'Contatti dei familiari'),
      o('contatti_professionisti', 'Contatti dei professionisti'),
      o('appuntamenti_turni', 'Appuntamenti futuri/turni lavorativi'),
      o('evoluzione_salute', 'Evoluzione delle condizioni di salute dell’assistito nel tempo'),
      o('documenti_amministrativi', 'Documenti amministrativi/burocratici'),
      OTHER(),
    ],
  },
  {
    id: 'pro_ritardi', section: S.org, type: 'single', showIf: isPro,
    title: 'Con che frequenza ricevi aggiornamenti in ritardo, o modifiche e richieste dell’ultimo minuto?',
    options: FREQUENCY_OPTIONS,
  },

  /* ---------- La nostra soluzione (comune) ---------- */
  {
    id: 'presentazione_soluzione', section: S.sol, type: 'info',
    title: 'Immagina una piattaforma che permetta a familiari, collaboratori domestici e professionisti di condividere e gestire in un unico spazio:',
  },
  {
    id: 'utilita', section: S.sol, type: 'single',
    title: 'Quanto ritieni utile una soluzione di questo tipo?',
    options: [
      o('per_nulla', 'Per nulla utile'),
      o('poco', 'Poco utile'),
      o('abbastanza', 'Abbastanza utile'),
      o('molto', 'Molto utile'),
      o('estremamente', 'Estremamente utile'),
    ],
  },
  {
    id: 'fam_funzionalita', section: S.sol, type: 'multi', showIf: isFam,
    title: 'Quali funzionalità ritieni più utili?',
    options: [
      o('calendario', 'Calendario condiviso tra familiari e professionisti'),
      o('promemoria_visite', 'Promemoria visite e appuntamenti'),
      o('promemoria_farmaci', 'Promemoria farmaci e scadenze'),
      o('spese', 'Gestione e divisione di spese e costi'),
      o('monitoraggio_cure', 'Monitoraggio delle cure e delle disposizioni medico-sanitarie per l’assistito'),
      o('archivio', 'Archivio documenti e storico dei dati medico-sanitari'),
      o('registro_attivita', 'Registro delle attività svolte dai professionisti che supportano l’assistito'),
      o('chat', 'Chat tra le persone coinvolte nelle cure e nell’assistenza'),
      o('pratiche', 'Semplificazione delle pratiche previdenziali e assistenziali'),
      o('report', 'Reportistica personalizzata sullo stato di salute dell’assistito'),
      OTHER(),
    ],
  },
  {
    id: 'pro_funzionalita', section: S.sol, type: 'multi', showIf: isPro,
    title: 'Quali funzionalità ritieni maggiormente utili?',
    options: [
      o('calendario', 'Calendario condiviso tra familiari e professionisti'),
      o('diario', 'Diario Digitale per annotazioni e comunicazioni'),
      o('registro', 'Registro delle attività svolte e dell’evoluzione delle condizioni del paziente'),
      o('appuntamenti_turni', 'Gestione appuntamenti e turni'),
      o('archivio', 'Archivio documenti e storico dati medico-sanitari'),
      o('pagamenti', 'Gestione integrata pagamenti e spese'),
      o('terapie', 'Gestione farmaci, terapie, dieta, esercizi, etc.'),
      o('chat', 'Chat tra professionisti e familiari'),
      o('report', 'Report automatici'),
      o('burocrazia', 'Semplificazione pratiche burocratiche amministrative'),
      OTHER(),
    ],
  },
  {
    id: 'probabilita_uso', section: S.sol, type: 'single',
    title: (a) => (isPro(a)
      ? 'Se una piattaforma come descritta fosse disponibile oggi, con quale probabilità la utilizzeresti?'
      : 'Utilizzeresti una soluzione di questo tipo se fosse disponibile?'),
    options: [
      o('sicuramente_si', 'Sicuramente sì'),
      o('probabilmente_si', 'Probabilmente sì'),
      o('non_so', 'Non so'),
      o('probabilmente_no', 'Probabilmente no'),
      o('sicuramente_no', 'Sicuramente no'),
    ],
  },
  {
    id: 'fam_abbonamento', section: S.sol, type: 'single', showIf: isFam,
    title: 'Se questa piattaforma ti permettesse di risparmiare tempo, ridurre gli errori e vivere con maggiore serenità per te e per l’assistito, saresti disposto/a a pagare un abbonamento mensile?',
    options: YES_NO,
  },
  {
    id: 'fam_prezzo', section: S.sol, type: 'single',
    showIf: (a) => isFam(a) && a.fam_abbonamento === 'si',
    title: 'Quanto varrebbe per te ogni mese una piattaforma come questa?',
    options: [o('fino_5', 'Fino a 5 €'), o('5-10', 'Da 5 a 10 €'), o('10-15', 'Da 10 a 15 €'), o('oltre_15', 'Oltre 15 €')],
  },
  {
    id: 'sperimentazione', section: S.sol, type: 'single',
    title: 'Saresti interessato/a a partecipare gratuitamente alla sperimentazione del servizio?',
    options: YES_NO,
  },
  {
    id: 'contatti', section: S.sol, type: 'contact',
    showIf: (a) => a.sperimentazione === 'si',
    title: 'Perfetto! Lasciaci i tuoi recapiti',
    help: 'Ti contatteremo solo per invitarti alla sperimentazione gratuita. Questi dati vengono conservati separatamente dalle tue risposte.',
  },

  /* ---------- Domande aperte (comune) ---------- */
  {
    id: 'eliminare_stress', section: S.op, type: 'textarea',
    title: (a) => (isPro(a)
      ? 'Se potessi eliminare una sola fonte di frustrazione nel tuo lavoro di assistenza e cura, quale sarebbe?'
      : 'Se potessi eliminare una sola fonte di stress o preoccupazione legata all’assistenza, quale sarebbe?'),
    help: 'Facoltativo · scrivi liberamente, anche poche parole.',
  },
  {
    id: 'altro_da_integrare', section: S.op, type: 'textarea',
    title: 'C’è altro che non abbiamo chiesto che pensi sia utile integrare?',
    help: 'Facoltativo.',
  },
];

/* ==========================================================
   STATO
   ========================================================== */
let A = {};          // risposte
let current = null;  // id della domanda corrente
let history = [];    // percorso delle domande già viste
let startedAt = null;

const $app = document.getElementById('app');
const val = (x) => (typeof x === 'function' ? x(A) : x);
const byId = (id) => Q.find((q) => q.id === id);
const isVisible = (q) => !q.showIf || q.showIf(A);
const otherKey = (q, opt) => `${q.id}_${opt.v}`;
const subKey = (q) => `${q.id}_dettaglio`;

function nextVisible(id) {
  const from = Q.findIndex((q) => q.id === id);
  for (let i = from + 1; i < Q.length; i++) if (isVisible(Q[i])) return Q[i];
  return null;
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ A, current, history, startedAt }));
  } catch (_) { /* archiviazione non disponibile */ }
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return d && d.current && byId(d.current) ? d : null;
  } catch (_) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignora */ }
}

/* ==========================================================
   ICONE
   ========================================================== */
const ICON = {
  logo: `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#26756e"/><path d="M16 23.5s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 16 12.6a3.6 3.6 0 0 1 6.5 2.3c0 4.7-6.5 8.6-6.5 8.6Z" fill="#fff"/></svg>`,
  arrowR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  arrowL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>`,
};

const brand = `<div class="brand">${ICON.logo}<span>EasyCare</span></div>`;

/* ==========================================================
   RENDER
   ========================================================== */
function mount(html, focusSel) {
  $app.classList.remove('enter');
  void $app.offsetWidth; // riavvia l'animazione
  $app.innerHTML = html;
  $app.classList.add('enter');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const f = focusSel && $app.querySelector(focusSel);
  if (f) f.focus({ preventScroll: true });
}

function renderWelcome() {
  const draft = loadDraft();
  mount(`
    <div class="card"><div class="hero">
      ${brand}
      <h1 class="hero-title" tabindex="-1">Questionario sulla gestione dell’assistenza a familiari anziani o fragili</h1>
      <p class="greet">Ciao,</p>
      <p style="margin-top:6px">il team di EasyCare sta conducendo una ricerca per comprendere le esigenze e le difficoltà di chi assiste un anziano o una persona fragile. Stiamo costruendo una soluzione pensata per generare un impatto concreto, basandoci sull’esperienza e sulle esigenze delle persone coinvolte nell’assistenza.</p>
      <p>Grazie per il tuo tempo.</p>
      <ul class="meta">
        <li>${ICON.clock} Circa 10 minuti</li>
        <li>${ICON.lock} Anonimo</li>
        <li>${ICON.save} Puoi interrompere e riprendere</li>
      </ul>
      <div class="actions">
        ${draft
          ? `<button class="btn btn-primary" data-act="resume">Riprendi da dove eri rimasto/a ${ICON.arrowR}</button>
             <button class="btn btn-ghost" data-act="restart">Ricomincia da capo</button>`
          : `<button class="btn btn-primary" data-act="start">Inizia il questionario ${ICON.arrowR}</button>`}
      </div>
    </div></div>`, '.hero-title');
}

function progressOf(q) {
  const vis = Q.filter(isVisible);
  const i = Math.max(0, vis.indexOf(q));
  return Math.round((i / vis.length) * 100);
}

function optionHTML(q, opt, kind) {
  const selected = kind === 'radio' ? A[q.id] === opt.v : (A[q.id] || []).includes(opt.v);
  let extra = '';

  if (opt.other) {
    extra += `<div class="reveal"><input class="field" type="text" maxlength="300"
      data-key="${otherKey(q, opt)}" placeholder="${opt.otherPh || 'Specifica (facoltativo)'}"
      aria-label="${opt.otherPh || 'Specifica'}"></div>`;
  }

  if (opt.sub) {
    const subs = opt.sub.map((s) => {
      const checked = selected && A[subKey(q)] === s.v ? 'checked' : '';
      const subOther = s.other
        ? `<div class="reveal"><input class="field" type="text" maxlength="300"
            data-key="${subKey(q)}_${s.v}" placeholder="Specifica (facoltativo)" aria-label="Specifica"></div>`
        : '';
      return `<div class="opt-wrap">
        <label class="opt"><input type="radio" name="sub-${opt.v}" value="${s.v}" data-sub="1" ${checked}>
          <span class="mark"></span><span class="lbl">${s.l}</span></label>${subOther}</div>`;
    }).join('');
    extra += `<div class="reveal" role="radiogroup" aria-label="${opt.subTitle || opt.l}">
      ${opt.subTitle ? `<p class="reveal-title">${opt.subTitle}</p>` : ''}${subs}</div>`;
  }

  if (opt.count) {
    const c = opt.count;
    const v = A[c.key] ?? c.min;
    extra += `<div class="reveal counter">
      <p class="reveal-title">${c.label}</p>
      <div class="counter-row">
        <button type="button" class="round" data-act="dec" data-key="${c.key}" aria-label="Diminuisci">−</button>
        <output class="counter-val" data-out="${c.key}">${v}</output>
        <button type="button" class="round" data-act="inc" data-key="${c.key}" aria-label="Aumenta">+</button>
      </div>
      <input type="range" min="${c.min}" max="${c.max}" step="1" value="${v}" data-key="${c.key}" aria-label="${c.label}">
    </div>`;
  }

  return `<div class="opt-wrap">
    <label class="opt"><input type="${kind}" name="q" value="${opt.v}" ${selected ? 'checked' : ''}>
      <span class="mark"></span>
      <span class="lbl">${opt.l}${opt.hint ? `<small>${opt.hint}</small>` : ''}</span>
    </label>${extra}</div>`;
}

function agesHTML(q) {
  const n = q.count(A);
  const vals = A[q.id] || [];
  if (n === 1) {
    return `<div class="options" role="radiogroup" aria-labelledby="q-title">${q.options.map((opt) => `
      <div class="opt-wrap"><label class="opt"><input type="radio" name="age-0" value="${opt.v}" data-age="0" ${vals[0] === opt.v ? 'checked' : ''}>
        <span class="mark"></span><span class="lbl">${opt.l}</span></label></div>`).join('')}</div>`;
  }
  let html = '<div class="options">';
  for (let i = 0; i < n; i++) {
    html += `<div class="age-group" role="radiogroup" aria-labelledby="age-t-${i}">
      <p class="age-group-title" id="age-t-${i}">Persona ${i + 1}</p>
      <div class="chips">${q.options.map((opt) => `
        <label class="opt"><input type="radio" name="age-${i}" value="${opt.v}" data-age="${i}" ${vals[i] === opt.v ? 'checked' : ''}>
          <span class="mark"></span><span class="lbl">${opt.l}</span></label>`).join('')}</div>
    </div>`;
  }
  return html + '</div>';
}

function contactHTML() {
  return `<div class="form-grid">
    <div class="form-row"><label for="f-nome">Nome e cognome</label>
      <input class="field" id="f-nome" type="text" autocomplete="name" data-key="contatto_nome" maxlength="120"></div>
    <div class="form-row"><label for="f-email">Indirizzo e-mail</label>
      <input class="field" id="f-email" type="email" inputmode="email" autocomplete="email" data-key="contatto_email" maxlength="160"></div>
    <div class="form-row"><label for="f-tel">Numero di telefono <span class="opt-tag">(facoltativo)</span></label>
      <input class="field" id="f-tel" type="tel" inputmode="tel" autocomplete="tel" data-key="contatto_telefono" maxlength="30"></div>
    <label class="consent"><input type="checkbox" data-key="contatto_consenso">
      <span>Acconsento al trattamento dei miei dati di contatto al solo fine di essere ricontattato/a per la sperimentazione del servizio.</span></label>
  </div>`;
}

function bodyHTML(q) {
  switch (q.type) {
    case 'single':
      return `<div class="options" role="radiogroup" aria-labelledby="q-title">${q.options.map((opt) => optionHTML(q, opt, 'radio')).join('')}</div>`;
    case 'multi':
      return `<div class="options" role="group" aria-labelledby="q-title">${q.options.map((opt) => optionHTML(q, opt, 'checkbox')).join('')}</div>`;
    case 'ages':
      return agesHTML(q);
    case 'textarea':
      return `<div class="form-grid"><textarea class="field" data-key="${q.id}" maxlength="2000"
        aria-labelledby="q-title" placeholder="Scrivi qui…"></textarea></div>`;
    case 'contact':
      return contactHTML();
    case 'info':
      return `<ul class="features">${SOLUTION_ITEMS.map((t) => `<li>${ICON.check}<span>${t}</span></li>`).join('')}</ul>`;
    default:
      return '';
  }
}

function nextLabel(q) {
  if (isLast(q)) return `Invia le risposte ${ICON.arrowR}`;
  if (q.type === 'info') return `Continua ${ICON.arrowR}`;
  if (q.type === 'textarea' && !(A[q.id] || '').trim()) return `Salta ${ICON.arrowR}`;
  return `Avanti ${ICON.arrowR}`;
}
const isLast = (q) => !nextVisible(q.id) && !(q.endIf && q.endIf(A));

function renderQuestion() {
  const q = byId(current);
  const pct = progressOf(q);
  const help = val(q.help);

  mount(`
    <div class="card">
      <header class="card-top">
        ${brand}
        <div class="progress" aria-label="Avanzamento">
          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
          <span class="progress-label">${pct}%</span>
        </div>
      </header>
      <form class="card-body" novalidate>
        <p class="eyebrow">${val(q.section)}</p>
        <h2 class="q-title" id="q-title" tabindex="-1">${val(q.title)}</h2>
        ${help ? `<p class="help">${help}</p>` : ''}
        ${q.type === 'multi' ? `<span class="hint-chip">Puoi scegliere più risposte</span>` : ''}
        ${bodyHTML(q)}
        <p class="error" role="alert"></p>
      </form>
      <footer class="nav">
        <button type="button" class="btn btn-ghost" data-act="back">${ICON.arrowL} Indietro</button>
        <span class="kbd-hint">premi Invio ↵</span>
        <button type="button" class="btn btn-primary" data-act="next">${nextLabel(q)}</button>
      </footer>
    </div>`, '#q-title');

  // ripristina i valori dei campi
  $app.querySelectorAll('[data-key]').forEach((el) => {
    const v = A[el.dataset.key];
    if (v == null || el.tagName === 'BUTTON') return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v;
  });
}

function renderEnd(kind) {
  const screenOut = kind === 'non_idoneo';
  mount(`
    <div class="card"><div class="hero">
      <div class="icon-badge">${ICON.heart}</div>
      <h1 class="hero-title" tabindex="-1">${screenOut ? 'Grazie per il tuo tempo' : 'Grazie di cuore!'}</h1>
      <p>${screenOut
        ? 'Questo questionario è rivolto a chi assiste, o ha assistito, una persona anziana o fragile. Sentiti libero/a di condividerlo con chiunque si prenda cura di un assistito: ci sarebbe di grande aiuto.'
        : 'Le tue risposte sono state registrate. Ci aiuteranno a costruire uno strumento davvero utile per chi si prende cura delle persone fragili. Se conosci qualcuno che assiste un familiare o lavora nell’assistenza, condividi il questionario: ogni risposta conta.'}</p>
      <div class="actions">
        <button class="btn btn-primary" data-act="share">${ICON.share} Condividi il questionario</button>
      </div>
      <p class="toast" aria-live="polite"></p>
    </div></div>`, '.hero-title');
}

function showError(msg) {
  const el = $app.querySelector('.error');
  if (el) el.textContent = msg;
}

/* ==========================================================
   VALIDAZIONE
   ========================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s./()-]{6,}$/;

function validate(q) {
  const v = A[q.id];
  switch (q.type) {
    case 'single': {
      if (!v) return 'Seleziona una risposta per continuare.';
      const opt = q.options.find((x) => x.v === v);
      if (opt && opt.sub && !opt.sub.some((s) => s.v === A[subKey(q)])) {
        return 'Seleziona anche una delle opzioni comparse sotto la tua risposta.';
      }
      return '';
    }
    case 'multi':
      return v && v.length ? '' : 'Seleziona almeno una risposta.';
    case 'ages': {
      const n = q.count(A);
      for (let i = 0; i < n; i++) {
        if (!v || !v[i]) return n > 1 ? `Indica la fascia di età della persona ${i + 1}.` : 'Seleziona una risposta per continuare.';
      }
      return '';
    }
    case 'contact': {
      if (!(A.contatto_nome || '').trim()) return 'Inserisci il tuo nome e cognome.';
      if (!EMAIL_RE.test((A.contatto_email || '').trim())) return 'Inserisci un indirizzo e-mail valido.';
      const tel = (A.contatto_telefono || '').trim();
      if (tel && !PHONE_RE.test(tel)) return 'Il numero di telefono non sembra corretto.';
      if (!A.contatto_consenso) return 'Per poterti ricontattare ci serve il tuo consenso.';
      return '';
    }
    default:
      return '';
  }
}

/* ==========================================================
   RACCOLTA DATI E INVIO
   ========================================================== */
function collect() {
  const risposte = {};
  let contatti = null;
  const text = (k) => (A[k] || '').trim();

  for (const id of [...history, current]) {
    const q = byId(id);
    if (!q || q.type === 'info') continue;

    if (q.type === 'contact') {
      contatti = {
        nome: text('contatto_nome'),
        email: text('contatto_email'),
        telefono: text('contatto_telefono') || null,
        consenso: !!A.contatto_consenso,
      };
      continue;
    }
    if (q.type === 'textarea') {
      if (text(q.id)) risposte[q.id] = text(q.id);
      continue;
    }
    if (q.type === 'ages') {
      risposte[q.id] = (A[q.id] || []).slice(0, q.count(A));
      continue;
    }

    const v = A[q.id];
    risposte[q.id] = v;
    const chosen = q.type === 'multi' ? v || [] : [v];
    for (const opt of q.options) {
      if (!chosen.includes(opt.v)) continue;
      if (opt.other && text(otherKey(q, opt))) risposte[otherKey(q, opt)] = text(otherKey(q, opt));
      if (opt.count) risposte[opt.count.key] = A[opt.count.key] ?? opt.count.min;
      if (opt.sub) {
        const d = A[subKey(q)];
        risposte[subKey(q)] = d;
        const so = opt.sub.find((s) => s.v === d);
        const k = `${subKey(q)}_${d}`;
        if (so && so.other && text(k)) risposte[k] = text(k);
      }
    }
  }

  const p = path(A);
  return {
    percorso: p === 'fam' ? 'familiari' : p === 'pro' ? 'professionisti' : null,
    risposte,
    contatti,
  };
}

async function submitResponse(payload) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.info('[EasyCare] Supabase non configurato. Risposta che verrebbe inviata:', payload);
    return;
  }
  const res = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${CONFIG.TABLE}`, {
    method: 'POST',
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      // le chiavi "legacy" (eyJ…) vanno anche nell'header Authorization; le nuove (sb_publishable_…) no
      ...(CONFIG.SUPABASE_ANON_KEY.startsWith('eyJ') && { Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` }),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Invio non riuscito (${res.status})`);
}

async function finish(esito) {
  const btn = $app.querySelector('[data-act="next"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Invio in corso…'; }

  const payload = {
    ...collect(),
    esito,
    durata_secondi: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
    versione: CONFIG.VERSION,
  };

  try {
    await submitResponse(payload);
  } catch (err) {
    console.error(err);
    if (esito === 'completato') {
      if (btn) { btn.disabled = false; btn.innerHTML = `Riprova a inviare ${ICON.arrowR}`; }
      showError('Non siamo riusciti a inviare le risposte. Controlla la connessione e riprova: le tue risposte non sono andate perse.');
      return;
    }
  }
  clearDraft();
  renderEnd(esito);
}

/* ==========================================================
   NAVIGAZIONE
   ========================================================== */
function start() {
  A = {};
  history = [];
  current = Q[0].id;
  startedAt = Date.now();
  saveDraft();
  renderQuestion();
}

function goNext() {
  const q = byId(current);
  const err = validate(q);
  if (err) return showError(err);
  if (q.endIf && q.endIf(A)) return finish('non_idoneo');
  const n = nextVisible(current);
  if (!n) return finish('completato');
  history.push(current);
  current = n.id;
  saveDraft();
  renderQuestion();
}

function goBack() {
  if (!history.length) return renderWelcome();
  current = history.pop();
  saveDraft();
  renderQuestion();
}

function setCount(key, value) {
  const q = byId(current);
  const opt = q.options.find((x) => x.count && x.count.key === key);
  const c = opt.count;
  A[key] = Math.min(c.max, Math.max(c.min, value));
  const out = $app.querySelector(`[data-out="${key}"]`);
  const range = $app.querySelector(`input[type="range"][data-key="${key}"]`);
  if (out) out.textContent = A[key];
  if (range) range.value = A[key];
}

async function share() {
  const url = location.href.split('#')[0];
  const toast = $app.querySelector('.toast');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Questionario EasyCare', text: 'Ti chiedo 10 minuti per questo questionario sull’assistenza ad anziani e persone fragili.', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    if (toast) toast.textContent = 'Link copiato! Ora puoi incollarlo dove preferisci.';
  } catch (_) {
    if (toast) toast.textContent = `Copia questo link: ${url}`;
  }
}

/* ==========================================================
   EVENTI
   ========================================================== */
$app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'start' || act === 'restart') { clearDraft(); start(); }
  else if (act === 'resume') {
    const d = loadDraft();
    if (!d) return start();
    ({ A, current, history, startedAt } = d);
    renderQuestion();
  }
  else if (act === 'next') goNext();
  else if (act === 'back') goBack();
  else if (act === 'inc' || act === 'dec') { setCount(b.dataset.key, (A[b.dataset.key] || 0) + (act === 'inc' ? 1 : -1)); saveDraft(); }
  else if (act === 'share') share();
});

$app.addEventListener('input', (e) => {
  const t = e.target;
  const q = byId(current);
  if (!q) return;

  if (t.name === 'q' && t.type === 'radio') {
    if (A[q.id] !== t.value) {
      A[q.id] = t.value;
      delete A[subKey(q)];
      $app.querySelectorAll('input[data-sub]').forEach((s) => { s.checked = false; });
    }
    const opt = q.options.find((x) => x.v === t.value);
    if (opt && opt.count && A[opt.count.key] == null) A[opt.count.key] = opt.count.min;
  } else if (t.name === 'q' && t.type === 'checkbox') {
    const boxes = [...$app.querySelectorAll('input[name="q"]')];
    const isExcl = (b) => q.options.find((x) => x.v === b.value).exclusive;
    if (t.checked) boxes.forEach((b) => { if (b !== t && (isExcl(t) || isExcl(b))) b.checked = false; });
    A[q.id] = boxes.filter((b) => b.checked).map((b) => b.value);
  } else if (t.dataset.sub) {
    A[subKey(q)] = t.value;
  } else if (t.dataset.age != null) {
    A[q.id] = A[q.id] || [];
    A[q.id][+t.dataset.age] = t.value;
  } else if (t.dataset.key) {
    if (t.type === 'range') return setCount(t.dataset.key, +t.value), saveDraft();
    A[t.dataset.key] = t.type === 'checkbox' ? t.checked : t.value;
  }

  showError('');
  const btn = $app.querySelector('[data-act="next"]');
  if (btn && !btn.disabled) btn.innerHTML = nextLabel(q);
  saveDraft();
});

$app.addEventListener('submit', (e) => { e.preventDefault(); goNext(); });

$app.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
  if (!byId(current) || !$app.querySelector('[data-act="next"]')) return;
  e.preventDefault();
  goNext();
});

renderWelcome();
