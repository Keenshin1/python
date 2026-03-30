const TOTAL = 13;
  const completed = new Set();
  let pyodide = null;
  let pyodideReady = false;

  async function initPyodide() {
    const statuses = document.querySelectorAll('.pyodide-status');
    statuses.forEach(s => { s.textContent = '● Carregando Python...'; s.className = 'pyodide-status loading'; });
    try {
      pyodide = await loadPyodide();
      pyodideReady = true;
      statuses.forEach(s => { s.textContent = '● Python pronto'; s.className = 'pyodide-status ready'; });
    } catch(e) {
      statuses.forEach(s => { s.textContent = '● Falha ao carregar Python'; s.className = 'pyodide-status'; });
    }
  }

  initPyodide();

  function goTo(idx) {
    document.querySelectorAll('.lesson').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('lesson-' + idx).classList.add('active');
    document.getElementById('nav-' + idx).classList.add('active');
    window.scrollTo(0, 0);
  }

  function completeAndNext(idx) {
    if (idx > 0 && idx <= TOTAL) completed.add(idx);
    updateProgress();
    const navItem = document.getElementById('nav-' + idx);
    if (navItem && idx > 0) navItem.classList.add('completed');
    if (idx < TOTAL) goTo(idx + 1);
    else goTo(1);
  }

  function updateProgress() {
    const pct = Math.round((completed.size / TOTAL) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').textContent = completed.size + ' / ' + TOTAL;
  }

  function countInputCalls(code) {
    const matches = code.match(/\binput\s*\(/g);
    return matches ? matches.length : 0;
  }

  function extractInputPrompts(code) {
    const regex = /input\s*\(\s*(['"])(.*?)\1\s*\)/g;
    const prompts = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
      prompts.push(match[2]);
    }
    return prompts;
  }

  function renderInputFields(codeId, inputsWrapperId) {
    const code = document.getElementById(codeId).value;
    const wrap = document.getElementById(inputsWrapperId);
    const count = countInputCalls(code);
    const prompts = extractInputPrompts(code);

    if (count === 0) { wrap.innerHTML = ''; wrap.style.display = 'none'; return; }

    wrap.style.display = 'block';
    wrap.innerHTML = '<div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Valores de entrada</div>';

    for (let i = 0; i < count; i++) {
      const label = prompts[i] || ('Entrada ' + (i + 1) + ': ');
      wrap.innerHTML += `
        <div class="input-field-row">
          <span class="input-field-label">${label}</span>
          <input class="input-field-val" type="text" id="${codeId}-inp-${i}" placeholder="valor">
        </div>`;
    }
  }

  function getInputValues(codeId, count) {
    const values = [];
    for (let i = 0; i < count; i++) {
      const el = document.getElementById(codeId + '-inp-' + i);
      values.push(el ? el.value : '');
    }
    return values;
  }

  async function runEx(codeId, outputId) {
    const code = document.getElementById(codeId).value.trim();
    const outputBox = document.getElementById(outputId);
    const content = outputBox.querySelector('.output-terminal-content');

    if (!code) {
      outputBox.classList.add('show');
      content.className = 'output-terminal-content has-error';
      content.textContent = 'Escreva seu código antes de executar.';
      return;
    }

    if (!pyodideReady) {
      outputBox.classList.add('show');
      content.className = 'output-terminal-content has-error';
      content.textContent = 'Python ainda está carregando, aguarde um momento...';
      return;
    }

    const count = countInputCalls(code);
    const values = getInputValues(codeId, count);

    const inputsLine = values.map(v => JSON.stringify(v)).join(', ');
    const wrapper = `
import sys, builtins
from io import StringIO

_inputs = [${inputsLine}]
_idx = [0]
_orig_input = builtins.input

def _fake_input(prompt=''):
    val = _inputs[_idx[0]] if _idx[0] < len(_inputs) else ''
    _idx[0] += 1
    sys.stdout.write(str(prompt) + str(val) + '\\n')
    return val

builtins.input = _fake_input
_buf = StringIO()
_old = sys.stdout
sys.stdout = _buf

try:
${code.split('\n').map(l => '    ' + l).join('\n')}
finally:
    sys.stdout = _old
    builtins.input = _orig_input

_buf.getvalue()
`;

    outputBox.classList.add('show');
    content.className = 'output-terminal-content';
    content.textContent = 'Executando...';

    try {
      const result = await pyodide.runPythonAsync(wrapper);
      content.className = 'output-terminal-content';
      content.textContent = result || '(sem saída)';
    } catch (err) {
      content.className = 'output-terminal-content has-error';
      let msg = err.message || String(err);
      msg = msg.replace(/File "<exec>", /g, '');
      msg = msg.replace(/in _fake_input[\s\S]*/g, '');
      msg = msg.replace(/in <module>[\s\S]*/g, '');
      msg = msg.trim();
      content.textContent = '❌ Erro:\n' + msg;
    }
  }

  function showSolution(solId) {
    const wrap = document.getElementById(solId);
    wrap.classList.toggle('show');
  }
