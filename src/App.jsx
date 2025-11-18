import React, { useState, useRef, useEffect } from 'react';
import SymptomForm from './components/SymptomForm';
import SymptomList from './components/SymptomList';
import Login from './components/Login';
import Section from './components/Section'; 
import { db, auth } from './firebaseConfig';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const getNameFromEmail = (email) => {
  if (!email) return 'User';
  const name = email.split('@')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
};


function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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

  const formatCsvField = (data) => {
    if (data === null || data === undefined) return '""';
    let str = Array.isArray(data) ? data.join(';') : String(data);
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
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
    setIsExporting(false);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
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

    if (!user) {
      alert("You must be logged in to import data.");
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

        // Check duplicates logic...
        const symptomsCollection = collection(db, 'symptoms');
        const querySnapshot = await getDocs(symptomsCollection);
        const existingNames = new Set();
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId === user.uid) {
            existingNames.add(data.name.toLowerCase());
          }
        });

        const symptomsToImport = symptomsFromFile.filter((symptom) => {
          return symptom.name && !existingNames.has(symptom.name.toLowerCase());
        });
        
        const duplicateCount = symptomsFromFile.length - symptomsToImport.length;

        if (symptomsToImport.length === 0) {
          alert(`Import complete. All ${duplicateCount} symptom(s) already exist in your list.`);
          setIsImporting(false);
          event.target.value = null;
          return;
        }

        if (window.confirm(`Found ${symptomsFromFile.length} symptoms.\n\n${symptomsToImport.length} are NEW and will be imported.\n${duplicateCount} are duplicates.\n\nContinue?`)) {
          
          const batch = writeBatch(db);

          symptomsToImport.forEach((symptom) => {
            //  --- CLEAN UP: Remove old IDs or bad data ---
            const { id, userId, createdAt, ...cleanData } = symptom;

            const newDocRef = doc(symptomsCollection);
            
            //--- FIX: Explicitly add User ID and reset Timestamp ---
            batch.set(newDocRef, {
              ...cleanData,
              userId: user.uid,        // Matches the current user
              createdAt: serverTimestamp(), // Sets to "Now" so sorting works
              collaborators: [user.uid]     // Ensures the "Share" feature works for these too
            });
          });

          await batch.commit();
          alert(`Successfully imported ${symptomsToImport.length} symptoms!`);
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

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Symptom Characterizer</h1>
          <p className="text-sm text-gray-600">Welcome, {getNameFromEmail(user.email)}!</p>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-200 w-full sm:w-auto"
        >
          Sign Out
        </button>
      </div>
      
      {/* --- Using the imported Section component --- */}
      <Section title="Data Tools (Import / Export)">
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={triggerFileInput} disabled={isImporting || isExporting} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm text-center">
            {isImporting ? 'Importing...' : 'Import JSON'}
          </button>
          <button onClick={handleExportJSON} disabled={isExporting || isImporting} className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 text-sm text-center">
            Export JSON
          </button>
          <button onClick={handleExportCSV} disabled={isExporting || isImporting} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm text-center">
            Export CSV
          </button>
        </div>
      </Section>

      <input type="file" ref={fileInputRef} onChange={handleImport} accept="application/json" className="hidden" />

      <Section title="Add New Symptom" defaultOpen={true} highlight={true}>
        <SymptomForm user={user} />
      </Section>

      <hr className="my-6 border-gray-100" />

      <SymptomList user={user} />
    </div>
  );
}

export default App;