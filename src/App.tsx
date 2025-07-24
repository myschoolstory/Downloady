import React from 'react';
import FileDownloader from './components/FileDownloader';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <FileDownloader />
      </div>
    </div>
  );
}

export default App;