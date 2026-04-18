function ProjectCard({ name, href, description }) {
  return (
    <a href={href} target="_blank" className="project-card" rel="noreferrer">
      <h3>{name}</h3>
      <p>{description}</p>
    </a>
  );
}

export default ProjectCard;
