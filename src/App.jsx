import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const projects = [
  {
    key: "p1",
    name: "idv-bp-asg-e",
    href: "https://github.com/plfjy/idv-bp-asg-e/"
  },
  {
    key: "p2",
    name: "bp-sys-wpf",
    href: "https://github.com/plfjy/bp-sys-wpf/"
  },
  {
    key: "p3",
    name: "neo-bpsys-wpf",
    href: "https://bpsys.plfjy.top/"
  }
];

const skills = [
  { name: ".Net", icon: "/assets/DotNet.svg", href: "https://dotnet.microsoft.com/" },
  {
    name: "C#",
    icon: "/assets/CS.svg",
    href: "https://dotnet.microsoft.com/en-us/languages/csharp"
  },
  {
    name: "WPF",
    href: "https://learn.microsoft.com/en-us/dotnet/desktop/wpf/",
    darkIcon: "/assets/WPF-white.svg",
    lightIcon: "/assets/WPF-black.svg"
  },
  { name: "Avalonia", icon: "/assets/avalonia.svg", href: "https://avaloniaui.net/" },
  { name: "PS", icon: "/assets/ps.svg", href: "https://www.adobe.com/products/photoshop.html" },
  { name: "PR", icon: "/assets/pr.svg", href: "https://www.adobe.com/products/premiere.html" },
  { name: "AU", icon: "/assets/Audition.svg", href: "https://www.adobe.com/products/audition.html" }
];

const osList = [
  {
    name: "Arch Linux",
    href: "https://archlinux.org/",
    darkIcon: "/assets/archlinux-black.svg",
    lightIcon: "/assets/archlinux-white.svg"
  },
  {
    name: "Windows",
    href: "https://www.microsoft.com/zh-cn/windows/windows-11",
    darkIcon: "/assets/Windows-Dark.svg",
    lightIcon: "/assets/Windows-Light.svg"
  },
  {
    name: "macOS",
    href: "https://www.apple.com/os/macos/",
    darkIcon: "/assets/Apple-Dark.svg",
    lightIcon: "/assets/Apple-Light.svg"
  }
];

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
            <a href="https://space.bilibili.com/453909624/" target="_blank" className="link-btn" rel="noreferrer">
              <i className="fab fa-bilibili" />
              <span>{t("links.bilibili")}</span>
            </a>
            <a href="https://github.com/PLFJY/" target="_blank" className="link-btn" rel="noreferrer">
              <i className="fab fa-github" />
              <span>{t("links.github")}</span>
            </a>
            <a href="https://blog.plfjy.top/" target="_blank" className="link-btn" rel="noreferrer">
              <i className="fas fa-blog" />
              <span>{t("links.blog")}</span>
            </a>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">{t("sections.projects")}</h2>
          <div className="projects">
            {projects.map((project) => (
              <a href={project.href} target="_blank" className="project-card" rel="noreferrer" key={project.name}>
                <h3>{project.name}</h3>
                <p>{t(`projects.${project.key}`)}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">{t("sections.skills")}</h2>
          <div className="skills">
            {skills.map((skill) => (
              <div className="skill-item" key={skill.name}>
                <a className="skill-icon" href={skill.href} target="_blank" rel="noreferrer">
                  {skill.icon && <img src={skill.icon} alt={skill.name} />}
                  {skill.lightIcon && <img src={skill.lightIcon} className="light-mode-icon" alt={skill.name} />}
                  {skill.darkIcon && <img src={skill.darkIcon} className="dark-mode-icon" alt={skill.name} />}
                </a>
                <div className="skill-name">{skill.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">{t("sections.os")}</h2>
          <div className="skills">
            {osList.map((os) => (
              <div className="skill-item" key={os.name}>
                <a className="skill-icon" href={os.href} target="_blank" rel="noreferrer">
                  <img src={os.lightIcon} className="light-mode-icon" alt={os.name} />
                  <img src={os.darkIcon} className="dark-mode-icon" alt={os.name} />
                </a>
                <div className="skill-name">{os.name}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <img src="/assets/sticker.png" alt="sticker" className="anime-sticker" />
    </>
  );
}

export default App;
