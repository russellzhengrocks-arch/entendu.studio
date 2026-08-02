(function () {
    "use strict";

    const supportedLocales = ["en", "zh-Hans", "zh-Hant", "ja", "ko", "es", "fr", "de"];
    const localeLabels = {
        en: "English",
        "zh-Hans": "简体中文",
        "zh-Hant": "繁體中文",
        ja: "日本語",
        ko: "한국어",
        es: "Español",
        fr: "Français",
        de: "Deutsch"
    };
    const ogLocales = {
        en: "en_US",
        "zh-Hans": "zh_CN",
        "zh-Hant": "zh_TW",
        ja: "ja_JP",
        ko: "ko_KR",
        es: "es_ES",
        fr: "fr_FR",
        de: "de_DE"
    };
    const currentScript = document.currentScript;
    const assetBase = new URL(".", currentScript?.src || window.location.href);
    let activeLocale = "en";
    let activeResource = null;
    let canonicalStrings = new Map();

    function canonical(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .replace(/\s+([,.;:!?。！？；：、])/g, "$1")
            .replace(/([([{“‘])\s+/g, "$1")
            .trim();
    }

    function normalizeLocale(value) {
        const raw = String(value || "").trim();
        if (!raw) return null;
        if (supportedLocales.includes(raw)) return raw;
        const lower = raw.toLowerCase();
        if (lower === "zh" || lower.startsWith("zh-cn") || lower.startsWith("zh-sg") || lower.includes("hans")) return "zh-Hans";
        if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk") || lower.startsWith("zh-mo") || lower.includes("hant")) return "zh-Hant";
        const base = lower.split(/[-_]/)[0];
        return supportedLocales.find((locale) => locale.toLowerCase() === base) || null;
    }

    function preferredLocale() {
        const queryLocale = normalizeLocale(new URLSearchParams(window.location.search).get("lang"));
        if (queryLocale) return queryLocale;
        try {
            const saved = normalizeLocale(window.localStorage.getItem("entendu.website.locale"));
            if (saved) return saved;
        } catch {}
        for (const browserLocale of navigator.languages || [navigator.language]) {
            const normalized = normalizeLocale(browserLocale);
            if (normalized) return normalized;
        }
        return "en";
    }

    function interpolate(template, values = {}) {
        return String(template).replace(/\{([^{}]+)\}/g, (match, key) => {
            const value = values[key];
            return value === undefined || value === null ? match : String(value);
        });
    }

    function translateSource(source, values) {
        if (!activeResource) return interpolate(source, values);
        const target = canonicalStrings.get(canonical(source)) || source;
        return interpolate(target, values);
    }

    function translateID(id, fallback, values) {
        const target = activeResource?.ids?.[id] || fallback || id;
        return interpolate(target, values);
    }

    function significantTextNodes(element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest("script, style, noscript, [data-entendu-i18n-skip]")) return NodeFilter.FILTER_REJECT;
                return canonical(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        return nodes;
    }

    function targetUnits(target) {
        if (/\s/u.test(target)) return target.match(/\s+|[^\s]+/gu) || [target];
        return Array.from(target);
    }

    function sentenceSegments(target) {
        return (String(target).match(/.*?(?:[.!?。！？]+(?:["'”’»）\]]*)|$)/gu) || [])
            .map((segment) => segment.trim())
            .filter(Boolean);
    }

    function replaceTextPreservingMarkup(element, target) {
        const nodes = significantTextNodes(element);
        if (!nodes.length) return;
        if (nodes.length === 1) {
            nodes[0].nodeValue = target;
            return;
        }

        const sentences = sentenceSegments(target);
        if (sentences.length === nodes.length) {
            nodes.forEach((node, index) => {
                node.nodeValue = sentences[index];
            });
            return;
        }

        const weights = nodes.map((node) => Math.max(1, Array.from(canonical(node.nodeValue)).length));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const units = targetUnits(target);
        let consumedUnits = 0;
        let consumedWeight = 0;

        nodes.forEach((node, index) => {
            consumedWeight += weights[index];
            const nextUnits = index === nodes.length - 1
                ? units.length
                : Math.max(consumedUnits, Math.min(units.length, Math.round((consumedWeight / totalWeight) * units.length)));
            node.nodeValue = units.slice(consumedUnits, nextUnits).join("");
            consumedUnits = nextUnits;
        });
    }

    function translateMetadata() {
        const titleSource = canonical(document.title);
        if (canonicalStrings.has(titleSource)) document.title = canonicalStrings.get(titleSource);
        document.querySelectorAll("meta[name='description'], meta[property='og:title'], meta[property='og:description']").forEach((meta) => {
            const source = canonical(meta.content);
            if (canonicalStrings.has(source)) meta.content = canonicalStrings.get(source);
        });
        const ogLocale = document.querySelector("meta[property='og:locale']");
        if (ogLocale) ogLocale.content = ogLocales[activeLocale] || ogLocales.en;
    }

    function translateAttributes() {
        const attributes = ["aria-label", "title", "placeholder", "alt"];
        document.querySelectorAll("body *").forEach((element) => {
            if (element.closest("[data-entendu-i18n-skip]")) return;
            attributes.forEach((attribute) => {
                if (!element.hasAttribute(attribute)) return;
                const source = canonical(element.getAttribute(attribute));
                const target = canonicalStrings.get(source);
                if (target) element.setAttribute(attribute, target);
            });
            if (element instanceof HTMLInputElement && ["submit", "button", "reset"].includes(element.type)) {
                const source = canonical(element.value);
                const target = canonicalStrings.get(source);
                if (target) element.value = target;
            }
        });
    }

    function translateBody() {
        const candidates = [];
        document.querySelectorAll("body *").forEach((element) => {
            if (element.closest("script, style, noscript, [data-entendu-i18n-skip]")) return;
            const source = canonical(element.textContent);
            const target = canonicalStrings.get(source);
            if (!source || !target || source === canonical(target)) return;
            let depth = 0;
            for (let parent = element.parentElement; parent; parent = parent.parentElement) depth += 1;
            candidates.push({ element, target, depth });
        });

        candidates.sort((left, right) => right.depth - left.depth);
        const applied = [];
        candidates.forEach(({ element, target }) => {
            if (applied.some((child) => element.contains(child))) return;
            replaceTextPreservingMarkup(element, target);
            element.dataset.entenduI18nApplied = "true";
            applied.push(element);
        });
    }

    function updateInternalLinks() {
        if (activeLocale === "en") return;
        document.querySelectorAll("a[href]").forEach((anchor) => {
            const raw = anchor.getAttribute("href");
            if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("/app")) return;
            try {
                const url = new URL(raw, window.location.href);
                if (url.origin !== window.location.origin) return;
                url.searchParams.set("lang", activeLocale);
                anchor.href = url.href;
            } catch {}
        });
    }

    function injectSwitcher() {
        if (document.querySelector("[data-entendu-locale-switcher]")) return;
        const wrapper = document.createElement("label");
        wrapper.className = "entendu-locale-switcher";
        wrapper.dataset.entenduLocaleSwitcher = "";
        wrapper.dataset.entenduI18nSkip = "";
        wrapper.setAttribute("aria-label", "Language");

        const icon = document.createElement("span");
        icon.textContent = "◎";
        icon.setAttribute("aria-hidden", "true");

        const select = document.createElement("select");
        select.setAttribute("aria-label", "Language");
        supportedLocales.forEach((locale) => {
            const option = document.createElement("option");
            option.value = locale;
            option.textContent = localeLabels[locale];
            option.selected = locale === activeLocale;
            select.append(option);
        });
        select.addEventListener("change", () => {
            const locale = normalizeLocale(select.value) || "en";
            try { window.localStorage.setItem("entendu.website.locale", locale); } catch {}
            const url = new URL(window.location.href);
            if (locale === "en") url.searchParams.delete("lang");
            else url.searchParams.set("lang", locale);
            window.location.assign(url.href);
        });
        wrapper.append(icon, select);

        const primaryNav = document.querySelector(".site-nav .nav-links");
        if (primaryNav) {
            primaryNav.append(wrapper);
            wrapper.classList.add("is-in-nav");
        } else {
            document.body.append(wrapper);
            wrapper.classList.add("is-floating");
        }
    }

    function injectStyles() {
        if (document.getElementById("entendu-i18n-styles")) return;
        const style = document.createElement("style");
        style.id = "entendu-i18n-styles";
        style.textContent = `
            .entendu-locale-switcher{display:inline-flex;align-items:center;gap:6px;color:inherit;font:inherit;z-index:10000}
            .entendu-locale-switcher>span{font-size:13px;opacity:.72}
            .entendu-locale-switcher select{max-width:118px;min-height:30px;padding:4px 24px 4px 8px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:inherit;background:rgba(20,22,26,.88);font:600 11px/1.2 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
            .entendu-locale-switcher select:focus{outline:2px solid rgba(216,212,204,.48);outline-offset:2px}
            .entendu-locale-switcher.is-floating{position:fixed;top:18px;right:18px;padding:7px 9px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(17,19,23,.9);box-shadow:0 10px 30px rgba(0,0,0,.22);backdrop-filter:blur(16px)}
            .pricing-main-offer>strong,.pricing-row>strong{white-space:nowrap}
            .pricing-row{grid-template-columns:minmax(96px,max-content) minmax(0,1fr) auto;column-gap:clamp(14px,1.3vw,26px)}
            .pricing-row.is-featured{grid-template-columns:minmax(102px,max-content) minmax(0,1fr) auto}
            .pricing-row>div{min-width:0}
            .pricing-row h4{overflow-wrap:anywhere}
            :is(html:lang(zh-Hans),html:lang(zh-Hant),html:lang(ja),html:lang(ko)) .pricing-primary h2{font-size:clamp(42px,3.7vw,60px);text-wrap:initial}
            :is(html:lang(zh-Hans),html:lang(zh-Hant),html:lang(ja),html:lang(ko)) .pricing-primary h2>*{white-space:nowrap}
            @media(max-width:980px){.entendu-locale-switcher.is-in-nav{position:fixed;right:16px;bottom:16px;padding:7px 9px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(17,19,23,.94);box-shadow:0 10px 30px rgba(0,0,0,.28)}}
            @media(max-width:720px){.pricing-row,.pricing-row.is-featured{grid-template-columns:1fr}.pricing-primary h2>*{white-space:normal}}
        `;
        document.head.append(style);
    }

    function applyTranslations() {
        document.documentElement.lang = activeLocale;
        translateMetadata();
        translateAttributes();
        translateBody();
        updateInternalLinks();
        injectStyles();
        injectSwitcher();
    }

    async function initialize() {
        activeLocale = preferredLocale();
        if (activeLocale !== "en") {
            try {
                const response = await fetch(new URL(`locales/${activeLocale}.json`, assetBase), { cache: "no-cache" });
                if (!response.ok) throw new Error(`Localization HTTP ${response.status}`);
                activeResource = await response.json();
                canonicalStrings = new Map(Object.entries(activeResource.strings || {}).map(([source, target]) => [canonical(source), target]));
            } catch (error) {
                console.warn("[entendu.i18n] Falling back to English.", error);
                activeLocale = "en";
                activeResource = null;
                canonicalStrings = new Map();
            }
        }
        try { window.localStorage.setItem("entendu.website.locale", activeLocale); } catch {}
        applyTranslations();
        window.dispatchEvent(new CustomEvent("entendu:i18n-ready", { detail: { locale: activeLocale } }));
    }

    window.EntenduI18n = {
        get locale() { return activeLocale; },
        get ready() { return initialization; },
        t: translateSource,
        tID: translateID,
        format: interpolate,
        apply: applyTranslations,
        normalizeLocale
    };

    const initialization = initialize();
})();
