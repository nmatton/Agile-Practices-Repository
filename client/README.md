# APR Frontend

This is the React frontend for the Agile Practice Repository (APR) application.

## Features

- **Authentication**: User registration and login
- **Practice Browsing**: Search and filter agile practices
- **Team Management**: Create teams and invite members
- **Dashboard**: View team statistics and recommendations
- **Responsive Design**: Works on desktop and mobile devices

## Development

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm start
```

The app will open at [http://localhost:3001](http://localhost:3001).

### Building for Production

```bash
npm run build
```

## Environment Variables

Create a `.env` file in the client directory:

```
REACT_APP_API_URL=http://localhost:3000
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Dashboard/      # Dashboard components
│   ├── Home/           # Home page components
│   ├── Layout/         # Layout components (Navbar, etc.)
│   ├── Practices/      # Practice browsing components
│   └── Teams/          # Team management components
├── store/              # Redux store and slices
│   └── slices/         # Redux Toolkit slices
├── App.js              # Main App component
├── App.css             # Global styles
└── index.js            # Entry point
```

## Technologies Used

- **React 18**: UI framework
- **Redux Toolkit**: State management
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **CSS3**: Styling (no external CSS framework for minimal dependencies)