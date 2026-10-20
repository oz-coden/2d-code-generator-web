(function () {
    'use strict';
    const key = 'oz_tools_theme';
    const read = (name, fallback = null) => {
        try { return localStorage.getItem(name) ?? fallback; } catch (_) { return fallback; }
    };
    const write = (name, value) => {
        try { localStorage.setItem(name, value); return true; } catch (_) { return false; }
    };
    const readJSON = (name, fallback) => {
        try { return JSON.parse(read(name, 'null')) ?? fallback; } catch (_) { return fallback; }
    };
    function applyTheme(theme, persist = false) {
        theme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = theme;
        if (persist) write(key, theme);
        document.querySelectorAll('[data-ui-theme]').forEach(button => {
            button.textContent = theme === 'dark' ? '☀' : '☾';
            button.setAttribute('aria-label', theme === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え');
        });
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
    }
    async function copyText(text) {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
        const input = document.createElement('textarea');
        input.value = text;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('コピーできませんでした。');
    }
    window.OzUI = Object.freeze({ read, write, readJSON, copyText });
    applyTheme(read(key, 'light'));
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-ui-header]').forEach(header => {
            const title = document.createElement('span');
            title.className = 'ui-header-title';
            title.textContent = header.dataset.title || '';
            const nav = document.createElement('nav');
            nav.className = 'ui-nav';
            nav.setAttribute('aria-label', '共通ナビゲーション');
            const home = document.createElement('a');
            home.href = header.dataset.home || 'https://tools.oz-coden.com/';
            home.textContent = 'ツール一覧';
            nav.append(home);
            if (header.dataset.source) {
                const source = document.createElement('a');
                const url = new URL(header.dataset.source, location.href);
                if (url.protocol === 'https:') {
                    source.href = url.href;
                    source.textContent = 'GitHub';
                    source.target = '_blank';
                    source.rel = 'noopener noreferrer';
                    nav.append(source);
                }
            }
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ui-theme-button';
            toggle.dataset.uiTheme = '';
            toggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
            nav.append(toggle);
            header.append(title, nav);
        });
        applyTheme(document.documentElement.dataset.theme);
    });
    window.addEventListener('storage', event => { if (event.key === key) applyTheme(event.newValue); });
})();
