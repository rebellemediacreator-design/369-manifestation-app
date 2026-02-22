const state = {
  formulas: [
    { context: 'business', text: 'Ich kann das bis Freitag liefern. Früher nicht.' },
    { context: 'business', text: 'Ich gebe dir eine klare Rückmeldung bis 14:00 Uhr. Vorher nicht.' },
    { context: 'business', text: 'Ich bin für Qualität zuständig, nicht für permanente Erreichbarkeit.' },
    { context: 'familie', text: 'Ich komme gern, aber nur für zwei Stunden.' },
    { context: 'familie', text: 'Nein, das übernehme ich heute nicht. Bitte plant ohne mich.' },
    { context: 'familie', text: 'Ich entscheide das in Ruhe und melde mich morgen.' },
    { context: 'partner', text: 'Ich rede weiter, wenn wir beide ruhig sprechen.' },
    { context: 'partner', text: 'Ich höre dich. Meine Entscheidung bleibt trotzdem.' },
    { context: 'partner', text: 'Ich trage Verantwortung für mich, nicht für deine Reaktion.' },
    { context: 'freundinnen', text: 'Ich habe heute keine Kapazität für ein langes Telefonat.' },
    { context: 'freundinnen', text: 'Ich bin gern ehrlich statt verfügbar um jeden Preis.' },
    { context: 'freundinnen', text: 'Ich schaffe das diese Woche nicht und verspreche nichts Halbes.' }
  ],
  checklists: {
    warnzeichen: [
      'Ich sage Ja und fühle sofort Druck im Körper.',
      'Ich rechtfertige mich länger als ich entscheide.',
      'Ich verschiebe klare Antworten aus Angst vor Reaktion.',
      'Ich stelle Harmonie über Wahrheit.'
    ],
    manipulation: [
      'Schuldumkehr: „Wegen dir geht alles schief."',
      'Dringlichkeitsdruck ohne echten Grund.',
      'Abwertung deiner Grenze als „übertrieben".',
      'Love-Bombing nach Grenzbruch statt echter Klärung.'
    ],
    fehler: [
      'Zu viel Erklärung statt klarer Satz.',
      'Keine Konsequenz nach Grenzbruch.',
      'Boundary erst setzen, wenn ich explodiere.',
      'Unklare Sprache („eigentlich", „vielleicht").',
      'Konflikt vermeiden bis zur inneren Kündigung.'
    ]
  },
  planSteps: [
    'Körpersignal beobachten (Nacken/Kiefer/Atem).',
    'Eine Mini-Grenze schriftlich formulieren.',
    'Grenze in 1 Satz laut sprechen.',
    'Ohne Rechtfertigung wiederholen.',
    '10 ruhige Ausatemzüge nach Kontakt.',
    'Trigger notieren: Wer, wann, welches Muster?',
    'Konsequenz vorab definieren.',
    'Eine Bitte klar ablehnen.',
    'Antwort verzögern statt impulsiv zusagen.',
    'Tonlage tief, Tempo langsam halten.'
  ],
  testQuestions: [
    'Ich fühle mich schnell verantwortlich für fremde Emotionen.',
    'Ich sage häufig Ja, obwohl ich Nein meine.',
    'Ich fürchte, als schwierig zu gelten, wenn ich Grenzen setze.',
    'Ich erkläre mich ausführlich, um akzeptiert zu bleiben.',
    'Nach Konflikten grüble ich über jedes Wort.',
    'Ich habe körperliche Stresssignale vor klaren Gesprächen.',
    'Ich ziehe mich zurück, statt eine Grenze offen auszusprechen.',
    'Ich lasse Grenzverletzungen mehrfach durchgehen.',
    'Ich passe meine Bedürfnisse häufig an, um Ärger zu vermeiden.',
    'Ich fühle Schuld, wenn ich mich priorisiere.'
  ]
};

const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function initFormulas() {
  const filter = document.getElementById('contextFilter');
  const search = document.getElementById('formulaSearch');
  const list = document.getElementById('formulaList');

  function render() {
    const selected = filter.value;
    const term = search.value.toLowerCase().trim();

    const result = state.formulas.filter(item => {
      const contextMatch = selected === 'alle' || selected === item.context;
      const textMatch = item.text.toLowerCase().includes(term);
      return contextMatch && textMatch;
    });

    list.innerHTML = '';
    if (!result.length) {
      list.innerHTML = '<li>Keine Treffer. Nutze weniger Begriffe oder wähle „Alle".</li>';
      return;
    }

    result.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="tag">${item.context}</span><p>${item.text}</p>`;
      list.appendChild(li);
    });
  }

  filter.addEventListener('change', render);
  search.addEventListener('input', render);
  render();
}

function renderChecklist(containerId, key, items) {
  const container = document.getElementById(containerId);
  const saved = storage.get(`checklist_${key}`, {});
  container.innerHTML = '';

  items.forEach((text, i) => {
    const id = `${key}_${i}`;
    const li = document.createElement('li');
    const checked = Boolean(saved[id]);
    li.innerHTML = `
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <label for="${id}" class="${checked ? 'done' : ''}">${text}</label>
    `;

    li.querySelector('input').addEventListener('change', (e) => {
      saved[id] = e.target.checked;
      storage.set(`checklist_${key}`, saved);
      li.querySelector('label').classList.toggle('done', e.target.checked);
    });

    container.appendChild(li);
  });
}

function initPlan() {
  const body = document.getElementById('planBody');
  const saved = storage.get('plan30', {});
  body.innerHTML = '';

  for (let day = 1; day <= 30; day += 1) {
    const tr = document.createElement('tr');
    const focus = state.planSteps[(day - 1) % state.planSteps.length];
    const done = Boolean(saved[`day${day}`]);

    tr.innerHTML = `
      <td>Tag ${day}</td>
      <td>${focus}</td>
      <td><button class="plan-toggle ${done ? 'done' : ''}" data-day="${day}">${done ? 'Erledigt' : 'Offen'}</button></td>
    `;

    tr.querySelector('button').addEventListener('click', () => {
      const key = `day${day}`;
      saved[key] = !saved[key];
      storage.set('plan30', saved);
      initPlan();
    });

    body.appendChild(tr);
  }
}

function initTest() {
  const form = document.getElementById('miniTest');
  const result = document.getElementById('testResult');

  state.testQuestions.forEach((q, index) => {
    const row = document.createElement('div');
    row.className = 'test-row';
    row.innerHTML = `
      <p>${index + 1}. ${q}</p>
      <label><input type="radio" name="q${index}" value="0" checked> trifft kaum zu</label>
      <label><input type="radio" name="q${index}" value="1"> teils/teils</label>
      <label><input type="radio" name="q${index}" value="2"> trifft oft zu</label>
    `;
    form.appendChild(row);
  });

  document.getElementById('evalTest').addEventListener('click', () => {
    let score = 0;
    state.testQuestions.forEach((_, index) => {
      const selected = form.querySelector(`input[name="q${index}"]:checked`);
      score += Number(selected.value);
    });

    let text = '';
    if (score <= 6) {
      text = 'Niedrige People-Pleasing-Tendenz. Du setzt bereits häufig klare Grenzen.';
    } else if (score <= 13) {
      text = 'Mittlere Tendenz. Unter Druck kippst du situativ in Anpassung.';
    } else {
      text = 'Erhöhte Tendenz mit Zurückweisungssensitivität. Fokus: kurze Sätze, klare Konsequenzen, tägliche Regulation.';
    }

    result.textContent = `${text} (Score: ${score}/20). Das ist eine Orientierung, keine Diagnose.`;
  });
}

function initWeekLabel() {
  const label = document.getElementById('weekLabel');
  const value = storage.get('weekLabel', '10');
  label.textContent = value;

  label.setAttribute('title', 'Doppelklick zum Ändern');
  label.addEventListener('dblclick', () => {
    const next = prompt('Woche ändern:', label.textContent);
    if (!next) return;
    const clean = next.trim();
    label.textContent = clean;
    storage.set('weekLabel', clean);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFormulas();
  renderChecklist('checkWarnzeichen', 'warnzeichen', state.checklists.warnzeichen);
  renderChecklist('checkManipulation', 'manipulation', state.checklists.manipulation);
  renderChecklist('checkFehler', 'fehler', state.checklists.fehler);
  initPlan();
  initTest();
  initWeekLabel();
});
