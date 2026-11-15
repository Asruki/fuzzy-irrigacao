
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./fuzzy.js'));
  else root.FuzzyTests = factory(root.Fuzzy);
})(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';

  const TOL_MU = 1e-6;   
  const TOL_T = 0.01;    

  function runAll() {
    const results = [];
    const near = function (a, b, t) { return Math.abs(a - b) <= t; };
    const nearArr = function (a, b, t) { return a.length === b.length && a.every(function (v, i) { return near(v, b[i], t); }); };
    const f = F.fmt, f6 = F.fmt6;
    const add = function (id, desc, expected, obtained, pass) {
      results.push({ id: id, desc: desc, expected: expected, obtained: obtained, pass: !!pass });
    };
    const base = F.DEFAULT_CONSEQUENTS;
    const tuple = function (obj, names) { return names.map(function (n) { return obj[n]; }); };
    const tU = function (U) { return tuple(F.fuzzify(U, 10).umidade, F.ORDER.umidade); };
    const tT = function (T) { return tuple(F.fuzzify(0, T).temperatura, F.ORDER.temperatura); };
    const tupleStr = function (a) { return '(' + a.map(f).join('; ') + ')'; };

    let got = tU(35);  add('6.1', 'U = 35 % → (seco; interm.; úmido)', '(0,5; 0,5; 0)', tupleStr(got), nearArr(got, [0.5, 0.5, 0], TOL_MU));
    got = tT(30);      add('6.1', 'T = 30 °C → (baixa; média; alta)', '(0; 0,5; 0,5)', tupleStr(got), nearArr(got, [0, 0.5, 0.5], TOL_MU));
    got = tU(0);       add('6.1', 'Extremo U = 0 %', '(1; 0; 0)', tupleStr(got), nearArr(got, [1, 0, 0], TOL_MU));
    got = tU(100);     add('6.1', 'Extremo U = 100 %', '(0; 0; 1)', tupleStr(got), nearArr(got, [0, 0, 1], TOL_MU));
    got = tT(10);      add('6.1', 'Extremo T = 10 °C', '(1; 0; 0)', tupleStr(got), nearArr(got, [1, 0, 0], TOL_MU));
    got = tT(40);      add('6.1', 'Extremo T = 40 °C', '(0; 0; 1)', tupleStr(got), nearArr(got, [0, 0, 1], TOL_MU));

    let sweepOk = true, count = 0;
    Object.keys(F.SETS).forEach(function (v) {
      const dom = F.DOMAINS[v];
      for (let i = 0; i <= 600; i++) {
        const x = dom.min + (dom.max - dom.min) * i / 600;
        Object.keys(F.SETS[v]).forEach(function (n) {
          const m = F.membership(x, F.SETS[v][n]);
          count++;
          if (!Number.isFinite(m) || m < 0 || m > 1) sweepOk = false;
        });
      }
    });
    add('6.1', 'Varredura dos 9 conjuntos (' + count + ' avaliações)', 'todas finitas e em [0, 1]', sweepOk ? 'todas finitas e em [0, 1]' : 'violação encontrada', sweepOk);

    function single(U, T, ruleId, expZ, desc) {
      const r = F.infer(U, T, base, 0.1);
      const only = r.activeIds.length === 1 && r.activeIds[0] === ruleId && near(r.rules[parseInt(ruleId.slice(1), 10) - 1].h, 1, TOL_MU);
      add('6.2', desc + ' — regra única', ruleId + ' com h = 1', r.activeIds.join(', ') + ' (h = ' + f(Math.max.apply(null, r.rules.map(function (x) { return x.h; }))) + ')', only);
      add('6.2', desc + ' — tempo', '≈ ' + f(expZ) + ' min', f6(r.defuzz.z) + ' min', near(r.defuzz.z, expZ, TOL_T));
    }
    single(20, 35, 'R3', 25, 'U = 20 %, T = 35 °C');
    single(50, 25, 'R5', 15, 'U = 50 %, T = 25 °C');
    single(80, 25, 'R8', 5,  'U = 80 %, T = 25 °C');

    const r63 = F.infer(35, 30, base, 0.1);
    const act = r63.rules.filter(function (x) { return x.active; });
    const expAct = { R2: 'longo', R3: 'longo', R5: 'medio', R6: 'longo' };
    const actOk = act.length === 4 && act.every(function (x) { return expAct[x.id] === x.consequent && near(x.h, 0.5, TOL_MU); });
    add('6.3', 'Regras ativadas (U = 35, T = 30)', 'R2, R3, R5, R6 com h = 0,5', act.map(function (x) { return x.id + '→' + F.LABELS[x.consequent] + ' h=' + f(x.h); }).join(', '), actOk);
    const refMu = [[0, 0], [3, 0.2], [7.5, 0.5], [15, 0.5], [30, 0.5]];
    const muGot = refMu.map(function (p) { return F.aggregate(r63.rules, p[0]); });
    add('6.3', 'Valores de μagregada(z) em z = 0; 3; 7,5; 15; 30', '(0; 0,2; 0,5; 0,5; 0,5)', tupleStr(muGot), nearArr(muGot, refMu.map(function (p) { return p[1]; }), TOL_MU));
    add('6.3', 'Tempo (Δz = 0,1)', '≈ 16,785683 min (exibe 16,79)', f6(r63.defuzz.z) + ' min (exibe ' + F.fmt2(r63.defuzz.z) + ')', near(r63.defuzz.z, 16.785683, 1e-5) && F.fmt2(r63.defuzz.z) === '16,79');
    add('6.3', 'Centroide contínuo (referência)', '16,785714 min', f6(r63.reference.z) + ' min (Δz = 0,0001)', near(r63.reference.z, 16.785714, 1e-5));

    const r64 = F.infer(35, 20, base, 0.1);
    const ids64 = ['R1', 'R2', 'R4', 'R5'];
    add('6.4', 'U = 35, T = 20: regras ativadas', 'R1, R2, R4, R5 com h = 0,5',
      r64.activeIds.join(', '), r64.activeIds.join() === ids64.join() && r64.rules.filter(function (x) { return x.active; }).every(function (x) { return near(x.h, 0.5, TOL_MU); }));
    let constant = true;
    for (let i = 0; i <= 300; i++) { if (!near(F.aggregate(r64.rules, i / 10), 0.5, TOL_MU)) constant = false; }
    add('6.4', 'Agregação constante em 0,5 em [0, 30]', 'μ(z) = 0,5 para todo z', constant ? 'μ(z) = 0,5 para todo z' : 'não constante', constant);
    add('6.4', 'Tempo (simetria)', '15,00 min', f6(r64.defuzz.z) + ' min', near(r64.defuzz.z, 15, TOL_T));

    const allShort = F.infer(50, 25, new Array(9).fill('curto'), 0.1);
    add('6.4', 'Todas as regras → curto, U = 50, T = 25', '≈ 5,00 min', f6(allShort.defuzz.z) + ' min', near(allShort.defuzz.z, 5, TOL_T));
    const restored = F.infer(F.DEFAULTS.U, F.DEFAULTS.T, F.DEFAULT_CONSEQUENTS, F.DEFAULTS.dz);
    add('6.4', 'Restaurar padrão (35 %, 30 °C, base padrão, Δz = 0,1)', '16,79 min', F.fmt2(restored.defuzz.z) + ' min', F.fmt2(restored.defuzz.z) === '16,79');

    [[0.1, 16.785683], [0.05, 16.785706], [0.01, 16.785714]].forEach(function (p) {
      const r = F.infer(35, 30, base, p[0]);
      add('6.4', 'Teste 6.3 com Δz = ' + f(p[0]), '≈ ' + f6(p[1]) + ' min',
        f6(r.defuzz.z) + ' min (erro vs. contínuo = ' + (Math.abs(r.defuzz.z - 16.785714286)).toExponential(2).replace('.', ',') + ')',
        near(r.defuzz.z, p[1], 2e-6));
    });

    const U = F.DOMAINS.umidade, T = F.DOMAINS.temperatura;
    [['U = −1 %', -1, U], ['U = 101 %', 101, U], ['T = 9 °C', 9, T], ['T = 41 °C', 41, T],
     ['campo vazio', '', U], ['somente espaços', '   ', T], ['texto "abc"', 'abc', U], ['NaN', NaN, T], ['Infinity', Infinity, U]]
      .forEach(function (c) {
        const v = F.validateInput(c[1], c[2]);
        add('6.5', 'Entrada inválida bloqueada: ' + c[0], 'ok = false', 'ok = ' + v.ok, v.ok === false);
      });
    const vv = F.validateInput('35,5', U);
    add('6.5', 'Entrada válida aceita (vírgula decimal)', 'ok = true, valor 35,5', 'ok = ' + vv.ok + ', valor ' + (vv.ok ? f(vv.value) : '—'), vv.ok && vv.value === 35.5);
    const a = JSON.stringify(F.infer(35, 30, base, 0.1)), b = JSON.stringify(F.infer(35, 30, base, 0.1));
    add('6.5', 'Determinismo (duas execuções idênticas)', 'resultados idênticos', a === b ? 'resultados idênticos' : 'diferentes', a === b);

    const none = F.defuzzify([{ h: 0, consequent: 'curto' }], 0.1);
    add('2.3', 'Denominador zero → sem saída válida', 'valid = false, z = null', 'valid = ' + none.valid + ', z = ' + none.z, none.valid === false && none.z === null);

    return results;
  }

  return { runAll: runAll };
});

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const res = module.exports.runAll();
  let fails = 0;
  res.forEach(function (r) {
    if (!r.pass) fails++;
    console.log((r.pass ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.desc + ' | esperado: ' + r.expected + ' | obtido: ' + r.obtained);
  });
  console.log('\n' + (res.length - fails) + '/' + res.length + ' testes passaram.');
  process.exit(fails ? 1 : 0);
}
