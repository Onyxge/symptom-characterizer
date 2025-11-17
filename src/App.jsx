// src/App.jsx
import SymptomForm from './components/SymptomForm'; // 1. Import the component

function App() {
  return (
    // We'll use this div as the main container for the app
    <div className="max-w-4xl mx-auto p-4">
      
      <h1 className="text-3xl font-bold text-center mb-6">
        Symptom Characterizer
      </h1>

      {/* 2. Add the form component here */}
      <SymptomForm />

      {/* TODO: We will add the symptom list component here later */}

    </div>
  );
}

export default App;