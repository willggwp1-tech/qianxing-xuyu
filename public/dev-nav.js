(function () {
  const PAGES = [
    { label: 'Start',           href: 'start.html' },
    { label: 'Register / Login',href: 'register.html' },
    { label: 'Prologue',        href: 'prologue.html' },
    { label: 'Level Select',    href: 'level_select.html' },
    { label: 'Chapter 1',       href: 'chapter1.html' },
    { label: 'Prepare',         href: 'prepare.html' },
    { label: 'Duel',            href: 'duel.html' },
    { label: 'Shard Create',    href: 'shard_create.html' },
    { label: 'Soulweave Story', href: 'soulweave_story.html' },
    { label: 'Soulweave',       href: 'soulweave.html' },
    { label: 'Chatbot',         href: 'chatbot.html' },
    { label: 'Chapter Select',  href: 'chapter_select.html' },
  ];

  function build() {
    const current = location.pathname.split('/').pop();

    const style = document.createElement('style');
    style.textContent = `
      #dev-nav-toggle {
        position: fixed;
        bottom: 18px;
        left: 18px;
        z-index: 2147483647;
        background: #1a1f2e;
        color: #7eb8ff;
        border: 1px solid #3a4a6a;
        border-radius: 8px;
        padding: 6px 12px;
        font: 700 12px/1.4 monospace;
        cursor: pointer;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.6);
        user-select: none;
        transition: background 0.15s;
      }
      #dev-nav-toggle:hover { background: #252d42; }

      #dev-nav-panel {
        position: fixed;
        bottom: 52px;
        left: 18px;
        z-index: 2147483647;
        background: #10131e;
        border: 1px solid #3a4a6a;
        border-radius: 10px;
        padding: 8px 0;
        min-width: 200px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.7);
        display: none;
        flex-direction: column;
      }
      #dev-nav-panel.open { display: flex; }

      #dev-nav-panel a {
        display: block;
        padding: 7px 18px;
        font: 13px/1.4 monospace;
        color: #a0b8d8;
        text-decoration: none;
        transition: background 0.12s, color 0.12s;
        white-space: nowrap;
      }
      #dev-nav-panel a:hover { background: #1e2840; color: #ffffff; }
      #dev-nav-panel a.active {
        color: #7eb8ff;
        font-weight: 700;
        background: #1a2540;
      }
      #dev-nav-panel a.active::before { content: '▶ '; }

      #dev-nav-divider {
        height: 1px;
        background: #2a3450;
        margin: 6px 0;
      }
      #dev-nav-label {
        padding: 4px 18px 2px;
        font: 700 10px/1.4 monospace;
        color: #445566;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'dev-nav-panel';

    const label = document.createElement('div');
    label.id = 'dev-nav-label';
    label.textContent = '⚙ Dev Nav';
    panel.appendChild(label);

    const divider = document.createElement('div');
    divider.id = 'dev-nav-divider';
    panel.appendChild(divider);

    PAGES.forEach(p => {
      const a = document.createElement('a');
      a.href = p.href;
      a.textContent = p.label;
      if (p.href === current) a.className = 'active';
      panel.appendChild(a);
    });

    const toggle = document.createElement('button');
    toggle.id = 'dev-nav-toggle';
    toggle.textContent = '☰ DEV';

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
    });

    document.addEventListener('click', () => panel.classList.remove('open'));
    panel.addEventListener('click', e => e.stopPropagation());

    document.body.appendChild(panel);
    document.body.appendChild(toggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
