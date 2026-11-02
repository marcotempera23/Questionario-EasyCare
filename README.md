# Questionario EasyCare

Form statico (HTML + CSS + JS, nessuna dipendenza) per il questionario sulla gestione dell'assistenza.
Un unico link per tutti: dopo la domanda "A quale categoria appartieni?" il form prosegue con il
percorso **familiari** o **professionisti**.

## File

| File | Contenuto |
|---|---|
| `index.html` | Pagina |
| `styles.css` | Stile |
| `app.js` | Domande, logica condizionale, validazione, invio |

Le domande sono tutte nell'array `Q` in `app.js`: per modificare un testo o un'opzione basta cambiarlo lì.

## Pubblicazione (GitHub Pages)

Carica la cartella in un repository → *Settings → Pages* → branch `main`, cartella `/ (root)`.

## Collegamento a Supabase

1. In Supabase, *SQL Editor*, esegui:

```sql
create table public.risposte_questionario (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  percorso text,             -- 'familiari' | 'professionisti' | null
  esito text not null,       -- 'completato' | 'non_idoneo'
  risposte jsonb not null,
  contatti jsonb,            -- solo se ha accettato la sperimentazione
  durata_secondi integer,
  versione text
);

alter table public.risposte_questionario enable row level security;

-- chiunque può inserire una risposta, nessuno può leggerle con la chiave pubblica
create policy "inserimento anonimo"
  on public.risposte_questionario
  for insert to anon
  with check (true);
```

2. In `app.js` compila `CONFIG.SUPABASE_URL` e `CONFIG.SUPABASE_ANON_KEY`
   (*Project Settings → API*). Finché sono vuoti, le risposte vengono solo stampate nella console del browser.

## Formato dei dati

`risposte` contiene solo le domande effettivamente mostrate. Chiavi:

- scelta singola → stringa (`"fam_durata": "1-3_anni"`)
- scelta multipla → array (`"fam_strumenti": ["messaggistica", "email"]`)
- campi "Altro / specifica" → `<domanda>_<opzione>` (`"fam_strumenti_altro": "..."`)
- sotto-scelte → `<domanda>_dettaglio` (`"categoria_dettaglio": "figlio"`)
- fasce di età di più assistiti → array (`"fam_eta_assistiti": ["75-84", "oltre_85"]`)

Prefissi: `fam_` percorso familiari, `pro_` percorso professionisti, `ads_` blocco amministratore di sostegno/tutore,
nessun prefisso per le domande comuni.
