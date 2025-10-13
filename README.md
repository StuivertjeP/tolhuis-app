# 't Tolhuis AI Menu App

A React Native Web application for the AI-guided menu experience at 't Tolhuis restaurant. This app provides a personalized menu experience with multi-language support (Dutch/English) and intelligent dish recommendations.

## Features

- **Multi-step onboarding flow**: Introduction → Dietary preferences → Taste preferences → Name collection → WhatsApp opt-in → Personalized menu
- **AI-powered dish recommendations**: Personalized menu based on user preferences
- **Bilingual support**: Dutch and English interface
- **Responsive design**: Optimized for mobile and desktop
- **Toast notifications**: Pairing suggestions and recommendations
- **Progressive Web App**: Installable on mobile devices

## Technology Stack

- **React 18**: Modern React with hooks
- **React Native Web**: Web compatibility for React Native components
- **Tailwind CSS**: Utility-first CSS framework
- **Webpack 5**: Module bundler
- **Babel**: JavaScript transpiler

## Project Structure

```
src/
├── components/
│   └── App.js          # Main application component
├── App.js              # Shared utilities and data
├── index.js            # Application entry point
└── index.css           # Global styles with Tailwind

public/
├── index.html          # HTML template
├── manifest.json       # PWA manifest
└── favicon.ico         # App icon

Configuration files:
├── package.json        # Dependencies and scripts
├── webpack.config.js   # Webpack configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── postcss.config.js   # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

### Production Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## App Flow

1. **Introduction**: Welcome screen with rotating quotes
2. **Dietary Preferences**: Choose between meat/fish, vegetarian, or gluten-free
3. **Taste Preferences**: Select from light & fresh, rich & hearty, or surprising & full
4. **Name Collection**: Enter your name for personalization
5. **WhatsApp Opt-in**: Optional phone number collection for updates
6. **Personalized Menu**: AI-recommended dishes with pairing suggestions

## Customization

### Menu Data
Update the `demo` object in `src/App.js` to modify:
- Restaurant information
- Menu items
- Specials
- Pairing recommendations

### Styling
Modify `tailwind.config.js` to customize:
- Color scheme
- Typography
- Spacing
- Component styles

### Language
Add new languages by extending the `i18n` object in `src/App.js`.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2025 SlimmeGast.ai All rights reserved.
