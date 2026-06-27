import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import IconTile from "./components/IconTile";
import ProjectCard from "./components/ProjectCard";
import Section from "./components/Section";
import WatchedAnimeSection from "./components/WatchedAnimeSection";
import { osList, projects, skills } from "./content";

const isAppleWebKitEngine = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;
  const hasAppleWebKit = /AppleWebKit/i.test(ua);
  if (!hasAppleWebKit) {
    return false;
  }

  // iOS browsers are all WebKit-based and share similar rendering issues.
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isIOS) {
    return true;
  }

  // Keep desktop Blink/Gecko out to avoid disabling transitions unnecessarily.
  const isMacSafari =
    /Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua);

  return isMacSafari;
};

function App() {
  const { t, i18n } = useTranslation();
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharCount, setCurrentCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [useHardThemeSwitch, setUseHardThemeSwitch] = useState(false);

  useEffect(() => {
    document.title = t("siteTitle");
  }, [t, i18n.language]);

  useEffect(() => {
    setUseHardThemeSwitch(isAppleWebKitEngine());
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light-theme", isLightTheme);
    root.style.colorScheme = isLightTheme ? "light" : "dark";

    if (useHardThemeSwitch) {
      root.classList.add("theme-switching");

      let raf1 = 0;
      let raf2 = 0;
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          root.classList.remove("theme-switching");
        });
      });

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
        root.classList.remove("theme-switching");
      };
    }

    root.classList.remove("theme-switching");
    return undefined;
  }, [isLightTheme, useHardThemeSwitch]);

  const typingLines = useMemo(() => {
    const values = t("typingLines", { returnObjects: true });
    const lines = Array.isArray(values) ? values.filter((line) => typeof line === "string") : [];
    return lines.length > 0 ? lines : [""];
  }, [t, i18n.language]);

  useEffect(() => {
    setCurrentLineIndex(0);
    setCurrentCharCount(0);
    setIsDeleting(false);
  }, [typingLines]);

  useEffect(() => {
    const activeLine = typingLines[currentLineIndex] ?? "";
    let nextDelay = isDeleting ? 45 : 90;

    if (!isDeleting && currentCharCount === activeLine.length) {
      nextDelay = 1400;
    }
    if (isDeleting && currentCharCount === 0) {
      nextDelay = 320;
    }

    const timer = window.setTimeout(() => {
      if (!isDeleting && currentCharCount < activeLine.length) {
        setCurrentCharCount((count) => count + 1);
        return;
      }
      if (!isDeleting && currentCharCount === activeLine.length) {
        setIsDeleting(true);
        return;
      }
      if (isDeleting && currentCharCount > 0) {
        setCurrentCharCount((count) => count - 1);
        return;
      }

      setIsDeleting(false);
      setCurrentLineIndex((index) => (index + 1) % typingLines.length);
    }, nextDelay);

    return () => window.clearTimeout(timer);
  }, [currentCharCount, currentLineIndex, isDeleting, typingLines]);

  const typingText = useMemo(() => {
    const activeLine = typingLines[currentLineIndex] ?? "";
    return activeLine.slice(0, currentCharCount);
  }, [currentCharCount, currentLineIndex, typingLines]);

  const switchLanguage = (language) => {
    window.localStorage.setItem("preferred-locale", language);
    i18n.changeLanguage(language);
  };

  const socialLinks = [
    {
      key: "bilibili",
      href: "https://space.bilibili.com/453909624/",
      iconClassName: "fab fa-bilibili"
    },
    {
      key: "github",
      href: "https://github.com/PLFJY/",
      iconClassName: "fab fa-github"
    },
    {
      key: "blog",
      href: "https://blog.plfjy.top/",
      iconClassName: "fas fa-blog"
    }
  ];

  return (
    <>
      <header>
        <div className="header-left">
          <img src="/assets/header.png" alt="avatar" className="header-avatar" />
          <div className="header-name">{t("name")}</div>
        </div>
        <div className="header-right">
          <div className="lang-switch">
            <button
              type="button"
              className={i18n.language === "zh-CN" ? "active" : ""}
              onClick={() => switchLanguage("zh-CN")}
            >
              中文
            </button>
            <button
              type="button"
              className={i18n.language === "en-US" ? "active" : ""}
              onClick={() => switchLanguage("en-US")}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            className={`theme-toggle ${isLightTheme ? "" : "dark"}`}
            onClick={() => setIsLightTheme((value) => !value)}
            aria-label={isLightTheme ? t("theme.dark") : t("theme.light")}
          >
            <i className="fas fa-moon" />
            <i className="fas fa-sun" />
            <span className="toggle-circle" />
          </button>
        </div>
      </header>

      <main>
        <div className="basic-info">
          <img src="/assets/header.png" alt="avatar" className="avatar-large" />
          <h1 className="name">{t("name")}</h1>
          <div className="tagline">
            <span className="typing-text">{typingText}</span>
            <span className="typing-cursor" aria-hidden="true" />
          </div>
          <div className="links">
            {socialLinks.map((link) => (
              <a href={link.href} target="_blank" className="link-btn" rel="noreferrer" key={link.key}>
                <i className={link.iconClassName} />
                <span>{t(`links.${link.key}`)}</span>
              </a>
            ))}
          </div>
        </div>

        <Section title={t("sections.projects")} contentClassName="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.name}
              name={project.name}
              href={project.href}
              description={t(`projects.${project.key}`)}
            />
          ))}
        </Section>

        <WatchedAnimeSection />

        <Section title={t("sections.skills")} contentClassName="icon-grid">
          {skills.map((skill) => (
            <IconTile key={skill.name} {...skill} />
          ))}
        </Section>

        <Section title={t("sections.os")} contentClassName="icon-grid">
          {osList.map((os) => (
            <IconTile key={os.name} {...os} />
          ))}
        </Section>
      </main>

      <img src="/assets/sticker.png" alt="sticker" className="anime-sticker" />
    </>
  );
}

export default App;
