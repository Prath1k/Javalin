import React from 'react';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export default function Creator() {
  const BrandIcons = {
    GitHub: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
    LinkedIn: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
    Instagram: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    )
  };

  const socials = [
    {
      name: 'GitHub',
      icon: <BrandIcons.GitHub style={{ width: 24, height: 24 }} />,
      link: 'https://github.com/Prath1k',
      color: '#EDEDED'
    },
    {
      name: 'LinkedIn',
      icon: <BrandIcons.LinkedIn style={{ width: 24, height: 24 }} />,
      link: 'https://www.linkedin.com/in/prathik-kontham-b221b2330/',
      color: '#0077B5'
    },
    {
      name: 'Instagram',
      icon: <BrandIcons.Instagram style={{ width: 24, height: 24 }} />,
      link: 'https://www.instagram.com/_prth.x_/',
      color: '#E4405F'
    }
  ];

  return (
    <div className="content-area creator-view">
      <div className="creator-container">
        <div className="creator-header">
          <div className="creator-avatar-wrapper">
              <div className="creator-avatar" style={{ overflow: 'hidden', borderRadius: '50%', border: '2px solid var(--accent)' }}>
               <img 
                 src="https://github.com/Prath1k.png" 
                 alt="Prathik" 
                 style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
               />
            </div>
            <div className="status-badge">Available for Projects</div>
          </div>
          
          <h1 className="creator-name">Prathik</h1>
          <p className="creator-role">Student | Aspiring Full Stack Developer & UI/UX Architect</p>
        </div>

        <div className="creator-bio">
          <p>
            I am a passionate student developer focused on building immersive, high-performance web experiences.   
            Creator of PixelArena Hub, a project dedicated to pushing the boundaries of 
            minimalist design and interactive gameplay.
          </p>
        </div>

        <div className="social-grid">
          {socials.map((social) => (
            <a 
              key={social.name} 
              href={social.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-card"
            >
              <div className="social-icon" style={{ color: social.color }}>{social.icon}</div>
              <div className="social-info">
                <span className="social-name">{social.name}</span>
                <span className="social-action">Connect</span>
              </div>
              <Icon name="arrow_outward" className="external-icon" />
            </a>
          ))}
        </div>

        <div className="creator-footer">
          <div className="tech-stack">
            <span>React</span>
            <span>Vite</span>
            <span>Supabase</span>
            <span>Socket.io</span>
          </div>
          <p className="copyright">© 2026 PixelArena Hub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
