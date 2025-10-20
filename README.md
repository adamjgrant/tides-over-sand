# Tides Over Sand

A minimalist todo list application inspired by the metaphor of writing tasks in sand on a beach. Tasks naturally fade away after 5 days unless renewed, encouraging focus on what truly matters.

## Tech Stack

This application is built using modern web technologies optimized for deployment on GitHub Pages:

### Frontend
- **HTML5** - Semantic markup structure
- **CSS3** - Modern styling with Flexbox, Grid, and CSS custom properties
- **Vanilla JavaScript (ES6+)** - No frameworks or dependencies for maximum compatibility
- **Supabase Client** - Cross-device data persistence and real-time sync
- **GitHub OAuth** - Secure authentication via GitHub
- **Drag and Drop API** - Native browser drag and drop for task renewal

### Design & UX
- **Inter Font** - Clean, modern typography from Google Fonts
- **Things 3 Inspired Design** - Clean, minimalist interface
- **Responsive Design** - Mobile-first approach with breakpoints
- **CSS Animations** - Smooth transitions and hover effects
- **Progressive Enhancement** - Works without JavaScript for basic functionality

### Features
- **Task Lifetime Management** - 5-day expiration with visual fading
- **Drag & Drop Renewal** - Intuitive task prioritization
- **Markdown Support** - Rich text task descriptions
- **Real-time Preview** - Live markdown rendering
- **Cross-Device Sync** - Real-time synchronization across all devices
- **GitHub Authentication** - Secure one-click sign-in with GitHub
- **Mobile Responsive** - Optimized for all screen sizes
- **Real-time Updates** - Live task updates across multiple browser sessions

### Browser Support
- Modern browsers with ES6+ support
- Local Storage API support
- Drag and Drop API support
- CSS Grid and Flexbox support

### Deployment
- **GitHub Pages** - Static hosting with custom domain support
- **No Build Process** - Direct file serving
- **No Server Required** - Fully client-side application
- **CDN Ready** - Can be served from any static host

## Philosophy

This application explores the balance between structured task management and organic, adaptive work. Like writing in sand on a beach, tasks naturally fade away unless actively maintained, encouraging users to focus on what truly matters while remaining flexible to changing priorities.

## Getting Started

1. Open `index.html` in a modern web browser
2. Click "Sign in with GitHub" to authenticate
3. Add tasks using the input field
4. Click on tasks to view details and add descriptions
5. Drag tasks to renew them and reset their lifetime
6. Tasks automatically fade and disappear after 5 days
7. Your tasks sync in real-time across all your devices

## Authentication

The application uses GitHub OAuth for secure authentication. Your tasks are private to your GitHub account and sync across all devices where you're signed in.
