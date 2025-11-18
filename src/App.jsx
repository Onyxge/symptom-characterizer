import React, { useState, useRef, useEffect } from 'react';
import SymptomForm from './components/SymptomForm';
import SymptomList from './components/SymptomList';
import Login from './components/Login';
import { db, auth } from './firebaseConfig';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- NEW: Helper function to get name from email ---
const getNameFromEmail = (email) => {
  if (!email) return 'User';
  // Get the part before the @
  const name = email.split('@')[0];
  // Capitalize the first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
};
// ----------------------------------------------------

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  //  searchTerm state is gone from here ---
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // --- Export/Import function ---
  const formatCsvField = (data) => {
    if (data === null || data === undefined) return '""';
    let str = Array.isArray(data) ? data.join(';') : String(data);
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    // rest of JSON export function
    try {
      const querySnapshot = await getDocs(collection(db, 'symptoms'));
      const symptomsData = [];
      querySnapshot.forEach((doc) => {
        const { id, ...data } = doc.data();
        symptomsData.push(data);
      });
      const jsonString = JSON.stringify(symptomsData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'symptom_characterizer_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting JSON: ", error);
      alert("Error: Could not export JSON data.");
    }
    // ...
    setIsExporting(false);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    // rest of CSV export function
    try {
      const querySnapshot = await getDocs(collection(db, 'symptoms'));
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "symptom_name,symptom_synonyms,char_label,char_types,char_options\r\n";
      querySnapshot.forEach((doc) => {
        const symptom = doc.data();
        const symptomName = formatCsvField(symptom.name);
        const symptomSynonyms = formatCsvField(symptom.synonyms);
        if (symptom.characterizations && symptom.characterizations.length > 0) {
          symptom.characterizations.forEach((char) => {
            const row = [symptomName, symptomSynonyms, formatCsvField(char.label), formatCsvField(char.types), formatCsvField(char.options)].join(',');
            csvContent += row + "\r\n";
          });
        } else {
          const row = [symptomName, symptomSynonyms, '""', '""', '""'].join(',');
          csvContent += row + "\r\n";
        }
      });
      const encodedUri = encodeURI(csvContent);
      const a = document.createElement('a');
      a.href = encodedUri;
      a.download = 'symptom_characterizer_export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting CSV: ", error);
      alert("Error: Could not export CSV data.");
    }
    // ...
    setIsExporting(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/json') {
      alert('Error: Please select a valid .json file.');
      return;
    }
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const symptomsFromFile = JSON.parse(e.target.result);
        if (!Array.isArray(symptomsFromFile)) {
          throw new Error('Invalid JSON format: Not an array.');
        }
        const symptomsCollection = collection(db, 'symptoms');
        const querySnapshot = await getDocs(symptomsCollection);
        const existingNames = new Set();
        querySnapshot.forEach((doc) => {
          existingNames.add(doc.data().name.toLowerCase());
        });
        const symptomsToImport = symptomsFromFile.filter((symptom) => {
          return symptom.name && !existingNames.has(symptom.name.toLowerCase());
        });
        const duplicateCount = symptomsFromFile.length - symptomsToImport.length;
        if (symptomsToImport.length === 0) {
          alert(`Import complete. All ${duplicateCount} symptom(s) in the file already exist in your database.`);
          setIsImporting(false);
          event.target.value = null;
          return;
        }
        if (window.confirm(`Found ${symptomsFromFile.length} symptoms in the file.\n\n${symptomsToImport.length} are NEW and will be imported.\n${duplicateCount} are duplicates and will be skipped.\n\nContinue?`)) {
          const batch = writeBatch(db);
          symptomsToImport.forEach((symptom) => {
            const newDocRef = doc(symptomsCollection);
            batch.set(newDocRef, symptom);
          });
          await batch.commit();
          alert(`Successfully imported ${symptomsToImport.length} new symptoms! ${duplicateCount} duplicates were skipped.`);
        }
      } catch (error) {
        console.error("Error importing file: ", error);
        alert(`Error: Could not import file. ${error.message}`);
      } finally {
        setIsImporting(false);
        event.target.value = null;
      }
    };
    reader.readAsText(file);
  };
  // --- (End of import/export) ---

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  // If user is logged in, show the main app
  return (
    <div className="max-w-4xl mx-auto p-4">
      
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">
          Symptom Characterizer
        </h1>
        <div className="flex flex-wrap items-center space-x-2">
          {/*  Use the new name function*/}
          <span className="text-sm text-gray-600 hidden sm:block">
            {getNameFromEmail(user.email)}
          </span>
          <button
            onClick={handleSignOut}
            className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        {/*  Welcome the user by name */}
        <h2 className="text-2xl font-semibold">
          Welcome, {getNameFromEmail(user.email)}!
        </h2>
        <div className="flex flex-wrap space-x-2">
          {/* (Import/Export buttons) */}
          <button onClick={triggerFileInput} disabled={isImporting || isExporting} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {isImporting ? 'Importing...' : 'Import JSON'}
          </button>
          <button onClick={handleExportJSON} disabled={isExporting || isImporting} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400">
            {isExporting ? '...' : 'Export JSON'}
          </button>
          <button onClick={handleExportCSV} disabled={isImporting || isExporting} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400">
            {isExporting ? '...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept="application/json"
        className="hidden"
      />

      <SymptomForm user={user} />

      <hr className="my-6" />

      {/*  Pass the user prop, but not searchTerm */}
      <SymptomList user={user} />
    </div>
  );
}

export default App;