import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import SymptomEditor from './SymptomEditor';
import CharacterizationEditor from './CharacterizationEditor';

function SymptomList({ user }) {
  //--- NEW: Search state now lives here ---
  const [searchTerm, setSearchTerm] = useState('');
  
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSymptomId, setEditingSymptomId] = useState(null); 
  const [characterizingSymptomId, setCharacterizingSymptomId] = useState(null);

  useEffect(() => {
    const symptomsCollection = collection(db, 'symptoms');
    const q = query(symptomsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const symptomsData = [];
        querySnapshot.forEach((doc) => {
          symptomsData.push({ ...doc.data(), id: doc.id });
        });
        setSymptoms(symptomsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching symptoms: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]); // --- UPDATE: Re-run this effect if the user changes ---

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this symptom?")) {
      try {
        const docRef = doc(db, 'symptoms', id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("Error removing document: ", error);
      }
    }
  };

  const handleEdit = (id) => {
    setCharacterizingSymptomId(null);
    setEditingSymptomId(id);
  };

  const handleCharacterize = (id) => {
    setEditingSymptomId(null);
    setCharacterizingSymptomId(id);
  };

  // Filtering logic now uses local state ---
  const filteredSymptoms = symptoms.filter((symptom) => {
    const term = searchTerm.toLowerCase();
    
    const nameMatch = symptom.name.toLowerCase().includes(term);
    
    const synonymMatch = 
      Array.isArray(symptom.synonyms) &&
      symptom.synonyms.some(syn => syn.toLowerCase().includes(term));

    return nameMatch || synonymMatch;
  });

  if (loading) {
    return <div className="text-center p-4">Loading symptoms...</div>;
  }

  return (
    <div className="mt-6">
      {/*--- List header with title and search bar --- */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-semibold">Symptom List</h2>
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search list..."
          className="w-full sm:w-64 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {/* ---------------------------------------------------- */}

      <div className="space-y-3">
        {filteredSymptoms.length === 0 ? (
          <p className="text-gray-500">
            {searchTerm ? 'No symptoms match your search.' : 'No symptoms added yet.'}
          </p>
        ) : (
          filteredSymptoms.map((symptom) => (
            <div key={symptom.id} className="p-4 bg-white rounded-lg shadow border">
              
              {editingSymptomId === symptom.id ? (
                <SymptomEditor 
                  symptom={symptom} 
                  onStopEditing={() => setEditingSymptomId(null)} 
                />
              ) : 
              
              characterizingSymptomId === symptom.id ? (
                <CharacterizationEditor
                  symptom={symptom}
                  onStopEditing={() => setCharacterizingSymptomId(null)}
                />
              ) : (

                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{symptom.name}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEdit(symptom.id)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCharacterize(symptom.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                    >
                      Characterize
                    </button>
                    <button
                      onClick={() => handleDelete(symptom.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
              
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SymptomList;