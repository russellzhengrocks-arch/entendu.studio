const nav = document.querySelector("[data-nav]");
const revealItems = document.querySelectorAll("[data-reveal]");
const demoCaption = document.querySelector("[data-demo-caption]");
const demoTimecode = document.querySelector("[data-demo-timecode]");
const introOpen = document.querySelector("[data-intro-open]");
const introModal = document.querySelector("[data-intro-modal]");
const introFrame = document.querySelector("[data-intro-frame]");
const introCloseControls = document.querySelectorAll("[data-intro-close]");
const releaseOpen = document.querySelector("[data-release-open]");
const releaseModal = document.querySelector("[data-release-modal]");
const releaseCloseControls = document.querySelectorAll("[data-release-close]");
const supportMenuRoots = document.querySelectorAll("[data-support-menu-root]");
const aiPowered = document.querySelector("[data-ai-powered]");
const aiPoweredShell = aiPowered ? aiPowered.closest(".demo-shell") : null;
const aiPoweredVideo = aiPowered ? aiPowered.querySelector("video") : null;
const aiPoweredSound = document.querySelector("[data-ai-powered-sound]");
const navDownload = document.querySelector(".nav-cta");
const workflowSection = document.querySelector("[data-playground]");
const workflowBackdrop = document.querySelector("[data-workflow-bg]");
const workflowVideo = document.querySelector("[data-workflow-video]");
const playgroundDataElement = document.getElementById("playground-data");
const playgroundApp = document.querySelector("[data-playground] .playground-app");
const playgroundEditNote = document.querySelector("[data-playground-edit-note]");
const playgroundEditArrow = document.querySelector("[data-playground-edit-arrow]");
const playgroundStatus = document.querySelector("[data-playground-status]");
const playgroundIntake = document.querySelector("[data-playground-intake]");
const playgroundWorkbench = document.querySelector("[data-playground-workbench]");
const playgroundDropzone = document.querySelector("[data-playground-start]");
const playgroundSampleFile = document.querySelector("[data-playground-file]");
const playgroundLanguage = document.querySelector("[data-playground-language]");
const playgroundVideo = document.querySelector("[data-playground-video]");
const playgroundCaption = document.querySelector("[data-playground-caption]");
const playgroundCues = document.querySelector("[data-playground-cues]");
const playgroundPlay = document.querySelector("[data-playground-play]");
const playgroundMute = document.querySelector("[data-playground-mute]");
const playgroundProgress = document.querySelector("[data-playground-progress]");
const playgroundTime = document.querySelector("[data-playground-time]");
const playgroundStages = document.querySelectorAll("[data-stage]");
const mutedVideos = document.querySelectorAll("video[muted][autoplay]");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const playgroundDataStore = parsePlaygroundData();
let playgroundData = null;
let aiPoweredWasLit = false;
let aiPoweredSoundPlayed = false;
let playgroundStarted = false;
let playgroundCueCards = [];
let playgroundActiveCueIndex = null;
let playgroundDisplayMode = "idle";
let playgroundEditNoteTimer = 0;

const demoLines = [
    "诊察番号十八番の方はい",
    "Patient number eighteen, please",
    "Сейчас приглашается номер восемнадцать",
    "請十八號患者進來"
];

const introSrc = "assets/intro/entendu-promo-standalone.html?autoplay=1";

function updateNav() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
}

function updateAiPowered() {
    if (!aiPowered) return;
    const shouldLight = reducedMotion || window.scrollY > Math.min(160, window.innerHeight * 0.16);
    const becameLit = shouldLight && !aiPoweredWasLit;
    aiPowered.classList.toggle("is-lit", shouldLight);
    if (aiPoweredShell) aiPoweredShell.classList.toggle("is-ai-lit", shouldLight);
    if (becameLit) playAiPoweredSound();
    aiPoweredWasLit = shouldLight;
}

function updateWorkflowBackdrop() {
    if (!workflowSection || !workflowBackdrop) return;
    if (reducedMotion) {
        workflowBackdrop.style.setProperty("--workflow-bg-opacity", "0.98");
        workflowBackdrop.style.setProperty("--workflow-bg-shift", "0px");
        workflowBackdrop.style.setProperty("--workflow-bg-scale", "1");
        workflowBackdrop.style.setProperty("--workflow-bg-image-shift", "0px");
        scrubWorkflowVideo(0);
        return;
    }

    const rect = workflowBackdrop.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const startY = viewportHeight * 0.88;
    const endY = viewportHeight * 0.42;
    const rawProgress = (startY - rect.top) / (startY + rect.height - endY);
    const progress = Math.max(0, Math.min(1, rawProgress));
    const revealProgress = Math.max(0, Math.min(1, progress / 0.26));
    const eased = 1 - Math.pow(1 - revealProgress, 2);
    const videoDelay = 0.24;
    const videoSpeed = 1.2;
    const videoProgress = Math.max(0, Math.min(1, ((progress - videoDelay) / (1 - videoDelay)) * videoSpeed));
    workflowBackdrop.style.setProperty("--workflow-bg-opacity", (eased * 0.98).toFixed(3));
    workflowBackdrop.style.setProperty("--workflow-bg-shift", `${((1 - eased) * 56).toFixed(1)}px`);
    workflowBackdrop.style.setProperty("--workflow-bg-scale", (0.985 + eased * 0.015).toFixed(4));
    workflowBackdrop.style.setProperty("--workflow-bg-image-shift", `${((1 - eased) * 26).toFixed(1)}px`);
    scrubWorkflowVideo(videoProgress);
}

function scrubWorkflowVideo(progress) {
    if (!workflowVideo) return;
    const fallbackDuration = 7.87;
    const duration = Number.isFinite(workflowVideo.duration) && workflowVideo.duration > 0
        ? workflowVideo.duration
        : fallbackDuration;
    const targetTime = Math.max(0, Math.min(duration - 0.04, duration * progress));
    if (Math.abs((workflowVideo.currentTime || 0) - targetTime) > 0.035) {
        try {
            workflowVideo.currentTime = targetTime;
        } catch (_) {}
    }
}

function setupReveal() {
    if (!("IntersectionObserver" in window) || reducedMotion) {
        revealItems.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
}

function openIntroModal() {
    if (!introModal || !introFrame) return;
    introFrame.src = introSrc;
    introModal.hidden = false;
    document.body.classList.add("is-intro-open");
}

function closeIntroModal() {
    if (!introModal || !introFrame) return;
    introModal.hidden = true;
    introFrame.removeAttribute("src");
    document.body.classList.remove("is-intro-open");
}

function setupIntroModal() {
    introOpen?.addEventListener("click", openIntroModal);
    introCloseControls.forEach((control) => control.addEventListener("click", closeIntroModal));
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && introModal && !introModal.hidden) {
            closeIntroModal();
        }
        if (event.key === "Escape" && releaseModal && !releaseModal.hidden) {
            closeReleaseModal();
        }
    });
}

function openReleaseModal() {
    if (!releaseModal) return;
    releaseModal.hidden = false;
    document.body.classList.add("is-intro-open");
}

function closeReleaseModal() {
    if (!releaseModal) return;
    releaseModal.hidden = true;
    document.body.classList.remove("is-intro-open");
}

function setupReleaseModal() {
    releaseOpen?.addEventListener("click", openReleaseModal);
    releaseCloseControls.forEach((control) => control.addEventListener("click", closeReleaseModal));
}

function closeSupportMenus(exceptRoot = null) {
    supportMenuRoots.forEach((root) => {
        if (root === exceptRoot) return;
        root.classList.remove("is-open");
        root.querySelector("[data-support-menu-trigger]")?.setAttribute("aria-expanded", "false");
    });
}

function setupSupportMenu() {
    if (!supportMenuRoots.length) return;

    supportMenuRoots.forEach((root) => {
        const trigger = root.querySelector("[data-support-menu-trigger]");
        if (!trigger) return;

        trigger.addEventListener("click", (event) => {
            event.stopPropagation();
            const willOpen = !root.classList.contains("is-open");
            closeSupportMenus(root);
            root.classList.toggle("is-open", willOpen);
            trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
        });
    });

    document.addEventListener("click", (event) => {
        if (![...supportMenuRoots].some((root) => root.contains(event.target))) {
            closeSupportMenus();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeSupportMenus();
    });
}

function trackSiteEvent(name, props = {}, callback = null) {
    let handled = false;
    const done = () => {
        if (handled) return;
        handled = true;
        if (typeof callback === "function") callback();
    };

    if (typeof window.plausible === "function") {
        window.plausible(name, {
            props,
            callback: done
        });
    }
    if (typeof window.umami === "object" && typeof window.umami.track === "function") {
        window.umami.track(name, props);
    }
    if (typeof window.plausible !== "function" && typeof callback === "function") {
        window.setTimeout(done, 0);
    }
}

function setupTrackedEvents() {
    document.querySelectorAll("[data-track-event]").forEach((element) => {
        element.addEventListener("click", (event) => {
            const href = element.getAttribute("href") || "";
            const props = {
                href: element.getAttribute("href") || "",
                label: element.textContent.trim().replace(/\s+/g, " ")
            };
            const shouldDelayNavigation = element.dataset.trackWait === "true"
                && element.tagName === "A"
                && href
                && !event.metaKey
                && !event.ctrlKey
                && !event.shiftKey
                && !event.altKey
                && element.getAttribute("target") !== "_blank";

            if (!shouldDelayNavigation) {
                trackSiteEvent(element.dataset.trackEvent, props);
                return;
            }

            event.preventDefault();
            let navigated = false;
            const navigate = () => {
                if (navigated) return;
                navigated = true;
                window.location.href = href;
            };

            trackSiteEvent(element.dataset.trackEvent, props, navigate);
            window.setTimeout(navigate, 350);
        });
    });
}

function parsePlaygroundData() {
    if (!playgroundDataElement) return null;

    try {
        return JSON.parse(playgroundDataElement.textContent);
    } catch (_) {
        return null;
    }
}

function getPlaygroundLanguages() {
    if (!playgroundDataStore) return [];
    if (Array.isArray(playgroundDataStore.languages)) return playgroundDataStore.languages;
    return [playgroundDataStore];
}

function getPlaygroundDataForLanguage(code = playgroundLanguage?.value) {
    const languages = getPlaygroundLanguages();
    return languages.find((language) => language.code === code) || languages[0] || null;
}

function setupPlaygroundLanguages() {
    if (!playgroundLanguage) return;
    const languages = getPlaygroundLanguages();
    if (!languages.length) return;

    playgroundLanguage.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select language";
    placeholder.disabled = true;
    placeholder.hidden = true;
    playgroundLanguage.append(placeholder);

    languages.forEach((language) => {
        const option = document.createElement("option");
        option.value = language.code;
        option.textContent = language.language;
        playgroundLanguage.append(option);
    });

    playgroundLanguage.value = "";
    playgroundSampleFile?.setAttribute("draggable", "false");

    playgroundLanguage.addEventListener("change", () => {
        const selectedLanguage = getPlaygroundDataForLanguage(playgroundLanguage.value);
        if (!selectedLanguage || selectedLanguage.code !== playgroundLanguage.value) return;

        playgroundData = selectedLanguage;
        playgroundActiveCueIndex = null;
        playgroundApp?.classList.remove("is-awaiting-language");
        playgroundApp?.classList.add("is-language-selected");
        playgroundSampleFile?.setAttribute("draggable", "true");

        if (playgroundStarted) {
            const mode = playgroundDisplayMode === "idle" ? "qa" : playgroundDisplayMode;
            renderPlaygroundCues(mode);
            setPlaygroundStatus(`${playgroundData.language} ready`);
        } else {
            setPlaygroundStatus(`${playgroundData.language} selected`);
        }
    });
}

function typeDemoLine(line, onComplete) {
    if (!demoCaption) return;

    const letters = Array.from(line);
    let index = 0;
    demoCaption.textContent = "";

    const tick = () => {
        demoCaption.textContent = letters.slice(0, index).join("");
        index += 1;

        if (index <= letters.length) {
            window.setTimeout(tick, 34);
            return;
        }

        window.setTimeout(onComplete, 1450);
    };

    tick();
}

function startDemoCaptionLoop() {
    if (!demoCaption) return;

    if (reducedMotion) {
        demoCaption.textContent = demoLines[0];
        return;
    }

    let index = 0;
    const next = () => {
        typeDemoLine(demoLines[index], () => {
            index = (index + 1) % demoLines.length;
            next();
        });
    };

    next();
}

function formatTimecode(seconds) {
    const baseSeconds = 4 * 60 + 17 + seconds;
    const minutes = Math.floor(baseSeconds / 60);
    const wholeSeconds = Math.floor(baseSeconds % 60);
    const frames = Math.floor((baseSeconds % 1) * 24);
    return `00:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function setupDemoVideo() {
    mutedVideos.forEach((video) => {
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");

        const playVideo = () => {
            video.play().catch(() => {});
        };

        if (video.readyState >= 2) {
            playVideo();
        } else {
            video.addEventListener("canplay", playVideo, { once: true });
        }
    });

    const primaryVideo = document.querySelector(".demo-video");
    if (!demoTimecode || !primaryVideo || reducedMotion) return;

    const updateTimecode = () => {
        demoTimecode.textContent = formatTimecode(primaryVideo.currentTime || 0);
        window.requestAnimationFrame(updateTimecode);
    };

    updateTimecode();
}

function boostedColor(sample, fallback) {
    if (!sample.count) return fallback;
    const color = {
        r: sample.r / sample.count,
        g: sample.g / sample.count,
        b: sample.b / sample.count
    };
    const peak = Math.max(color.r, color.g, color.b, 1);
    const boost = peak < 190 ? 190 / peak : 1;

    return {
        r: Math.min(255, Math.round(color.r * boost)),
        g: Math.min(255, Math.round(color.g * boost)),
        b: Math.min(255, Math.round(color.b * boost))
    };
}

function colorValue(color) {
    return `${color.r}, ${color.g}, ${color.b}`;
}

function setupAiGlow() {
    if (!aiPoweredVideo || !aiPoweredShell || reducedMotion) return;

    const canvas = document.createElement("canvas");
    const width = 42;
    const height = 12;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    const sampleFrame = () => {
        if (aiPoweredVideo.readyState >= 2) {
            try {
                context.drawImage(aiPoweredVideo, 0, 0, width, height);
                const pixels = context.getImageData(0, 0, width, height).data;
                const glow = { r: 0, g: 0, b: 0, count: 0 };
                const edge = { r: 0, g: 0, b: 0, count: 0 };

                for (let index = 0; index < pixels.length; index += 4) {
                    const pixel = index / 4;
                    const y = Math.floor(pixel / width);
                    const r = pixels[index];
                    const g = pixels[index + 1];
                    const b = pixels[index + 2];
                    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;

                    if (luminance > 38) {
                        glow.r += r;
                        glow.g += g;
                        glow.b += b;
                        glow.count += 1;
                    }

                    if ((y < 2 || y > height - 3) && luminance > 24) {
                        edge.r += r;
                        edge.g += g;
                        edge.b += b;
                        edge.count += 1;
                    }
                }

                aiPoweredShell.style.setProperty("--ai-glow-rgb", colorValue(boostedColor(glow, { r: 205, g: 82, b: 207 })));
                aiPoweredShell.style.setProperty("--ai-edge-rgb", colorValue(boostedColor(edge, { r: 91, g: 127, b: 255 })));
            } catch (_) {
                return;
            }
        }

        window.requestAnimationFrame(sampleFrame);
    };

    sampleFrame();
}

function markAiSoundPlayed() {
    aiPoweredSoundPlayed = true;
}

function playAiPoweredSound() {
    if (!aiPoweredSound || aiPoweredSoundPlayed) return;

    aiPoweredSound.volume = 0.3;
    aiPoweredSound.currentTime = 0;

    const playback = aiPoweredSound.play();
    if (!playback || typeof playback.then !== "function") {
        markAiSoundPlayed();
        return;
    }

    playback.then(markAiSoundPlayed).catch(() => {});
}

function setupAiPoweredSound() {
    if (!aiPoweredSound) return;
    aiPoweredSound.volume = 0.3;
}

function formatPlaygroundTime(seconds) {
    const safeSeconds = Math.max(0, seconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const wholeSeconds = Math.floor(safeSeconds % 60);
    const centiseconds = Math.floor((safeSeconds % 1) * 100);
    return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function formatPlaygroundClock(seconds) {
    const safeSeconds = Math.max(0, seconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const wholeSeconds = Math.floor(safeSeconds % 60);
    return `00:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
}

function setPlaygroundStatus(text) {
    if (playgroundStatus) playgroundStatus.textContent = text;
}

function setPlaygroundStage(activeStage) {
    playgroundStages.forEach((stage) => {
        const isActive = stage.dataset.stage === activeStage;
        stage.classList.toggle("is-running", isActive);
        if (isActive) stage.classList.remove("is-done");
    });
}

function completePlaygroundStage(stageName) {
    playgroundStages.forEach((stage) => {
        if (stage.dataset.stage !== stageName) return;
        stage.classList.remove("is-running");
        stage.classList.add("is-done");
    });
}

function waitForStage(stageName, statusText) {
    setPlaygroundStage(stageName);
    setPlaygroundStatus(statusText);

    return new Promise((resolve) => {
        window.setTimeout(() => {
            completePlaygroundStage(stageName);
            resolve();
        }, reducedMotion ? 60 : 980);
    });
}

function playPlaygroundVideoFromStart() {
    if (!playgroundVideo) return;
    playgroundVideo.pause();
    playgroundVideo.currentTime = 0;
    playgroundVideo.muted = true;
    playgroundActiveCueIndex = null;
    updatePlaygroundMuteControl();
    updatePlaygroundPlayback();
    playgroundVideo.play().catch(() => {});
    if (playgroundPlay) playgroundPlay.textContent = "Pause";
}

function waitForPlaygroundVideoEnd() {
    if (!playgroundVideo) return Promise.resolve();

    return new Promise((resolve) => {
        const fallbackDuration = ((playgroundData?.cues.at(-1)?.end || 14.5) + 0.4) * 1000;
        let timeout = 0;

        const finish = () => {
            window.clearTimeout(timeout);
            playgroundVideo.removeEventListener("ended", finish);
            resolve();
        };

        playgroundVideo.addEventListener("ended", finish, { once: true });
        timeout = window.setTimeout(finish, fallbackDuration);
    });
}

async function runPlaygroundPass(stageName, mode, statusText) {
    renderPlaygroundCues(mode);
    setPlaygroundStage(stageName);
    setPlaygroundStatus(statusText);
    playPlaygroundVideoFromStart();
    await waitForPlaygroundVideoEnd();
    completePlaygroundStage(stageName);
}

function roughTranslationForCue(cue) {
    if (cue.type === "ost" && cue.translation.startsWith("（") && cue.translation.endsWith("）")) {
        return cue.translation.slice(0, -1);
    }

    if (cue.index === 2) return cue.translation.replace("？", "?");
    if (cue.index === 5) return `${cue.translation}）`;
    if (cue.index === 8) return `${cue.translation}。`;
    return cue.translation;
}

function displayTextForCue(cue, mode = playgroundDisplayMode) {
    if (!cue || mode === "idle") return "";
    if (mode === "caption") return cue.source;
    if (mode === "translate") return roughTranslationForCue(cue);
    return cue.translation;
}

function qaForCue(cue) {
    const duration = Math.max(0.01, cue.end - cue.start);
    const durationError = duration < 1;
    const issues = [];

    if (durationError) {
        issues.push("Duration under 1.0s");
    }

    const checks = [
        cue.translation ? "Translation present" : "Needs translation",
        durationError ? "Duration under 1.0s" : "Timing OK",
        cue.type === "ost" ? "OST preserved" : "Reading speed OK"
    ];

    return {
        status: durationError ? "Error" : (cue.translation ? "OK" : "Review"),
        duration: `${duration.toFixed(2)}s`,
        checks,
        issues
    };
}

function renderPlaygroundCues(mode = "qa") {
    if (!playgroundCues || !playgroundData) return;

    playgroundDisplayMode = mode;
    playgroundCues.classList.remove("is-waiting");
    playgroundCues.textContent = "";
    playgroundCueCards = playgroundData.cues.map((cue) => {
        const qa = qaForCue(cue);
        const isCaption = mode === "caption";
        const isTranslate = mode === "translate";
        const displayTranslation = displayTextForCue(cue, mode);
        const card = document.createElement("article");
        card.className = "cue-card";
        card.classList.toggle("is-processing", isCaption || isTranslate);
        card.classList.toggle("has-qa-fix", isTranslate && displayTranslation !== cue.translation);
        card.classList.toggle("has-qa-error", mode === "qa" && qa.status === "Error");
        card.dataset.cueIndex = String(cue.index);

        const meta = document.createElement("div");
        meta.className = "cue-meta";

        const index = document.createElement("strong");
        index.textContent = `#${cue.index}`;
        meta.append(index);

        const timing = document.createElement("span");
        timing.className = "cue-timecode";
        timing.textContent = `${formatPlaygroundTime(cue.start)} -> ${formatPlaygroundTime(cue.end)}`;
        timing.tabIndex = 0;
        timing.title = "Download the app to edit subtitles.";
        timing.addEventListener("click", onSubtitleIntent);
        timing.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            onSubtitleIntent(event);
        });
        meta.append(timing);

        const qaStatus = document.createElement("span");
        qaStatus.className = "qa-status";
        qaStatus.classList.toggle("is-pending", mode !== "qa");
        qaStatus.classList.toggle("is-error", mode === "qa" && qa.status === "Error");
        qaStatus.textContent = isCaption ? (cue.type === "ost" ? "OST" : "Speech") : (isTranslate ? "Needs QA" : (qa.status === "Error" ? "Error" : `${qa.status} ${qa.duration}`));
        meta.append(qaStatus);

        const translation = document.createElement("p");
        translation.className = "cue-translation";
        translation.dir = "auto";
        translation.textContent = displayTranslation;
        translation.tabIndex = 0;
        translation.title = "Download the app to edit subtitles.";
        translation.addEventListener("click", onSubtitleIntent);
        translation.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            onSubtitleIntent(event);
        });

        if (isCaption) {
            translation.setAttribute("aria-label", cue.type === "ost" ? "Caption detected as OST" : "Caption detected as speech");
        }

        const source = document.createElement("p");
        source.className = "cue-source";

        const sourceLabel = document.createElement("span");
        sourceLabel.textContent = isCaption ? "Detected text" : (cue.type === "ost" ? "Source OST" : "Source");
        source.append(sourceLabel, document.createTextNode(isCaption ? (cue.type === "ost" ? "OST spotted" : "Dialogue spotted") : cue.source));

        if (isTranslate && displayTranslation !== cue.translation) {
            const issue = document.createElement("p");
            issue.className = "cue-issue";
            issue.textContent = "QA will normalize punctuation / brackets";
            card.append(meta, translation, issue, source);
        } else if (mode === "qa" && qa.issues.length) {
            const issue = document.createElement("p");
            issue.className = "cue-issue is-error";
            issue.textContent = qa.issues[0];
            card.append(meta, translation, issue, source);
        } else {
            card.append(meta, translation, source);
        }

        playgroundCues.append(card);
        return { cue, card };
    });
    updatePlaygroundPlayback();
}

function updatePlaygroundPlayback() {
    if (!playgroundVideo || !playgroundData) return;

    const currentTime = playgroundVideo.currentTime || 0;
    const duration = playgroundVideo.duration || playgroundData.cues.at(-1)?.end || 1;
    const active = playgroundData.cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end);

    if (playgroundCaption) {
        playgroundCaption.dir = "auto";
        playgroundCaption.textContent = displayTextForCue(active);
    }

    playgroundCueCards.forEach(({ cue, card }) => {
        const isActive = active && cue.index === active.index;
        card.classList.toggle("is-active", Boolean(isActive));
        if (isActive && playgroundActiveCueIndex !== cue.index) {
            card.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
        }
    });
    playgroundActiveCueIndex = active ? active.index : null;

    if (playgroundProgress) {
        playgroundProgress.style.width = `${Math.min(100, (currentTime / duration) * 100)}%`;
    }

    if (playgroundTime) {
        playgroundTime.textContent = formatPlaygroundClock(currentTime);
    }
}

function updatePlaygroundMuteControl() {
    if (!playgroundMute || !playgroundVideo) return;
    const isMuted = playgroundVideo.muted || playgroundVideo.volume === 0;
    const label = isMuted ? "Muted" : "Sound on";
    playgroundMute.classList.toggle("is-unmuted", !isMuted);
    playgroundMute.setAttribute("aria-label", isMuted ? "Unmute sample video" : "Mute sample video");
    const text = playgroundMute.querySelector("b");
    if (text) text.textContent = label;
}

function showPlaygroundEditNote(event) {
    if (!playgroundEditNote || !navDownload) return;

    const targetRect = navDownload.getBoundingClientRect();
    const noteX = Math.max(210, Math.min(window.innerWidth - 210, targetRect.left - 300));
    const noteY = Math.max(126, Math.min(window.innerHeight - 86, targetRect.bottom + 70));
    playgroundEditNote.style.setProperty("--note-x", `${noteX}px`);
    playgroundEditNote.style.setProperty("--note-y", `${noteY}px`);
    playgroundEditArrow?.classList.remove("is-visible");
    playgroundEditNote.classList.remove("is-visible");
    window.clearTimeout(playgroundEditNoteTimer);
    window.requestAnimationFrame(() => {
        playgroundEditNote.classList.add("is-visible");

        if (!playgroundEditArrow) return;
        const noteRect = playgroundEditNote.getBoundingClientRect();
        const targetRect = navDownload.getBoundingClientRect();
        const startX = noteRect.right + 18;
        const startY = noteRect.top + noteRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.max(120, Math.hypot(dx, dy));
        playgroundEditArrow.style.setProperty("--arrow-x", `${startX}px`);
        playgroundEditArrow.style.setProperty("--arrow-y", `${startY}px`);
        playgroundEditArrow.style.setProperty("--arrow-length", `${length}px`);
        playgroundEditArrow.style.setProperty("--arrow-angle", `${Math.atan2(dy, dx)}rad`);
        playgroundEditArrow.classList.add("is-visible");
    });
    playgroundEditNoteTimer = window.setTimeout(() => {
        playgroundEditNote.classList.remove("is-visible");
        playgroundEditArrow?.classList.remove("is-visible");
    }, 5200);
}

function onSubtitleIntent(event) {
    event.preventDefault();
    showPlaygroundEditNote(event);
}

async function startPlayground() {
    if (playgroundStarted || !playgroundData || !playgroundIntake || !playgroundWorkbench) return;
    playgroundStarted = true;
    playgroundApp?.classList.remove("is-awaiting-language");
    playgroundApp?.classList.remove("is-language-selected");

    playgroundIntake.hidden = true;
    playgroundWorkbench.hidden = false;
    if (playgroundCues) playgroundCues.classList.add("is-waiting");

    await runPlaygroundPass("caption", "caption", "Pass 1/3 · English captions and OST");
    await runPlaygroundPass("translate", "translate", `Pass 2/3 · ${playgroundData.language} draft translation`);
    await runPlaygroundPass("qa", "qa", "Pass 3/3 · QA-cleaned delivery");
    setPlaygroundStatus(`${playgroundData.language} ready`);

    if (playgroundPlay) playgroundPlay.textContent = "Play";
}

function setupPlayground() {
    if (!getPlaygroundLanguages().length) return;
    setupPlaygroundLanguages();
    playgroundApp?.classList.add("is-awaiting-language");
    playgroundApp?.classList.remove("is-language-selected");
    setPlaygroundStatus("Choose target language");
    window.setTimeout(() => playgroundLanguage?.focus({ preventScroll: true }), 90);

    if (playgroundVideo) {
        playgroundVideo.muted = true;
        playgroundVideo.volume = 0.82;
        updatePlaygroundMuteControl();
        playgroundVideo.addEventListener("timeupdate", updatePlaygroundPlayback);
        playgroundVideo.addEventListener("loadedmetadata", updatePlaygroundPlayback);
        playgroundVideo.addEventListener("volumechange", updatePlaygroundMuteControl);
        playgroundVideo.addEventListener("ended", () => {
            if (playgroundPlay) playgroundPlay.textContent = "Play";
        });
    }

    if (playgroundCaption) {
        playgroundCaption.title = "Download the app to edit subtitles.";
        playgroundCaption.addEventListener("click", onSubtitleIntent);
    }

    if (playgroundTime) {
        playgroundTime.title = "Download the app to edit subtitles.";
        playgroundTime.addEventListener("click", onSubtitleIntent);
    }

    if (playgroundPlay && playgroundVideo) {
        playgroundPlay.addEventListener("click", () => {
            if (playgroundVideo.paused) {
                playgroundVideo.play().catch(() => {});
                playgroundPlay.textContent = "Pause";
            } else {
                playgroundVideo.pause();
                playgroundPlay.textContent = "Play";
            }
        });
    }

    if (playgroundMute && playgroundVideo) {
        playgroundMute.addEventListener("click", () => {
            playgroundVideo.muted = !playgroundVideo.muted;
            if (!playgroundVideo.muted && playgroundVideo.paused && playgroundStarted) {
                playgroundVideo.play().catch(() => {});
                if (playgroundPlay) playgroundPlay.textContent = "Pause";
            }
            updatePlaygroundMuteControl();
        });
    }

    [playgroundDropzone, playgroundSampleFile].forEach((control) => {
        if (!control) return;
        control.addEventListener("click", startPlayground);
    });

    if (playgroundSampleFile) {
        playgroundSampleFile.addEventListener("dragstart", (event) => {
            if (!playgroundData) {
                event.preventDefault();
                return;
            }
            event.dataTransfer?.setData("text/plain", "mj-feature-sample");
        });
    }

    if (playgroundDropzone) {
        playgroundDropzone.addEventListener("dragover", (event) => {
            event.preventDefault();
            playgroundDropzone.classList.add("is-drag-over");
        });
        playgroundDropzone.addEventListener("dragleave", () => {
            playgroundDropzone.classList.remove("is-drag-over");
        });
        playgroundDropzone.addEventListener("drop", (event) => {
            event.preventDefault();
            playgroundDropzone.classList.remove("is-drag-over");
            startPlayground();
        });
    }
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
        const target = document.querySelector(anchor.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
});

window.addEventListener("scroll", () => {
    updateNav();
    updateAiPowered();
    updateWorkflowBackdrop();
}, { passive: true });
window.addEventListener("resize", updateWorkflowBackdrop);
workflowVideo?.addEventListener("loadedmetadata", updateWorkflowBackdrop);
updateNav();
updateAiPowered();
updateWorkflowBackdrop();
setupReveal();
setupIntroModal();
setupReleaseModal();
setupSupportMenu();
setupTrackedEvents();
setupDemoVideo();
setupAiGlow();
setupAiPoweredSound();
setupPlayground();
startDemoCaptionLoop();
