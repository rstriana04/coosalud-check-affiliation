import React from 'react';
import { Toaster } from 'sonner';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <>
      <Dashboard />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;

