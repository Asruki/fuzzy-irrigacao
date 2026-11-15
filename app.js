
(function () {
  'use strict';

  const F = window.Fuzzy;
  const fmt = F.fmt, fmt2 = F.fmt2, fmt6 = F.fmt6;
  const $ = function (id) { return document.getElementById(id); };

  const COLORS = {
    seco: '#c2410c', intermediario: '#0f766e', umido: '#1d4ed8',
    baixa: '#1d4ed8', media: '#0f766e', alta: '#c2410c',
    curto: '#1d4ed8', medio: '#0f766e', longo: '#c2410c'
  };
  const INPUT_COLOR = '#be123c';
  const AGG_COLOR = '#7c3aed';


  function initialState() {
    return {
      U: String(F.DEFAULTS.U),
      T: String(F.DEFAULTS.T),
      dz: String(F.DEFAULTS.dz),
      consequents: F.DEFAULT_CONSEQUENTS.slice(),
      step: 0,              
      result: null,         
      selectedRule: 0,
      showAll: false,
      focusId: null
    };
  }
  let state = initialState();

  function chartSVG(o) {
    const W = 640, H = 320, m = { l: 58, r: 20, t: 28, b: 56 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const X = function (x) { return m.l + (x - o.xMin) / (o.xMax - o.xMin) * pw; };
    const Y = function (y) { return m.t + (1 - y) * ph; };
    const n2 = function (v) { return v.toFixed(2); };
    const path = function (pts, close) {
      return 'M' + pts.map(function (p) { return n2(X(p[0])) + ' ' + n2(Y(p[1])); }).join('L') + (close ? 'Z' : '');
    };
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + o.aria + '">';

    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + n2(Y(t)) + '" y2="' + n2(Y(t)) + '"/>';
      s += '<text class="tick" x="' + (m.l - 8) + '" y="' + n2(Y(t) + 4) + '" text-anchor="end">' + fmt(t) + '</text>';
    });
    o.xTicks.forEach(function (t) {
      s += '<line class="grid" x1="' + n2(X(t)) + '" x2="' + n2(X(t)) + '" y1="' + m.t + '" y2="' + (m.t + ph) + '"/>';
      s += '<text class="tick" x="' + n2(X(t)) + '" y="' + (m.t + ph + 16) + '" text-anchor="middle">' + fmt(t) + '</text>';
    });

    (o.fills || []).forEach(function (fl) {
      s += '<path d="' + path(fl.pts, true) + '" fill="' + fl.color + '" fill-opacity="' + fl.opacity + '" stroke="none"/>';
    });
    (o.lines || []).forEach(function (ln) {
      s += '<path d="' + path(ln.pts, false) + '" fill="none" stroke="' + ln.color + '" stroke-width="' + (ln.width || 1.5) + '"' +
        (ln.dash ? ' stroke-dasharray="' + ln.dash + '"' : '') + '/>';
    });

    (o.sets || []).forEach(function (st) {
      const p = st.params;
      const pts = [[p[0], 0], [p[1], 1], [p[2], 1], [p[3], 0]];
      s += '<path d="' + path(pts, false) + '" fill="none" stroke="' + st.color + '" stroke-width="' + (st.faint ? 1.6 : 2.6) + '"' +
        (st.faint ? ' stroke-opacity="0.4"' : '') + (st.dashed ? ' stroke-dasharray="7 4"' : '') + ' stroke-linejoin="round"/>';
      if (!st.noLabel) {
        const cx = (p[1] + p[2]) / 2;
        const anchor = cx - o.xMin < (o.xMax - o.xMin) * 0.06 ? 'start' : (o.xMax - cx < (o.xMax - o.xMin) * 0.06 ? 'end' : 'middle');
        s += '<text class="lbl" x="' + n2(X(cx)) + '" y="' + (m.t - 8) + '" text-anchor="' + anchor + '" fill="' + st.color + '"' +
          (st.faint ? ' fill-opacity="0.6"' : '') + '>' + st.label + '</text>';
      }
    });

    (o.hlines || []).forEach(function (h) {
      s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + n2(Y(h.y)) + '" y2="' + n2(Y(h.y)) + '" stroke="' + h.color +
        '" stroke-width="1.6" stroke-dasharray="3 3"/>';
      s += '<text class="lbl" x="' + (W - m.r - 4) + '" y="' + n2(Y(h.y) - 5) + '" text-anchor="end" fill="' + h.color + '">' + h.label + '</text>';
    });
    (o.vlines || []).forEach(function (v) {
      s += '<line x1="' + n2(X(v.x)) + '" x2="' + n2(X(v.x)) + '" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + v.color +
        '" stroke-width="2" ' + (v.dash ? 'stroke-dasharray="6 4"' : '') + '/>';
      const right = X(v.x) > W - 150;
      s += '<text class="lbl" x="' + n2(X(v.x) + (right ? -5 : 5)) + '" y="' + (m.t + ph - 8) + '" text-anchor="' + (right ? 'end' : 'start') +
        '" fill="' + v.color + '">' + v.label + '</text>';
    });
    (o.dots || []).forEach(function (d) {
      s += '<circle cx="' + n2(X(d.x)) + '" cy="' + n2(Y(d.y)) + '" r="4.5" fill="' + (d.y > 0 ? d.color : '#fff') +
        '" stroke="' + d.color + '" stroke-width="2"/>';
    });

    s += '<line class="axis" x1="' + m.l + '" x2="' + m.l + '" y1="' + m.t + '" y2="' + (m.t + ph) + '"/>';
    s += '<line class="axis" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ph) + '" y2="' + (m.t + ph) + '"/>';
    s += '<text class="axis-title" x="' + (m.l + pw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + o.xLabel + '</text>';
    s += '<text class="axis-title" transform="translate(15 ' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">Grau de pertinência (0 a 1)</text>';
    return s + '</svg>';
  }

  function setsFor(varName, faint) {
    return F.ORDER[varName].map(function (n) {
      return { label: F.LABELS[n], params: F.SETS[varName][n], color: COLORS[n], faint: !!faint };
    });
  }

  function sampleFn(fn) {
    const pts = [], n = 1500, lo = F.DOMAINS.tempo.min, hi = F.DOMAINS.tempo.max;
    for (let i = 0; i <= n; i++) {
      const z = lo + (hi - lo) * i / n;
      pts.push([z, fn(z)]);
    }
    return pts;
  }
  function polygon(samples) {
    const last = samples[samples.length - 1][0];
    return [[samples[0][0], 0]].concat(samples, [[last, 0]]);
  }

  const X_TICKS = {
    umidade: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    temperatura: [10, 15, 20, 25, 30, 35, 40],
    tempo: [0, 5, 10, 15, 20, 25, 30]
  };

  function chartInput(varName, value, step, result) {
    const d = F.DOMAINS[varName];
    const o = {
      xMin: d.min, xMax: d.max, xTicks: X_TICKS[varName],
      xLabel: d.label + ' (' + d.unit + ')',
      aria: 'Conjuntos fuzzy de ' + d.label.toLowerCase(),
      sets: setsFor(varName), vlines: [], dots: []
    };
    if (step >= 1 && result) {
      o.vlines.push({ x: value, color: INPUT_COLOR, label: (varName === 'umidade' ? 'U = ' : 'T = ') + fmt(value) + ' ' + d.unit });
      F.ORDER[varName].forEach(function (n) {
        o.dots.push({ x: value, y: result.fuzzification[varName][n], color: COLORS[n] });
      });
    }
    return chartSVG(o);
  }

  function chartOutput(opts) {
    const d = F.DOMAINS.tempo;
    return chartSVG({
      xMin: d.min, xMax: d.max, xTicks: X_TICKS.tempo,
      xLabel: 'Tempo de irrigação z (min)',
      aria: opts.aria,
      sets: opts.sets, fills: opts.fills, lines: opts.lines, hlines: opts.hlines, vlines: opts.vlines
    });
  }


  function badge(n) {
    if (n > state.step) return '<span class="badge">pendente</span>';
    if (n === state.step && state.step < 5) return '<span class="badge atual">etapa atual</span>';
    return '<span class="badge concluida">concluída</span>';
  }
  function pendingMsg() {
    return '<p class="pending">Etapa ainda não executada. Clique em <strong>Calcular</strong> ou em <strong>Avançar etapa</strong>.</p>';
  }
  function logHTML(lines) {
    return '<ol class="log">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ol>';
  }
  function card(n, title, desc, body) {
    return '<article class="card" id="step' + n + '"><header><h3>' + n + '. ' + title + '</h3>' + badge(n) + '</header>' +
      '<p class="desc">' + desc + '</p>' + body + '</article>';
  }
  function params(p) { return p.map(fmt).join(', '); }

  function stepFuzzification() {
    const r = state.result, on = state.step >= 1 && r;
    let body = '<div class="charts"><div><p class="chart-title">Umidade do solo</p>' + chartInput('umidade', r && r.U, state.step, r) + '</div>' +
      '<div><p class="chart-title">Temperatura</p>' + chartInput('temperatura', r && r.T, state.step, r) + '</div></div>';
    if (!on) return card(1, 'Fuzzificação', 'Converte os valores informados em graus de pertinência (compatibilidade) com cada conjunto.', body + pendingMsg());
    let rows = '';
    ['umidade', 'temperatura'].forEach(function (v) {
      F.ORDER[v].forEach(function (n) {
        rows += '<tr><td>' + F.DOMAINS[v].label + '</td><td>' + F.LABELS[n] + '</td><td>(' + params(F.SETS[v][n]) + ')</td>' +
          '<td class="num">' + fmt(v === 'umidade' ? r.U : r.T) + ' ' + F.DOMAINS[v].unit + '</td>' +
          '<td class="num"><strong>' + fmt(r.fuzzification[v][n]) + '</strong></td></tr>';
      });
    });
    body += '<div class="table-wrap"><table><thead><tr><th>Variável</th><th>Conjunto</th><th>(a, b, c, d)</th><th class="num">Valor</th><th class="num">Grau μ</th></tr></thead><tbody>' +
      rows + '</tbody></table></div>' + logHTML(r.logs.fuzzificacao);
    return card(1, 'Fuzzificação', 'Converte os valores informados em graus de pertinência (compatibilidade) com cada conjunto. Os graus não precisam somar 1.', body);
  }

  function stepRules() {
    const r = state.result;
    if (!(state.step >= 2 && r)) return card(2, 'Avaliação das regras', 'Para cada regra, h(r) = min(μumidade, μtemperatura) (operador E = mínimo).', pendingMsg());
    let rows = '';
    r.rules.forEach(function (ru) {
      rows += '<tr data-rule="' + ru.index + '" class="' + (ru.active ? 'active ' : '') + (ru.index === state.selectedRule ? 'selected' : '') + '" title="Clique para ver o recorte desta regra na etapa 3">' +
        '<td>' + ru.id + '</td><td>SE solo ' + F.LABELS[ru.uSet] + ' E temp. ' + F.LABELS[ru.tSet] + '</td>' +
        '<td class="num">' + fmt(ru.muU) + '</td><td class="num">' + fmt(ru.muT) + '</td>' +
        '<td>min(' + fmt(ru.muU) + '; ' + fmt(ru.muT) + ')</td><td class="num"><strong>' + fmt(ru.h) + '</strong></td>' +
        '<td>ENTÃO ' + F.LABELS[ru.consequent] + '</td><td>' + (ru.active ? 'ativada' : 'ativação zero') + '</td></tr>';
    });
    const body = '<div class="table-wrap"><table><thead><tr><th>Regra</th><th>Antecedente</th><th class="num">μ umidade</th><th class="num">μ temp.</th><th>Operação</th><th class="num">h(r)</th><th>Consequente</th><th>Situação</th></tr></thead><tbody>' +
      rows + '</tbody></table></div><p class="hint">Regras ativadas estão destacadas em verde. Clique em uma linha para escolhê-la na etapa 3.</p>' + logHTML(r.logs.regras);
    return card(2, 'Avaliação das regras', 'Para cada regra, h(r) = min(μumidade, μtemperatura) (operador E = mínimo). Base completa com as nove regras.', body);
  }

  function stepImplication() {
    const r = state.result, d = F.DOMAINS.tempo;
    const desc = 'Cada conjunto de saída é recortado na altura h(r): μr(z) = min(h(r), μconsequente(z)). Regras com ativação zero não contribuem.';
    const base = { aria: 'Implicação: recorte do consequente da regra selecionada', sets: [], fills: [], lines: [], hlines: [] };
    base.sets = setsFor('tempo', true).map(function (s) { s.noLabel = false; return s; });
    if (!(state.step >= 3 && r)) {
      return card(3, 'Implicação (recorte dos consequentes)', desc,
        '<div class="charts">' + '<div>' + chartOutput(base) + '</div></div>' + pendingMsg());
    }
    const ru = r.rules[state.selectedRule] || r.rules[0];
    const col = COLORS[ru.consequent];
    const opts = { aria: 'Implicação da regra ' + ru.id, sets: [], fills: [], lines: [], hlines: [] };
    opts.sets = setsFor('tempo', true);
    if (state.showAll) {
      r.rules.filter(function (x) { return x.active; }).forEach(function (x) {
        opts.fills.push({ pts: polygon(sampleFn(function (z) { return F.clip(x, z); })), color: COLORS[x.consequent], opacity: 0.16 });
      });
    }
    opts.sets.push({ label: '', params: F.SETS.tempo[ru.consequent], color: col, dashed: true, noLabel: true });
    if (ru.active) {
      opts.fills.push({ pts: polygon(sampleFn(function (z) { return F.clip(ru, z); })), color: col, opacity: 0.4 });
    }
    opts.hlines.push({ y: ru.h, color: INPUT_COLOR, label: 'h(' + ru.id + ') = ' + fmt(ru.h) });

    let options = '';
    r.rules.forEach(function (x) {
      options += '<option value="' + x.index + '"' + (x.index === state.selectedRule ? ' selected' : '') + '>' + x.id + ' — ' +
        F.LABELS[x.consequent] + ' (h = ' + fmt(x.h) + ')</option>';
    });
    const expl = ru.active
      ? ru.id + ': consequente original <strong>' + F.LABELS[ru.consequent] + '</strong> (tracejado), recortado em h = ' + fmt(ru.h) + ' (região preenchida): μr(z) = min(' + fmt(ru.h) + '; μ' + F.LABELS[ru.consequent] + '(z)).'
      : ru.id + ' tem ativação zero: o recorte é vazio e a regra não contribui para a saída.';
    let rows = '';
    r.rules.forEach(function (x) {
      rows += '<tr class="' + (x.active ? 'active' : '') + '"><td>' + x.id + '</td><td>' + F.LABELS[x.consequent] + ' (' + params(F.SETS.tempo[x.consequent]) + ')</td>' +
        '<td class="num">' + fmt(x.h) + '</td><td>' + (x.active ? 'recortado em ' + fmt(x.h) : 'sem contribuição') + '</td></tr>';
    });
    const body = '<div class="controls"><label>Regra visualizada: <select id="viewRule">' + options + '</select></label>' +
      '<label><input type="checkbox" id="showAll"' + (state.showAll ? ' checked' : '') + '> mostrar recortes de todas as regras ativadas</label></div>' +
      '<div class="charts"><div>' + chartOutput(opts) + '</div></div><p>' + expl + '</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Regra</th><th>Consequente (a, b, c, d)</th><th class="num">h(r)</th><th>Implicação</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      logHTML(r.logs.implicacao);
    return card(3, 'Implicação (recorte dos consequentes)', desc, body);
  }

  function aggChartOpts(r, withCentroid) {
    const opts = { aria: withCentroid ? 'Saída agregada com o centroide' : 'Saída agregada (máximo dos recortes)', sets: setsFor('tempo', true), fills: [], lines: [], vlines: [] };
    const agg = sampleFn(function (z) { return F.aggregate(r.rules, z); });
    opts.fills.push({ pts: polygon(agg), color: AGG_COLOR, opacity: 0.35 });
    opts.lines.push({ pts: agg, color: AGG_COLOR, width: 2.4 });
    r.rules.filter(function (x) { return x.active; }).forEach(function (x) {
      opts.lines.push({ pts: sampleFn(function (z) { return F.clip(x, z); }), color: '#64748b', width: 1, dash: '4 3' });
    });
    if (withCentroid && r.defuzz.valid) {
      opts.vlines.push({ x: r.defuzz.z, color: INPUT_COLOR, label: 'centroide = ' + fmt2(r.defuzz.z) + ' min' });
    }
    return opts;
  }

  function stepAggregation() {
    const r = state.result;
    const desc = 'μagregada(z) = max(μ1(z), …, μ9(z)). Usa-se o máximo entre os recortes, nunca a soma das áreas.';
    if (!(state.step >= 4 && r)) {
      return card(4, 'Agregação', desc, '<div class="charts"><div>' + chartOutput({ aria: 'Conjuntos de saída', sets: setsFor('tempo') }) + '</div></div>' + pendingMsg());
    }
    let rows = '';
    r.checkPoints.forEach(function (p) { rows += '<tr><td class="num">' + fmt(p.z) + '</td><td class="num"><strong>' + fmt(p.mu) + '</strong></td></tr>'; });
    const body = '<div class="charts"><div>' + chartOutput(aggChartOpts(r, false)) + '</div></div>' +
      '<p class="hint">Região roxa = máximo dos recortes. Linhas tracejadas = recorte de cada regra ativada.</p>' +
      '<div class="table-wrap"><table><thead><tr><th class="num">z (min)</th><th class="num">μagregada(z)</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      logHTML(r.logs.agregacao);
    return card(4, 'Agregação', desc, body);
  }

  function stepDefuzz() {
    const r = state.result;
    const desc = 'Centroide numérico por pontos médios: z* = Σ z(k)·μ(z(k)) / Σ μ(z(k)), com z(k) = (k + 0,5)·Δz.';
    if (!(state.step >= 5 && r)) {
      return card(5, 'Defuzzificação (centroide)', desc, '<div class="charts"><div>' + chartOutput({ aria: 'Conjuntos de saída', sets: setsFor('tempo') }) + '</div></div>' + pendingMsg());
    }
    const d = r.defuzz;
    const result = d.valid
      ? '<div class="result-box"><div>Tempo recomendado de irrigação</div><div class="big">' + fmt2(d.z) + ' minutos</div>' +
        '<div>valor interno: ' + fmt6(d.z) + ' min · Δz = ' + fmt(d.dz) + ' min · N = ' + d.N + '</div></div>'
      : '<div class="result-box invalid"><strong>Não há saída agregada válida</strong> (denominador igual a zero). Nenhum tempo é informado.</div>';
    const ref = d.valid && r.reference.valid
      ? '<p class="hint">Comparação: centroide contínuo aproximado (Δz = 0,0001 min) = ' + fmt6(r.reference.z) + ' min; diferença absoluta = ' +
        fmt6(Math.abs(d.z - r.reference.z)) + ' min. Reduzir Δz aproxima o resultado do centroide contínuo.</p>'
      : '';
    const body = '<div class="charts"><div>' + chartOutput(aggChartOpts(r, true)) + '</div></div>' + result +
      '<div class="table-wrap"><table><tbody>' +
      '<tr><th>Passo Δz</th><td class="num">' + fmt(d.dz) + ' min</td></tr>' +
      '<tr><th>Número de pontos N = 30/Δz</th><td class="num">' + d.N + '</td></tr>' +
      '<tr><th>Σ z(k)·μ(z(k))</th><td class="num">' + fmt6(d.num) + '</td></tr>' +
      '<tr><th>Σ μ(z(k))</th><td class="num">' + fmt6(d.den) + '</td></tr>' +
      '<tr><th>z* = numerador / denominador</th><td class="num">' + (d.valid ? fmt6(d.z) + ' min' : 'indefinido (sem saída válida)') + '</td></tr>' +
      '</tbody></table></div>' + ref + logHTML(r.logs.defuzzificacao);
    return card(5, 'Defuzzificação (centroide)', desc, body);
  }


  function render() {
    $('steps').innerHTML = stepFuzzification() + stepRules() + stepImplication() + stepAggregation() + stepDefuzz();
    $('stepper').textContent = state.step === 0
      ? 'Nenhuma etapa executada.'
      : (state.step === 5 ? 'Todas as 5 etapas concluídas.' : 'Etapa atual: ' + state.step + ' de 5.');
    $('btnNext').disabled = state.step >= 5;
    if (state.focusId && $(state.focusId)) { $(state.focusId).focus(); }
    state.focusId = null;
  }

  function setStatus(msg, kind) {
    const el = $('status');
    el.textContent = msg || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
  }


  function showFieldError(which, msg) {
    const input = $('input' + which), err = $('err' + which);
    err.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  function validateAll() {
    const vu = F.validateInput(state.U, F.DOMAINS.umidade);
    const vt = F.validateInput(state.T, F.DOMAINS.temperatura);
    showFieldError('U', vu.ok ? '' : vu.message);
    showFieldError('T', vt.ok ? '' : vt.message);
    const dz = Number(state.dz);
    const dzOk = F.DZ_OPTIONS.indexOf(dz) >= 0;
    const errors = [];
    if (!vu.ok) errors.push(vu.message);
    if (!vt.ok) errors.push(vt.message);
    if (!dzOk) errors.push('Passo Δz inválido: escolha 0,1; 0,05 ou 0,01 minuto.');
    const consOk = state.consequents.length === 9 && state.consequents.every(function (c) { return F.ORDER.tempo.indexOf(c) >= 0; });
    if (!consOk) errors.push('Todas as nove regras devem ter um consequente (curto, médio ou longo).');
    return { ok: errors.length === 0, errors: errors, U: vu.value, T: vt.value, dz: dz };
  }

  function compute() {
    const v = validateAll();
    if (!v.ok) {
      state.result = null; state.step = 0;
      setStatus('Cálculo bloqueado: ' + v.errors.join(' '), 'error');
      render();
      return false;
    }
    state.result = F.infer(v.U, v.T, state.consequents, v.dz);
    const firstActive = state.result.rules.findIndex(function (x) { return x.active; });
    state.selectedRule = firstActive >= 0 ? firstActive : 0;
    return true;
  }

  function invalidate() {
    const had = state.result !== null || state.step > 0;
    state.result = null;
    state.step = 0;
    if (had) setStatus('Configuração alterada: os resultados anteriores foram limpos. Clique em Calcular ou Avançar etapa.', 'info');
    render();
  }


  function buildRulesConfig() {
    let html = '';
    for (let i = 0; i < 9; i++) {
      const u = F.ORDER.umidade[Math.floor(i / 3)], t = F.ORDER.temperatura[i % 3];
      html += '<div class="rule-row"><span>R' + (i + 1) + ': solo ' + F.LABELS[u] + ' E temp. ' + F.LABELS[t] + ' →</span>' +
        '<select data-cons="' + i + '" aria-label="Consequente da regra R' + (i + 1) + '">' +
        F.ORDER.tempo.map(function (c) { return '<option value="' + c + '">' + F.LABELS[c] + '</option>'; }).join('') + '</select></div>';
    }
    $('rulesConfig').innerHTML = html;
  }

  function syncControlsFromState() {
    $('inputU').value = state.U; $('rangeU').value = state.U;
    $('inputT').value = state.T; $('rangeT').value = state.T;
    $('selectDz').value = state.dz;
    state.consequents.forEach(function (c, i) {
      document.querySelector('select[data-cons="' + i + '"]').value = c;
    });
    showFieldError('U', ''); showFieldError('T', '');
  }

  function bindInput(which, domain) {
    const text = $('input' + which), range = $('range' + which);
    text.addEventListener('input', function () {
      state[which] = text.value;
      const v = F.validateInput(text.value, domain);
      showFieldError(which, v.ok ? '' : v.message);
      if (v.ok) range.value = v.value;        
      invalidate();
    });
    range.addEventListener('input', function () {
      text.value = range.value;
      state[which] = range.value;
      showFieldError(which, '');
      invalidate();
    });
  }

  function init() {
    buildRulesConfig();
    syncControlsFromState();
    bindInput('U', F.DOMAINS.umidade);
    bindInput('T', F.DOMAINS.temperatura);

    $('selectDz').addEventListener('change', function (e) { state.dz = e.target.value; invalidate(); });
    $('rulesConfig').addEventListener('change', function (e) {
      const i = e.target.getAttribute('data-cons');
      if (i === null) return;
      state.consequents[Number(i)] = e.target.value;
      invalidate();
    });

    $('btnCalc').addEventListener('click', function () {
      if (!compute()) return;
      state.step = 5;
      setStatus('Inferência executada: as cinco etapas foram calculadas.', '');
      render();
    });
    $('btnNext').addEventListener('click', function () {
      if (state.step >= 5) return;
      if (!state.result && !compute()) return;
      state.step += 1;
      setStatus('', '');
      render();
      const el = $('step' + state.step);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    $('btnReset').addEventListener('click', function () {
      state = initialState();
      syncControlsFromState();
      setStatus('Valores padrão restaurados (entradas, regras e passo Δz); resultados limpos.', '');
      render();
    });

    $('steps').addEventListener('click', function (e) {
      const tr = e.target.closest ? e.target.closest('tr[data-rule]') : null;
      if (tr) { state.selectedRule = Number(tr.getAttribute('data-rule')); render(); }
    });
    $('steps').addEventListener('change', function (e) {
      if (e.target.id === 'viewRule') { state.selectedRule = Number(e.target.value); state.focusId = 'viewRule'; render(); }
      if (e.target.id === 'showAll') { state.showAll = e.target.checked; state.focusId = 'showAll'; render(); }
    });

    $('btnTests').addEventListener('click', function () {
      const res = window.FuzzyTests.runAll();
      const fails = res.filter(function (r) { return !r.pass; }).length;
      $('testsSummary').textContent = (res.length - fails) + ' de ' + res.length + ' testes passaram.';
      $('testsSummary').className = 'status' + (fails ? ' error' : '');
      const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
      $('testsTable').innerHTML = '<thead><tr><th>Seção</th><th>Teste</th><th>Esperado</th><th>Obtido</th><th>Resultado</th></tr></thead><tbody>' +
        res.map(function (r) {
          return '<tr class="' + (r.pass ? 'pass' : 'fail') + '"><td>' + r.id + '</td><td>' + esc(r.desc) + '</td><td>' + esc(r.expected) +
            '</td><td>' + esc(r.obtained) + '</td><td>' + (r.pass ? 'passou' : 'FALHOU') + '</td></tr>';
        }).join('') + '</tbody>';
      $('testsTable').hidden = false;
    });

    render();
  }

  init();
})();
