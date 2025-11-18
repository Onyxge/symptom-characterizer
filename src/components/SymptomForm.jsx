import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function SymptomForm({ user }) {
  const [symptomName, setSymptomName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (symptomName.trim() === '' || !user) return;

    setLoading(true);

    try {
      const collectionRef = collection(db, 'symptoms');
      await addDoc(collectionRef, {
        name: symptomName.trim(),
        synonyms: [symptomName.trim().toLowerCase()],
        createdAt: serverTimestamp(),
        // Use an array for collaborators instead of single userId ---
        collaborators: [user.uid],
        ownerEmail: user.email // 
      });

      console.log('Symptom added:', symptomName);
      setSymptomName('');
      
    } catch (error) {
      console.error("Error adding document: ", error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Symptom</h2>
      <div className="flex">
        <input
  type="text"
  value={symptomName}
  onChange={(e) => setSymptomName(e.target.value)}
  placeholder="e.g., Headache"
  className="grow min-w-0 p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  disabled={loading}
/>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-r-md font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export default SymptomForm;