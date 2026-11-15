(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fuzzy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';


  const DOMAINS = {
    umidade:     { min: 0,  max: 100, unit: '%',   label: 'Umidade do solo' },
    temperatura: { min: 10, max: 40,  unit: '°C',  label: 'Temperatura' },
    tempo:       { min: 0,  max: 30,  unit: 'min', label: 'Tempo de irrigação' }
  };

  const SETS = {
    umidade: {
      seco:          [0, 0, 20, 50],
      intermediario: [20, 50, 50, 80],
      umido:         [50, 80, 100, 100]
    },
    temperatura: {
      baixa: [10, 10, 15, 25],
      media: [15, 25, 25, 35],
      alta:  [25, 35, 40, 40]
    },
    tempo: {
      curto: [0, 0, 0, 15],
      medio: [0, 15, 15, 30],
      longo: [15, 30, 30, 30]
    }
  };

  const LABELS = {
    seco: 'seco', intermediario: 'intermediário', umido: 'úmido',
    baixa: 'baixa', media: 'média', alta: 'alta',
    curto: 'curto', medio: 'médio', longo: 'longo'
  };
  const ORDER = {
    umidade: ['seco', 'intermediario', 'umido'],
    temperatura: ['baixa', 'media', 'alta'],
    tempo: ['curto', 'medio', 'longo']
  };

  const DEFAULT_CONSEQUENTS = [
    'medio', 'longo', 'longo',  
    'curto', 'medio', 'longo',   
    'curto', 'curto', 'curto'    
  ];

  const DEFAULTS = { U: 35, T: 30, dz: 0.1 };
  const DZ_OPTIONS = [0.1, 0.05, 0.01];

  function fmt(x) {
    return Number(x.toFixed(6)).toString().replace('.', ',');
  }
  function fmt2(x) {
    return x.toFixed(2).replace('.', ',');
  }

  function fmt6(x) {
    return x.toFixed(6).replace('.', ',');
  }

  function membership(x, params) {
    const a = params[0], b = params[1], c = params[2], d = params[3];
    if (x < a || x > d) return 0;
    if (x >= b && x <= c) return 1;
    if (x < b) return (x - a) / (b - a);
    return (d - x) / (d - c);
  }

  function parseNumber(raw) {
    if (typeof raw === 'number') return raw;
    if (raw === null || raw === undefined) return NaN;
    const s = String(raw).trim().replace(',', '.');
    if (s === '') return NaN;
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return Number(s);
  }

  function validateInput(raw, domain) {
    const empty = raw === null || raw === undefined || String(raw).trim() === '';
    if (empty) {
      return { ok: false, message: domain.label + ': o campo está vazio. Informe um valor entre ' +
        fmt(domain.min) + ' e ' + fmt(domain.max) + ' ' + domain.unit + '.' };
    }
    const v = parseNumber(raw);
    if (!Number.isFinite(v)) {
      return { ok: false, message: domain.label + ': "' + String(raw) + '" não é um número válido.' };
    }
    if (v < domain.min || v > domain.max) {
      return { ok: false, message: domain.label + ': ' + fmt(v) + ' ' + domain.unit +
        ' está fora do intervalo permitido (' + fmt(domain.min) + ' a ' + fmt(domain.max) + ' ' + domain.unit + ').' };
    }
    return { ok: true, value: v };
  }


  function fuzzifyVariable(x, varName) {
    const out = {};
    ORDER[varName].forEach(function (name) {
      out[name] = membership(x, SETS[varName][name]);
    });
    return out;
  }

  function fuzzify(U, T) {
    return { umidade: fuzzifyVariable(U, 'umidade'), temperatura: fuzzifyVariable(T, 'temperatura') };
  }

  function evaluateRules(fuzzification, consequents) {
    const rules = [];
    for (let i = 0; i < 9; i++) {
      const uSet = ORDER.umidade[Math.floor(i / 3)];
      const tSet = ORDER.temperatura[i % 3];
      const muU = fuzzification.umidade[uSet];
      const muT = fuzzification.temperatura[tSet];
      const h = Math.min(muU, muT);
      rules.push({
        id: 'R' + (i + 1), index: i, uSet: uSet, tSet: tSet,
        consequent: consequents[i], muU: muU, muT: muT, h: h, active: h > 0
      });
    }
    return rules;
  }

  function clip(rule, z) {
    return Math.min(rule.h, membership(z, SETS.tempo[rule.consequent]));
  }

  function aggregate(rules, z) {
    let m = 0;
    for (let i = 0; i < rules.length; i++) {
      if (rules[i].h <= 0) continue;          
      const v = clip(rules[i], z);
      if (v > m) m = v;
    }
    return m;
  }

  function defuzzify(rules, dz) {
    const range = DOMAINS.tempo.max - DOMAINS.tempo.min;
    const N = Math.round(range / dz);
    let num = 0, den = 0;
    for (let k = 0; k < N; k++) {
      const z = (k + 0.5) * dz;
      const mu = aggregate(rules, z);
      num += z * mu;
      den += mu;
    }
    if (den === 0) return { valid: false, N: N, dz: dz, num: num, den: den, z: null };
    return { valid: true, N: N, dz: dz, num: num, den: den, z: num / den };
  }


  const CHECK_POINTS = [0, 3, 7.5, 15, 22.5, 30]; 

  function infer(U, T, consequents, dz) {
    const fuzzification = fuzzify(U, T);
    const rules = evaluateRules(fuzzification, consequents);
    const defuzz = defuzzify(rules, dz);
    const reference = defuzzify(rules, 0.0001);
    const result = {
      U: U, T: T, dz: dz, consequents: consequents.slice(),
      fuzzification: fuzzification, rules: rules, defuzz: defuzz, reference: reference,
      activeIds: rules.filter(function (r) { return r.active; }).map(function (r) { return r.id; }),
      checkPoints: CHECK_POINTS.map(function (z) { return { z: z, mu: aggregate(rules, z) }; })
    };
    result.logs = buildLogs(result);
    return result;
  }

  function buildLogs(r) {
    const fz = r.fuzzification;
    const logs = { fuzzificacao: [], regras: [], implicacao: [], agregacao: [], defuzzificacao: [] };

    logs.fuzzificacao.push('Umidade U = ' + fmt(r.U) + ' %: ' + ORDER.umidade.map(function (n) {
      return LABELS[n] + ' = ' + fmt(fz.umidade[n]);
    }).join('; ') + '.');
    logs.fuzzificacao.push('Temperatura T = ' + fmt(r.T) + ' °C: ' + ORDER.temperatura.map(function (n) {
      return LABELS[n] + ' = ' + fmt(fz.temperatura[n]);
    }).join('; ') + '.');

    r.rules.forEach(function (ru) {
      logs.regras.push(ru.id + ': min(μ' + LABELS[ru.uSet] + ' = ' + fmt(ru.muU) + '; μ' + LABELS[ru.tSet] + ' = ' +
        fmt(ru.muT) + ') = ' + fmt(ru.h) + (ru.active ? ' → ativada.' : ' → ativação zero.'));
      if (ru.active) {
        logs.implicacao.push(ru.id + ': min(' + fmt(ru.muU) + '; ' + fmt(ru.muT) + ') = ' + fmt(ru.h) +
          '; consequente ' + LABELS[ru.consequent] + ' recortado em ' + fmt(ru.h) + '.');
      } else {
        logs.implicacao.push(ru.id + ': ativação 0; não contribui para a saída.');
      }
    });

    if (r.activeIds.length) {
      logs.agregacao.push('Agregação: máximo entre os conjuntos recortados das regras ativadas (' +
        r.activeIds.join(', ') + ').');
      logs.agregacao.push('As áreas não são somadas: regras que concluem o mesmo conjunto não elevam a altura acima de h.');
      logs.agregacao.push('Conferência: ' + r.checkPoints.map(function (p) {
        return 'μ(' + fmt(p.z) + ') = ' + fmt(p.mu);
      }).join('; ') + '.');
    } else {
      logs.agregacao.push('Nenhuma regra ativada: a saída agregada é nula em todo o intervalo.');
    }

    const d = r.defuzz;
    logs.defuzzificacao.push('Pontos médios: Δz = ' + fmt(d.dz) + ' min; N = ' + d.N + '; z(k) = (k + 0,5)·Δz, k = 0…' + (d.N - 1) + '.');
    logs.defuzzificacao.push('Σ z(k)·μ(z(k)) = ' + fmt6(d.num) + '; Σ μ(z(k)) = ' + fmt6(d.den) + '.');
    if (d.valid) {
      logs.defuzzificacao.push('Centroide: ' + fmt2(d.z) + ' min (valor interno ' + fmt6(d.z) + ').');
    } else {
      logs.defuzzificacao.push('Denominador zero: não há saída agregada válida.');
    }
    return logs;
  }

  return {
    DOMAINS: DOMAINS, SETS: SETS, LABELS: LABELS, ORDER: ORDER,
    DEFAULT_CONSEQUENTS: DEFAULT_CONSEQUENTS, DEFAULTS: DEFAULTS, DZ_OPTIONS: DZ_OPTIONS,
    fmt: fmt, fmt2: fmt2, fmt6: fmt6,
    membership: membership, parseNumber: parseNumber, validateInput: validateInput,
    fuzzify: fuzzify, evaluateRules: evaluateRules, clip: clip, aggregate: aggregate,
    defuzzify: defuzzify, infer: infer
  };
});
