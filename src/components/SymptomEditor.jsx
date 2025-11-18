import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

function SymptomEditor({ symptom, onStopEditing }) {
  const [name, setName] = useState(symptom.name);
  const [synonyms, setSynonyms] = useState(symptom.synonyms || []);
  const [newSynonym, setNewSynonym] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle saving the main symptom name
  const handleSaveName = async () => {
    if (name.trim() === '') return;
    setLoading(true);

    try {
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, {
        name: name.trim(),
      });
      console.log('Symptom name updated!');
      onStopEditing(); // Close the editor
    } catch (error) {
      console.error("Error updating name: ", error);
    }
    setLoading(false);
  };

  // Handle adding a new synonym
  const handleAddSynonym = async (e) => {
    e.preventDefault();
    if (newSynonym.trim() === '') return;

    try {
      const newSyn = newSynonym.trim().toLowerCase();
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, {
        synonyms: arrayUnion(newSyn)
      });
      setSynonyms([...synonyms, newSyn]);
      setNewSynonym('');
    } catch (error) {
      console.error("Error adding synonym: ", error);
    }
  };

  // Handle removing a synonym
  const handleRemoveSynonym = async (synonym) => {
    try {
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, {
        synonyms: arrayRemove(synonym)
      });
      setSynonyms(synonyms.filter(s => s !== synonym));
    } catch (error) {
      console.error("Error removing synonym: ", error);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-inner mt-2 space-y-4">
      {/* Name Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Symptom Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full p-2 border rounded-md"
        />
      </div>

      {/* Synonym Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Synonyms</label>
        <ul className="mt-1 space-y-2">
          {synonyms.map((syn) => (
            <li key={syn} className="flex justify-between items-center bg-white p-2 rounded border">
              <span>{syn}</span>
              <button
                onClick={() => handleRemoveSynonym(syn)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddSynonym} className="flex mt-2">
          <input
            type="text"
            value={newSynonym}
            onChange={(e) => setNewSynonym(e.target.value)}
            placeholder="Add new synonym"
            className="grow p-2 border rounded-l-md"
          />
          <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded-r-md hover:bg-green-600 text-sm">
            Add
          </button>
        </form>
      </div>
      
      {/* Save/Cancel Buttons */}
      <div className="flex justify-end space-x-2 border-t pt-4 mt-4">
        <button
          onClick={onStopEditing}
          className="bg-gray-500 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveName}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save Name'}
        </button>
      </div>
    </div>
  );
}

export default SymptomEditor;