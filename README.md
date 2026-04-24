# Fitness Coach - Workout Tracker

A modern workout tracking and analysis application with a light-orange and red theme.

## Features

### Dashboard View
- 10-day, 30-day, and 365-day analysis periods
- Weight trend graph with n-day average
- Waist trend graph with n-day average
- RPE (Rate of Perceived Exertion) by activity type bar chart
- Activity-specific color coding

### Workout Log Viewer
- View all workout entries with full details
- Click on tags to filter and view detailed data tables
- Activity type filtering
- Back navigation for filtered views
- Formatted date and activity type badges

### Workout Log Editor
- Edit raw workout log text
- Search/filter functionality
- Select All, Save, and Cancel buttons
- Auto-scroll to bottom on open
- Local storage persistence

## Architecture

### JavaScript Modules

**Utilities.js**
- `Duration` - Parses and formats time durations (HH:MM:SS)
- `TagData` - Represents a single tag with value and comment
- `Utilities` - Helper functions for parsing, dates, and formatting

**WorkoutEntry.js**
- `WorkoutEntry` - Base class for all log entries
- `DailyLogEntry` - Daily body metrics (Weight, Waist, RHR, etc.)
- `EnduranceWorkoutEntry` - Cardio workouts (Run, Swim, Cycle, Row, Erg)
- `StrengthWorkoutEntry` - Strength training with exercise details
- `YogaEntry` - Yoga/mobility sessions
- `NutritionEntry` - Meal logging
- `MeasurementsEntry` - Body composition measurements
- `DataEntry` - Auxiliary data (DEXA scans, etc.)

**WorkoutLog.js**
- `WorkoutLog` - Parses log files and provides statistical methods
- Filtering by date range, entry type, and tags
- Statistics helpers for weight, waist, and RPE analysis

**WorkoutLogViewer.js**
- `WorkoutLogViewer` - Component for viewing and filtering workout logs
- Tag-based filtering with detailed table views
- Activity type filtering

**WorkoutLogEditor.js**
- `WorkoutLogEditor` - Text editor component for log editing
- Search/filter in editor

**Dashboard.js**
- `Dashboard` - Analytics and chart rendering
- Canvas-based line and bar charts

**Persistence.js**
- `Persistence` - LocalStorage management for workout log data

**app.js**
- Main application controller
- View switching
- Event binding

## Styling

### Color Theme
- **Primary Red**: #d32f2f
- **Dark Red**: #b71c1c
- **Light Orange**: #ffb74d
- **Pale Orange**: #ffe0b2
- **Dark Gray**: #424242
- **Light Gray**: #f5f5f5

### Activity Colors
- Swim: Dark Blue (#01579b)
- Row: Light Blue (#0277bd)
- Run: Orange (#ff9800)
- Cycle: Red (#d32f2f)
- Erg: Gray (#757575)

## Data Format

Workout log entries follow this format:
```
YYYY-MM-DD: EntryType
Tag: Value -- Comment
Tag: Value -- Comment
```

### Entry Types
- **Daily** - Daily body metrics
- **Run, Swim, Cycle, Row, Erg** - Endurance workouts
- **Strength** - Strength training
- **Yoga** - Yoga/mobility
- **Nutrition** - Meal logs
- **Measurements** - Body measurements
- **Data** - Auxiliary data

## Development

No build process required - the app runs directly in the browser using ES6 modules.

To test locally:
```bash
cd /Users/blairfraser/Development/Fitness
open index.html
```

Data is stored in browser localStorage under the key `workoutLog`.

## Future Enhancements
- Export data to CSV
- Import from CSV
- Advanced filtering and analytics
- Mobile app version
- Cloud synchronization
- Wearable device integration
