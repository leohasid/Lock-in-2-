# 🔒 Locked In - All-in-One Self-Improvement App

A comprehensive self-improvement platform that helps users improve different areas of their life in one place.

## Features

### 💪 Gym & Fitness
- **AI-Powered Consultation**: Get personalized workout plans based on your goals, experience, equipment, and limitations
- **Workout Tracking**: Log your workouts and track progress
- **Progress Stats**: View workout streaks, total workouts, and weekly statistics

### 🥗 Nutrition & Calories
- **Meal Tracking**: Log meals with detailed macronutrient information (calories, protein, carbs, fats)
- **Daily Goals**: Set and track daily nutrition goals with visual progress bars
- **CALAI Integration**: Placeholder for integration with CALAI platform for automatic meal tracking

### 🛡️ Addiction Recovery
- **Multiple Addiction Types**: Track phone/social media, vape/nicotine, alcohol, and other addictions
- **Smart Alerts**: Get warnings when approaching daily limits (80% threshold)
- **Automatic Blocking**: Phone usage automatically blocked when daily limit is exceeded
- **Recovery Tracking**: Track days clean and build recovery streaks

### 📅 Calendar & Reminders
- **Flexible Reminders**: Create reminders for supplements, tasks, and habits
- **Recurring Schedules**: Set reminders for specific days of the week
- **Completion Tracking**: Mark reminders as complete and track completion rates
- **Today's View**: See all reminders scheduled for today

### 🤖 AI Consultation
- **Comprehensive Assessment**: Multi-step consultation covering personal info, goals, experience, and limitations
- **Personalized Plans**: Generate custom fitness and nutrition plans based on your responses
- **Recommendations**: Get AI-powered recommendations for optimal results

### 📊 Progress Dashboard
- **Unified Overview**: See all your progress in one place
- **Achievement System**: Track milestones and achievements
- **Detailed Stats**: View detailed statistics for each area of improvement

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Modern styling
- **React 19** - Latest React features

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd locked-in-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
locked-in-app/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Global styles
│   ├── gym/
│   │   └── page.tsx          # Gym & fitness page
│   ├── nutrition/
│   │   └── page.tsx          # Nutrition tracking page
│   ├── addictions/
│   │   └── page.tsx          # Addiction recovery page
│   ├── calendar/
│   │   └── page.tsx          # Calendar & reminders page
│   ├── consultation/
│   │   └── page.tsx          # AI consultation page
│   └── progress/
│       └── page.tsx          # Progress overview page
├── package.json
└── README.md
```

## Future Enhancements

- [ ] Backend API integration for data persistence
- [ ] User authentication and profiles
- [ ] CALAI API integration for automatic meal tracking
- [ ] Browser extension for phone usage blocking
- [ ] Mobile app companion
- [ ] Social features and community support
- [ ] Advanced analytics and insights
- [ ] Export data functionality
- [ ] Dark/light theme toggle
- [ ] Push notifications for reminders

## Notes

- Currently uses client-side state management (local state)
- Phone blocking requires browser extension or mobile app for full functionality
- AI consultation uses simulated responses - integrate with OpenAI or similar service for production
- CALAI integration is a placeholder - implement when API is available

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
