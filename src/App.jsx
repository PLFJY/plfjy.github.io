import { useEffect, useMemo, useState } from "react";
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
    href: "https://www.microsoft.com/software-download/windows11/",
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

function App() {
  const { t, i18n } = useTranslation();
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    document.title = t("siteTitle");
  }, [t, i18n.language]);

  useEffect(() => {
    document.body.classList.toggle("light-theme", isLightTheme);
  }, [isLightTheme]);

  const typingSvgUrl = useMemo(() => {
    const values = t("typingLines", { returnObjects: true });
    const lines = Array.isArray(values) ? values : [];
    const query = new URLSearchParams({
      font: "JetBrains Mono",
      color: isLightTheme ? "000000" : "FFFFFF",
      center: "true",
      vCenter: "true",
      width: "490",
      height: "50",
      size: "30",
      lines: lines.join(";")
    });
    return `https://readme-typing-svg.demolab.com?${query.toString()}`;
  }, [t, i18n.language, isLightTheme]);

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
            <a href="https://git.io/typing-svg" target="_blank" rel="noreferrer">
              <img src={typingSvgUrl} alt="Typing SVG" />
            </a>
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
