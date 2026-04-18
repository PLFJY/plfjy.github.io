function IconTile({ name, href, icon, lightIcon, darkIcon }) {
  return (
    <div className="icon-tile">
      <a className="icon-tile-link" href={href} target="_blank" rel="noreferrer">
        {icon && <img src={icon} alt={name} />}
        {lightIcon && <img src={lightIcon} className="light-mode-icon" alt={name} />}
        {darkIcon && <img src={darkIcon} className="dark-mode-icon" alt={name} />}
      </a>
      <div className="icon-tile-name">{name}</div>
    </div>
  );
}

export default IconTile;
