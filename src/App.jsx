// src/App.jsx
import SymptomForm from './components/SymptomForm';
import SymptomList from './components/SymptomList'; // 1. Import the list

function App() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      
      <h1 className="text-3xl font-bold text-center mb-6">
        Symptom Characterizer
      </h1>

      <SymptomForm />

      <hr className="my-6" /> {/* Add a visual separator */}

      <SymptomList /> {/* 2. Add the list component */}

    </div>
  );
}

export default App;