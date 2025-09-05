  const CharSel = document.getElementById('AISelectChar')
      
      CharSel.addEventListener('change', function() {
  localStorage.setItem('CharSel', this.value);
 
});

// Optional: To load the saved selection when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const savedChar = localStorage.getItem('CharSel');
  if (savedChar) {
    CharSel.value = savedChar;
   
  }
});
      
      
      const selector = document.getElementById('sizeSelector');
      const ytplayer = document.getElementById('ytplayer');
      const controls = document.querySelectorAll(
        '#playerContainer input, #playerContainer button, #playerContainer select',
      );

      // Load saved size if available
      const savedSize = localStorage.getItem('playerSize');
      if (savedSize) {
        selector.value = savedSize;
        const [w, h] = savedSize.split('x');
        ytplayer.width = w;
        ytplayer.height = h;
        controls.forEach((el) => {
          el.style.width = w + 'px';
        });
      }

      // Save size when changed
      selector.addEventListener('change', function () {
        const [w, h] = this.value.split('x');
        ytplayer.width = w;

        ytplayer.height = h;
        controls.forEach((el) => {
          el.style.width = w + 'px';
        });

        localStorage.setItem('playerSize', this.value);
      });

      function loadVideo() {
        const url = document.getElementById('videoUrl').value;
        const videoId = url.split('v=')[1]?.split('&')[0];
        if (videoId) {
          document.getElementById('ytplayer').src =
            `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`;
        }
      }

      document.getElementById('toggleBtn').addEventListener('click', () => {
        const wrapper = document.getElementById('playerWrapper');
        wrapper.classList.toggle('open');
      });

      // ---------- Utilities ----------
      const debounce = (fn, ms = 400) => {
        let t;
        return (...args) => {
          clearTimeout(t);
          t = setTimeout(() => fn(...args), ms);
        };
      };
      const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
      const isHtml = (n) => ['html', 'htm'].includes(extOf(n));
      const isCss = (n) => extOf(n) === 'css';
      const isJs = (n) => extOf(n) === 'js';
      const guessMode = (name) =>
        isHtml(name)
          ? 'htmlmixed'
          : isCss(name)
            ? 'css'
            : isJs(name)
              ? 'javascript'
              : 'htmlmixed';
      const dotClass = (name) =>
        isHtml(name) ? 'html' : isCss(name) ? 'css' : isJs(name) ? 'js' : '';

      const mimeFor = (filename) => {
        const e = extOf(filename);
        if (e === 'html' || e === 'htm') return 'text/html';
        if (e === 'css') return 'text/css';
        if (e === 'js') return 'text/javascript';
        if (e === 'json') return 'application/json';
        if (e === 'svg') return 'image/svg+xml';
        return 'text/plain';
      };

      function insertBeforeCloseTag(html, tag, insertion) {
        const re = new RegExp(`</${tag}\\s*>`, 'i');
        if (re.test(html)) return html.replace(re, `${insertion}\n</${tag}>`);
        return html + '\n' + insertion;
      }

      // ---------- State ----------
      let files = [
        {
          id: crypto.randomUUID(),
          name: 'index.html',
          mode: 'htmlmixed',
          content: `<main class="wrap">
  <h1>Hello, Web IDE 👋</h1>
  <p>Edit index.html, style.css, and script.js — changes live preview.</p>
  <button id="clickme">Click me</button>
</main>`,
        },
        {
          id: crypto.randomUUID(),
          name: 'style.css',
          mode: 'css',
          content: `:root { --c:#4aa8ff; --b:#0b0f14; --t:#e6eef5; }
body { font-family: system-ui, sans-serif; color: var(--t); background: var(--b); }
.wrap { max-width: 680px; margin: 48px auto; padding: 0 16px; }
h1 { color: var(--c); font-size: 2.2rem; } button { padding: 10px 14px; border-radius: 8px; }`,
        },
        {
          id: crypto.randomUUID(),
          name: 'script.js',
          mode: 'javascript',
          content: `document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("clickme");
  btn?.addEventListener("click", () => alert("It works! 🎉"));
});`,
        },
      ];
      let currentId = files[0].id;

      // ---------- UI: Tabs ----------
      const tabsEl = document.getElementById('tabs');
      function renderTabs() {
        tabsEl.innerHTML = '';
        files.forEach((f) => {
          const el = document.createElement('div');
          el.className = 'tab' + (f.id === currentId ? ' active' : '');
          const dot = document.createElement('span');
          dot.className = 'dot ' + dotClass(f.name);
          const name = document.createElement('span');
          name.className = 'name';
          name.textContent = f.name;

          const close = document.createElement('button');
          close.className = 'close';
          close.type = 'button';
          close.title = 'Close tab';
          close.textContent = '×';
          close.onclick = (e) => {
            e.stopPropagation();
            removeTab(f.id);
          };

          el.appendChild(dot);
          el.appendChild(name);
          el.appendChild(close);

          el.onclick = () => switchTo(f.id);
          tabsEl.appendChild(el);
        });
        // Add quick-add chip
        const addChip = document.createElement('div');
        addChip.className = 'tab';
        addChip.textContent = '+';
        addChip.title = 'Add tab';
        addChip.onclick = () => addTab();
        tabsEl.appendChild(addChip);
      }

      // ---------- Editor (CodeMirror) ----------
      const editorEl = document.getElementById('editor');

      const cm = CodeMirror.fromTextArea(editorEl, {
        mode: guessMode(getCurrent().name),
        theme: localStorage.getItem('editorTheme') || 'material-darker',
        lineNumbers: true,
        lineWrapping: false,
        tabSize: 2,
        indentUnit: 2,
        autoCloseBrackets: true,
        autoCloseTags: true,
        matchBrackets: true,
        extraKeys: {
          'Ctrl-Space': 'autocomplete',
          'Cmd-Space': 'autocomplete',
          'Ctrl-F': function () {
            toggleToolbar(true);
          },
          'Cmd-F': function () {
            toggleToolbar(true);
          },
          Tab: function (cm) {
            if (cm.somethingSelected()) cm.indentSelection('add');
            else cm.replaceSelection('  ', 'end');
          },
        },
      });

      // ✅ Now you can get the wrapper and attach your listener
      const wrapper = cm.getWrapperElement();

      wrapper.addEventListener('keydown', function (e) {
        const isMac = /Mac/.test(navigator.platform);
        if (
          (isMac && e.metaKey && e.key === 'f') ||
          (!isMac && e.ctrlKey && e.key === 'f')
        ) {
          e.preventDefault(); // stop browser find
          e.stopPropagation();
          toggleToolbar(true); // show your custom find/replace UI
        }
      });

      function getCurrent() {
        return files.find((f) => f.id === currentId);
      }
      function setModeByName(name) {
        cm.setOption('mode', guessMode(name));
      }

      cm.on(
        'change',
        debounce(() => {
          const cur = getCurrent();
          if (!cur) return;
          cur.content = cm.getValue();
          updatePreview();
        }, 250),
      );

      cm.on('inputRead', function (editor, change) {
        const triggers = ['<', '/', ' ', '.', ':', '"', "'", '='];
        if (
          change.text.some(
            (t) => t && (/[A-Za-z0-9]$/.test(t) || triggers.includes(t)),
          )
        ) {
          CodeMirror.commands.autocomplete(editor, null, {
            completeSingle: false,
          });
        }
      });

      // ---------- Actions ----------
      function switchTo(id) {
        const cur = getCurrent();
        if (cur) cur.content = cm.getValue();

        currentId = id;
        const next = getCurrent();
        setModeByName(next.name);
        cm.setValue(next.content);
        renderTabs();
      }

      function suggestNewName() {
        const base = 'untitled';
        const ext = '.html';
        let i = 1;
        while (files.some((f) => f.name.toLowerCase() === `${base}${i}${ext}`))
          i++;
        return `${base}${i}${ext}`;
      }

      function addTab() {
        const name = (
          prompt(
            'New file name (e.g., new.html, styles.css, app.js):',
            suggestNewName(),
          ) || ''
        ).trim();
        if (!name) return;
        const f = {
          id: crypto.randomUUID(),
          name,
          mode: guessMode(name),
          content: '',
        };
        files.push(f);
        currentId = f.id;
        setModeByName(name);
        cm.setValue('');
        renderTabs();
        updatePreview();
      }

      function renameTab() {
        const cur = getCurrent();
        if (!cur) return;
        const newName = (prompt('Rename file:', cur.name) || '').trim();
        if (!newName) return;
        cur.name = newName;
        cur.mode = guessMode(newName);
        setModeByName(newName);
        renderTabs();
        updatePreview();
      }

      function removeTab(id = currentId) {
        if (files.length <= 1) {
          alert('You must have at least one file open.');
          return;
        }
        const idx = files.findIndex((f) => f.id === id);
        if (idx === -1) return;
        const f = files[idx];

        if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;

        if (id === currentId) {
          const cur = getCurrent();
          if (cur) cur.content = cm.getValue();
        }

        files.splice(idx, 1);

        if (id === currentId) {
          const next = files[Math.max(0, idx - 1)] || files[0];
          currentId = next.id;
          setModeByName(next.name);
          cm.setValue(next.content);
        }
        renderTabs();
        updatePreview();
      }

      // ---------- Preview ----------
      const iframe = document.getElementById('preview');

      function buildPreviewHtml() {
        const htmlFiles = files.filter((f) => isHtml(f.name));
        const cssFiles = files.filter((f) => isCss(f.name));
        const jsFiles = files.filter((f) => isJs(f.name));

        const mainHtml = (htmlFiles[0]?.content || '').trim();
        const css = cssFiles.map((f) => f.content || '').join('\n\n');
        const js = jsFiles.map((f) => f.content || '').join('\n\n');

        const looksFull = /<!doctype|<html|<head|<body/i.test(mainHtml);

        if (!mainHtml && !css && !js) {
          return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:24px}</style></head>
<body><h2>Start typing in index.html, style.css, or script.js</h2></body></html>`;
        }

        if (!looksFull) {
          return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>${css}</style>
</head>
<body>
${mainHtml || ''}
<script>${js}<\/script>
</body></html>`;
        }

        let doc = mainHtml;
        if (css.trim()) {
          const styleTag = `\n<style>\n${css}\n</style>\n`;
          doc = insertBeforeCloseTag(doc, 'head', styleTag);
        }
        if (js.trim()) {
          const scriptTag = `\n<script>\n${js}\n<\/script>\n`;
          doc = insertBeforeCloseTag(doc, 'body', scriptTag);
        }
        return doc;
      }

      const updatePreview = debounce(() => {
        iframe.srcdoc = buildPreviewHtml();
      }, 50);

      // ---------- Download modal logic ----------
      const modal = document.getElementById('downloadModal');
      const fileListEl = document.getElementById('fileList');
      const toggleAllEl = document.getElementById('toggleAll');
      const selCountEl = document.getElementById('selCount');

      function openDownloadModal() {
        // Persist current buffer before opening
        const cur = getCurrent();
        if (cur) cur.content = cm.getValue();

        fileListEl.innerHTML = '';
        files.forEach((f) => {
          const row = document.createElement('label');
          row.className = 'file-item';
          const dot = document.createElement('span');
          dot.className = 'dot ' + dotClass(f.name);
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = true;
          cb.dataset.fid = f.id;
          cb.addEventListener('change', updateSelectedCount);
          const name = document.createElement('span');
          name.textContent = f.name;
          row.appendChild(dot);
          row.appendChild(cb);
          row.appendChild(name);
          fileListEl.appendChild(row);
        });
        toggleAllEl.checked = true;
        updateSelectedCount();
        modal.style.display = 'flex';
        modal.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modal.style.opacity = '0'; // start invisible
        setTimeout(() => {
          modal.style.opacity = '1'; // Reset to default color
        }, 1);
        // focus first checkbox if any
        const first = fileListEl.querySelector('input[type=checkbox]');
        setTimeout(() => first?.focus(), 0);
      }

      function closeDownloadModal() {
        modal.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modal.style.opacity = '1'; // start invisible
        setTimeout(() => {
          modal.style.opacity = '0'; // Reset to default color
        }, 1);
        setTimeout(() => {
          modal.style.display = 'none';
        }, 200);
      }

      function updateSelectedCount() {
        const total = fileListEl.querySelectorAll(
          'input[type="checkbox"]',
        ).length;
        const selected = fileListEl.querySelectorAll(
          'input[type="checkbox"]:checked',
        ).length;
        selCountEl.textContent = `(${selected} selected)`;
        toggleAllEl.indeterminate = selected > 0 && selected < total;
        toggleAllEl.checked = selected === total;
      }

      toggleAllEl.addEventListener('change', () => {
        const v = toggleAllEl.checked;
        fileListEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = v;
        });
        updateSelectedCount();
      });

      async function performDownload() {
        const checked = Array.from(
          fileListEl.querySelectorAll('input[type="checkbox"]:checked'),
        );
        if (checked.length === 0) {
          alert('No files selected.');
          return;
        }
        const selectedFiles = checked
          .map((cb) => files.find((f) => f.id === cb.dataset.fid))
          .filter(Boolean);

        if (selectedFiles.length === 1) {
          const f = selectedFiles[0];
          const blob = new Blob([f.content || ''], { type: mimeFor(f.name) });
          saveAs(blob, f.name);
        } else {
          const zip = new JSZip();
          selectedFiles.forEach((f) => zip.file(f.name, f.content || ''));
          const blob = await zip.generateAsync({ type: 'blob' });
          saveAs(blob, 'project.zip');
        }
        closeDownloadModal();
      }

      // Close modal on backdrop click or Esc
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDownloadModal();
      });
      window.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex' && e.key === 'Escape')
          closeDownloadModal();
      });

      // Open modal
      document.getElementById('combineFilesBtn').onclick = () => {
        // Populate lists
        const htmlSel = document.getElementById('targetHtml');
        const cssList = document.getElementById('cssList');
        const jsList = document.getElementById('jsList');
        htmlSel.innerHTML = '';
        cssList.innerHTML = '';
        jsList.innerHTML = '';
        files.forEach((f) => {
          if (isHtml(f.name))
            htmlSel.innerHTML += `<option value="${f.id}">${f.name}</option>`;
          if (isCss(f.name))
            cssList.innerHTML += `<label><input type="checkbox" value="${f.id}" checked> ${f.name}</label><br>`;
          if (isJs(f.name))
            jsList.innerHTML += `<label><input type="checkbox" value="${f.id}" checked> ${f.name}</label><br>`;
        });

        document.getElementById('combineModal').style.display = 'flex';
        document.getElementById('combineModal').style.transition =
          'opacity 0.2s ease-in-out'; // smooth fade
        document.getElementById('combineModal').style.opacity = '0'; // start invisible
        setTimeout(() => {
          document.getElementById('combineModal').style.opacity = '1'; // Reset to default color
        }, 1);
      };

      document.getElementById('cancelCombine').onclick = () => {
        CloseCFmodal();
      };

      document.getElementById('confirmCombine').onclick = () => {
        const htmlId = document.getElementById('targetHtml').value;
        const target = files.find((f) => f.id === htmlId);
        const cssIds = Array.from(
          document.querySelectorAll('#cssList input:checked'),
        ).map((cb) => cb.value);
        const jsIds = Array.from(
          document.querySelectorAll('#jsList input:checked'),
        ).map((cb) => cb.value);

        const cssContent = cssIds
          .map((id) => files.find((f) => f.id === id)?.content || '')
          .join('\n\n');
        const jsContent = jsIds
          .map((id) => files.find((f) => f.id === id)?.content || '')
          .join('\n\n');

        // Merge into HTML
        let html = target.content;
        html = insertBeforeCloseTag(
          html,
          'head',
          `<style>\n${cssContent}\n</style>`,
        );
        html = insertBeforeCloseTag(
          html,
          'body',
          `<script>\n${jsContent}\n<\/script>`,
        );
        target.content = html;

        // 🔹 If we're viewing the target file, update CodeMirror instantly
        if (target.id === currentId) {
          cm.setValue(html);
        }

        // Remove merged CSS + JS files
        const idsToRemove = [...cssIds, ...jsIds];
        files = files.filter((f) => !idsToRemove.includes(f.id));

        // If current tab got deleted, switch to target
        if (!files.find((f) => f.id === currentId)) {
          currentId = target.id;
          setModeByName(target.name);
          cm.setValue(target.content);
        }

        renderTabs();
        updatePreview();
        CloseCFmodal();
      };

      function CloseCFmodal() {
        document.getElementById('combineModal').style.transition =
          'opacity 0.2s ease-in-out'; // smooth fade
        document.getElementById('combineModal').style.opacity = '1'; // start invisible
        setTimeout(() => {
          document.getElementById('combineModal').style.opacity = '0'; // Reset to default color
        }, 1);
        setTimeout(() => {
          document.getElementById('combineModal').style.display = 'none';
        }, 200);
      }

      window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('combineModal')) {
          CloseCFmodal();
        }
      });
      // Open file picker when button clicked
      document.getElementById('importBtn').onclick = () => {
        document.getElementById('fileInput').click();
      };

      document
        .getElementById('fileInput')
        .addEventListener('change', function () {
          const file = this.files[0];
          if (!file) return;

          const ext = file.name.split('.').pop().toLowerCase();

          if (ext === 'zip') {
            // Handle ZIP files
            const reader = new FileReader();
            reader.onload = async function (e) {
              try {
                const zip = await JSZip.loadAsync(e.target.result);
                for (const [filename, entry] of Object.entries(zip.files)) {
                  if (!entry.dir) {
                    const content = await entry.async('string');

                    // Guess mode
                    let mode = 'htmlmixed';
                    const fext = filename.split('.').pop().toLowerCase();
                    if (fext === 'css') mode = 'css';
                    else if (fext === 'js') mode = 'javascript';
                    else if (fext === 'json') mode = 'javascript'; // treat as JS for editing

                    const newId = Date.now().toString() + filename;
                    files.push({ id: newId, name: filename, content, mode });

                    // Set the last loaded file active
                    currentId = newId;
                    setModeByName(filename);
                    cm.setValue(content);
                  }
                }
                renderTabs();
                updatePreview();
              } catch (err) {
                console.error('Failed to unzip:', err);
              }
            };
            reader.readAsArrayBuffer(file);
          } else {
            // Normal text/JSON files
            const reader = new FileReader();
            reader.onload = function (e) {
              let content = e.target.result;

              let mode = 'htmlmixed';
              if (ext === 'css') mode = 'css';
              else if (ext === 'js') mode = 'javascript';
              else if (ext === 'json') {
                mode = 'javascript';
                try {
                  // Pretty-print JSON
                  content = JSON.stringify(JSON.parse(content), null, 2);
                } catch (err) {
                  console.warn('Invalid JSON, loading raw:', err);
                }
              }

              const newId = Date.now().toString();
              files.push({ id: newId, name: file.name, content, mode });

              currentId = newId;
              setModeByName(file.name);
              cm.setValue(content);

              renderTabs();
              updatePreview();
            };
            reader.readAsText(file);
          }
        });

      // ---------- Init ----------
      function init() {
        renderTabs();
        const cur = getCurrent();
        setModeByName(cur.name);
        cm.setValue(cur.content);
        updatePreview();
      }
      init();

      // ---------- Events ----------

   

      // Show the color picker
      const modalc = document.getElementById('colorModal');
      const colorInput = document.getElementById('modalColorInput');
      const btnOpenc = document.getElementById('colorPickerBtn');
      const btnCancelc = document.getElementById('colorCancel');
      const btnOkc = document.getElementById('colorOk');

      btnOpenc.addEventListener('click', () => {
        modalc.style.display = 'flex';

        modalc.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modalc.style.opacity = '0'; // start invisible
        setTimeout(() => {
          modalc.style.opacity = '1'; // Reset to default color
        }, 1);
      });

      btnCancelc.addEventListener('click', () => {
        closeCmodal();
      });

      btnOkc.addEventListener('click', () => {
        const pickedHex = colorInput.value; // #RRGGBB format
        console.log('Picked color:', pickedHex);

        // Insert at CodeMirror cursor position
        if (typeof cm !== 'undefined' && cm.replaceSelection) {
          cm.replaceSelection(pickedHex);
        }

        closeCmodal();
      });

      function closeCmodal() {
        modalc.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modalc.style.opacity = '1'; // start invisible
        setTimeout(() => {
          modalc.style.opacity = '0'; // Reset to default color
        }, 1);
        setTimeout(() => {
          modalc.style.display = 'none';
        }, 200);
      }
      // Close when clicking overlay
      window.addEventListener('click', (e) => {
        if (e.target === modalc) {
          closeCmodal();
        }
      });

      // Show the settings
      const modalset = document.getElementById('setModal');
      const btnOpenset = document.getElementById('settingsBtn');
      const btnCloseSet = document.getElementById('setClose');
      const themeSelect = document.getElementById('themeSelect');
      const themeSelect2 = document.getElementById('themeSelect2');
      const savedTheme = localStorage.getItem('theme');

      btnOpenset.addEventListener('click', () => {
        themeSelect.value = cm.getOption('theme');
        modalset.style.display = 'flex';

        modalset.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modalset.style.opacity = '0'; // start invisible
        setTimeout(() => {
          modalset.style.opacity = '1'; // Reset to default color
        }, 1);
      });

      btnCloseSet.addEventListener('click', () => {
        saveAndCloseModal();
      });

      // Save + close on overlay click
      window.addEventListener('click', (e) => {
        if (e.target === modalset) {
          saveAndCloseModal();
        }
      });

      if (savedTheme) {
        document.body.classList.add(savedTheme);
        themeSelect2.value = savedTheme;
      }

      themeSelect2.addEventListener('change', () => {
        document.body.className = ''; // reset
        if (themeSelect2.value !== 'default') {
          document.body.classList.add(themeSelect2.value);
        }
        localStorage.setItem('theme', themeSelect2.value);
      });

      themeSelect.addEventListener('change', () => {
        const theme = themeSelect.value;
        cm.setOption('theme', theme);
        localStorage.setItem('editorTheme', theme);
      });

      function saveAndCloseModal() {
        // Save theme

        // Close with fade
        modalset.style.transition = 'opacity 0.2s ease-in-out';
        modalset.style.opacity = '1';
        setTimeout(() => {
          modalset.style.opacity = '0';
        }, 1);
        setTimeout(() => {
          modalset.style.display = 'none';
        }, 200);
      }

      // Show the color picker
      const modala = document.getElementById('AIModal');
      const btnC = document.getElementById('Close');
      const btnOpen2 = document.getElementById('btnOpenC');

      btnOpen2.addEventListener('click', () => {
        modala.style.display = 'flex';

        modala.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modala.style.opacity = '0'; // start invisible
        setTimeout(() => {
          modala.style.opacity = '1'; // Reset to default color
        }, 1);
      });

      btnC.addEventListener('click', () => {
        closeAImodal();
      });

      function closeAImodal() {
        modala.style.transition = 'opacity 0.2s ease-in-out'; // smooth fade
        modala.style.opacity = '1'; // start invisible
        setTimeout(() => {
          modala.style.opacity = '0'; // Reset to default color
        }, 1);
        setTimeout(() => {
          modala.style.display = 'none';
        }, 200);
      }
      // Close when clicking overlay
      window.addEventListener('click', (e) => {
        if (e.target === modala) {
          closeAImodal();
        }
      });

      document.getElementById('addTabBtn').addEventListener('click', addTab);
      document
        .getElementById('renameTabBtn')
        .addEventListener('click', renameTab);
      document
        .getElementById('removeTabBtn')
        .addEventListener('click', () => removeTab());

      document
        .getElementById('formatBtn')
        .addEventListener('click', async () => {
          const code = cm.getValue();
          const mode = cm.getOption('mode'); // javascript, htmlmixed, css, etc.

          try {
            let parser;
            if (mode === 'javascript' || mode === 'jsx') parser = 'babel';
            else if (mode === 'css') parser = 'css';
            else if (mode === 'htmlmixed' || mode === 'html') parser = 'html';
            else parser = 'babel'; // fallback

            const formatted = await prettier.format(code, {
              parser: parser,
              plugins: prettierPlugins, // all loaded plugins
              semi: true,
              singleQuote: true,
            });

            cm.setValue(formatted);
          } catch (e) {
            console.error('Prettier formatting error:', e);
          }
        });

      document
        .getElementById('downloadBtn')
        .addEventListener('click', openDownloadModal);
      document.getElementById('runBtn').addEventListener('click', () => {
        const cur = getCurrent();
        if (cur) cur.content = cm.getValue();
        updatePreview();
      });

      document
        .getElementById('cancelDownload')
        .addEventListener('click', closeDownloadModal);
      document
        .getElementById('confirmDownload')
        .addEventListener('click', performDownload);

      // Save active buffer on unload
      window.addEventListener('beforeunload', () => {
        const cur = getCurrent();
        if (cur) cur.content = cm.getValue();
      });

      // At the end of your script, in the Events section, add:
      document
        .getElementById('togglePreviewBtn')
        .addEventListener('click', () => {
          document.body.classList.toggle('preview-hidden');
        });

      const AISelect = document.getElementById('AISelect');
      // Declare MODEL in a higher scope so it’s accessible everywhere

      let MODEL = localStorage.getItem('MODEL') || AISelect.value;

      // Load saved value on page load
      AISelect.value = MODEL;

      // Listen for changes and save them
      AISelect.addEventListener('change', () => {
         
          MODEL = AISelect.value;
        
        localStorage.setItem('MODEL', MODEL);
      });

      

      const chatEl = document.getElementById('chat');
      const inputEl = document.getElementById('input');
      const sendBtn = document.getElementById('send');

      const clearBtn = document.getElementById('clearBtn');
      clearBtn.onclick = () => {
        sessionHistory = [];
        chatEl.innerHTML = '';

        // Add temporary "cleared" message
        const tempMsg = document.createElement('div');
        tempMsg.className = 'msg bot';
        tempMsg.textContent = 'Chat cleared.';
        chatEl.appendChild(tempMsg);

        // Remove it after 1.5 seconds
        setTimeout(() => {
          if (tempMsg.parentNode) {
            tempMsg.remove();
          }
        }, 500);
      };

      function addMsg(sender, text, isMarkdown = false) {
        const chatEl = document.getElementById('chat');
        const msg = document.createElement('div');
        msg.className = 'msg ' + sender;

        if (isMarkdown) {
          // Parse markdown
          msg.innerHTML = marked.parse(text);

          // Highlight any code blocks
          msg.querySelectorAll('pre code').forEach((block) => {
            Prism.highlightElement(block);
          });
        } else {
          msg.textContent = text;
        }

        chatEl.appendChild(msg);
        chatEl.scrollTop = chatEl.scrollHeight;
      }

      function createTypingBubble() {
        const msg = document.createElement('div');
        msg.className = 'msg bot';

        // Add spinner HTML
        msg.innerHTML = `
    <div class="typing-loader"></div>
  `;

        chatEl.appendChild(msg);
        chatEl.scrollTop = chatEl.scrollHeight;

        // no JS animation interval needed
        return {
          msg,
          interval: null, // kept for compatibility with your code
        };
      }

      // ---------- Memory helpers ----------
      const MEMORY_KEY = 'AI_memories_v1'; // localStorage key
      let sessionHistory = []; // in-memory list of {role: 'user'|'bot', text: '...'}

      // load persistent memories (array of strings)
      function loadMemories() {
        try {
          const raw = localStorage.getItem(MEMORY_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          console.warn('Could not read memories:', e);
          return [];
        }
      }

      function saveMemories(arr) {
        try {
          localStorage.setItem(MEMORY_KEY, JSON.stringify(arr));
        } catch (e) {
          console.warn('Could not save memories:', e);
        }
      }

      function addPersistentMemory(text) {
        const mem = loadMemories();
        mem.push(text);
        // dedupe simple
        const uniq = [...new Set(mem)];
        saveMemories(uniq);
      }

      // build the prompt text by including a short memory header + recent convo
      function buildPromptWithMemory(userMessage) {
        let baseInstruction = '';
        const persistent = loadMemories();
        // include up to last 6 session messages
        const recent = sessionHistory
          .slice(-12) // get last N turns
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n');

        // put memories in a compact list
        const memText = persistent.length
          ? 'Persistent memories (do not reveal as system messages):\n- ' +
            persistent.join('\n- ')
          : 'Persistent memories: (none)';
        if (document.getElementById('AISelectChar').value === 'astra') {
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Astra, a Chill Upbeat And Friendly Female roleplay and coding character:\n';
        } else if (document.getElementById('AISelectChar').value === 'miles') {
          // base instruction you already use (keeps inline code rule)
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Miles, a Nonchalant Gangter Dude roleplay and coding character:\n';
        } else if (document.getElementById('AISelectChar').value === 'scepter') {
          // base instruction you already use (keeps inline code rule)
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Scepter, a Royal And Elegant Queen roleplay and coding character:\n';
        } else if (document.getElementById('AISelectChar').value === 'mango') {
          // base instruction you already use (keeps inline code rule)
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Mango, a Dude Who talks in brainrot and memes, roleplay and coding character:\n';
        } else if (document.getElementById('AISelectChar').value === 'crimson') {
          // base instruction you already use (keeps inline code rule)
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Crimson, a Angry dude who gets mad and annoyed roleplay and coding character:\n';
        } else if (document.getElementById('AISelectChar').value === 'witan') {
          // base instruction you already use (keeps inline code rule)
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Witan, a Ye olden english roleplay and coding character:\n';
        } else if (document.getElementById('AISelectChar').value === 'alek') {
          // base instruction you already use (keeps inline code rule)
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks.eded. If message is not about code continue as normal. You are Alek, a super dramatic and depressed roleplay and coding character:\n';
        } else {
          baseInstruction =
            'Code you provide is for html, css and javascript. When you provide inline code it MUST be wrapped in triple backticks. If coding provide simple but still in depth awnsers while explaining but if not coding go for as long as needed, and include an example for usage of any code you provide.   If message is not about code continue as normal:\n';
        }
        // Compose final prompt. Trim if too long (simple char-based trimming)
        let prompt = `${baseInstruction}${memText}\n\nRecent conversation:\n${recent}\n\nUser: ${userMessage}\nAssistant:`;

        // crude trim to ~6000 chars for safety (adjust as needed)
        const MAX_CHARS = 6000;
        if (prompt.length > MAX_CHARS) {
          // drop older session history to fit
          const parts = prompt.split('\n');
          // remove lines from the top until short enough (avoid removing the memories)
          while (prompt.length > MAX_CHARS && parts.length > 50) {
            parts.splice(6, 1); // remove a line inside "Recent conversation"
            prompt = parts.join('\n');
          }
          if (prompt.length > MAX_CHARS) prompt = prompt.slice(-MAX_CHARS); // last resort
        }

        return prompt;
      }

      // ---------- Updated sendMessage ----------
      async function sendMessage(text) {
        // Check for remember command
        const rememberTrigger = (() => {
          const t = text.trim();
          if (t.toLowerCase().startsWith('remember:')) return t.slice(9).trim();
          if (t.toLowerCase().startsWith('/remember '))
            return t.slice(10).trim();
          return null;
        })();

        if (rememberTrigger) {
          addPersistentMemory(rememberTrigger);
          addMsg('user', text);
          addMsg('bot', `Saved memory: "${rememberTrigger}"`);
          sessionHistory.push({ role: 'user', text });
          sessionHistory.push({
            role: 'bot',
            text: `Saved memory: "${rememberTrigger}"`,
          });
          inputEl.value = '';
          return;
        }

        addMsg('user', text);
        inputEl.value = '';
        sendBtn.disabled = true;
        const { msg: typingMsg, interval } = createTypingBubble();

        // Build prompt including memory and recent convo
        const prompt = buildPromptWithMemory(text);
        sessionHistory.push({ role: 'user', text });

      try {
  let botReply = "No response";

  if (MODEL.toLowerCase().includes("gemini")) {
    // Call your Replit backend instead of Google's API directly
    const res = await fetch("https://e12b448d-90b0-4fd8-a646-43ee1e006d53-00-1zc8qsbvepsyg.worf.replit.dev/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        model: MODEL, // e.g., "gemini-1.5-flash" or "gemini-1.5-pro"
      }),
    });

    const data = await res.json();

    // Try to extract the main text response
    const candidate = data?.candidates?.[0] || {};
    botReply =
      candidate.content?.parts?.[0]?.text ||
      candidate.output ||
      data.text ||
      "No response";
  }

          // Stop typing animation
          clearInterval(interval);
          typingMsg.remove();

          // Fancy button animation
          const buttontell = document.getElementById('btnOpenC');
          buttontell.style.background = `
      linear-gradient(to left, blue, transparent),
      linear-gradient(to top, red, transparent),
      linear-gradient(to right, yellow, transparent),
      linear-gradient(to bottom, green, transparent)
    `;
          buttontell.style.backgroundBlendMode = 'screen';
          buttontell.style.transition = 'opacity 1s ease-in';
          buttontell.style.opacity = '0';
          setTimeout(() => {
            buttontell.style.background = 'transparent';
            buttontell.style.transition = '0.3s ease-in-out';
            buttontell.style.opacity = '1';
          }, 1000);

          // Add to UI and session history
          addMsg('bot', botReply, true);
          sessionHistory.push({ role: 'bot', text: botReply });
        } catch (err) {
          clearInterval(interval);
          typingMsg.remove();
          addMsg('bot', 'Error: ' + (err?.message || err));
          sessionHistory.push({
            role: 'bot',
            text: 'Error: ' + (err?.message || err),
          });
        }

        sendBtn.disabled = false;
      }

      // Event listeners
      sendBtn.onclick = () => {
        if (inputEl.value.trim()) sendMessage(inputEl.value.trim());
      };
      inputEl.onkeypress = (e) => {
        if (e.key === 'Enter' && inputEl.value.trim())
          sendMessage(inputEl.value.trim());
      };

      // Get a reference to the button element
      const myButton = document.getElementById('btnOpenC');
      const myButton2 = document.getElementById('toggleBtn');
      // Function to update the button's disabled state
      function updateButtonState() {
        if (navigator.onLine) {
          // User is online, enable the button
          myButton.disabled = false;
          myButton2.disabled = false;
        } else {
          // User is offline, disable the button
          myButton.disabled = true;
          myButton2.disabled = true;
        }
      }

      // Initial check when the page loads
      updateButtonState();

      // Listen for the 'online' event (when the user comes back online)
      window.addEventListener('online', updateButtonState);

      // Listen for the 'offline' event (when the user loses internet connection)
      window.addEventListener('offline', updateButtonState);
      /* optional: example initial messages (remove if you don't want) */

      const toolbar = document.getElementById('findtoolbar');
      const findInput = document.getElementById('find');
      const replaceInput = document.getElementById('replace');
      let cursor;

      function toggleToolbar(show) {
        if (show) {
          toolbar.classList.add('show');
          findInput.focus();
        } else {
          toolbar.classList.remove('show');
          cm.focus();
        }
      }

      findInput.addEventListener('input', () => {
        clearMarks();
        highlightAll(findInput.value);
        startSearch();
      });

      function startSearch() {
        const query = findInput.value;
        cursor = cm.getSearchCursor(query, null, { caseFold: true });
        highlightAll(findInput.value);
      }

      document.getElementById('findNext').onclick = () => {
        if (!cursor) {
          highlightAll(findInput.value);
          cursor = cm.getSearchCursor(findInput.value, null, {
            caseFold: true,
          });
        }
        if (!cursor.findNext()) {
          cursor = cm.getSearchCursor(findInput.value, null, {
            caseFold: true,
          });
          cursor.findNext();
        }
        if (cursor.from()) {
          cm.setSelection(cursor.from(), cursor.to());
          highlightAll(findInput.value);
          highlightCurrent(cursor.from(), cursor.to());
        }
      };

      document.getElementById('findPrev').onclick = () => {
        if (!cursor) {
          highlightAll(findInput.value);
          cursor = cm.getSearchCursor(findInput.value, null, {
            caseFold: true,
          });
        }
        if (!cursor.findPrevious()) {
          cursor = cm.getSearchCursor(findInput.value, null, {
            caseFold: true,
          });
          cursor.findPrevious();
        }
        if (cursor.from()) {
          cm.setSelection(cursor.from(), cursor.to());
          highlightAll(findInput.value);
          highlightCurrent(cursor.from(), cursor.to());
        }
      };

      document.getElementById('doReplace').onclick = () => {
        if (cursor && cursor.from()) {
          cursor.replace(replaceInput.value);
          document.getElementById('findNext').click();
        }
      };

      document.getElementById('replaceAll').onclick = () => {
        startSearch();
        while (cursor.findNext()) {
          cursor.replace(replaceInput.value);
        }
      };

      document.getElementById('closeToolbar').onclick = () => {
        toggleToolbar(false);
        clearMarks();
      };

      let marked2 = []; // keep track so we can clear later
      let currentMark = null;
      function clearMarks() {
        marked2.forEach((m) => m.clear());
        marked2 = [];
        if (currentMark) {
          currentMark.clear();
          currentMark = null;
        }
      }

      function highlightAll(query) {
        clearMarks();
        if (!query) return;
        const cursor = cm.getSearchCursor(query, null, { caseFold: true });
        while (cursor.findNext()) {
          marked2.push(
            cm.markText(cursor.from(), cursor.to(), {
              className: 'cm-search-highlight',
            }),
          );
        }
      }
      function highlightCurrent(from, to) {
        if (currentMark) currentMark.clear();
        currentMark = cm.markText(from, to, {
          className: 'cm-search-highlight2',
        });

      }
