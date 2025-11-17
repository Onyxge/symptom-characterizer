import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function SymptomForm() {
  const [symptomName, setSymptomName] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state

  const handleSubmit = async (e) => { // 2. Make the function async
    e.preventDefault();
    if (symptomName.trim() === '') return;

    setLoading(true); // Disable button

    try {
      // 3. This is the new Firebase code
      const collectionRef = collection(db, 'symptoms');
      await addDoc(collectionRef, {
        name: symptomName.trim(),
        synonyms: [symptomName.trim().toLowerCase()], // Add name as first synonym
        createdAt: serverTimestamp(), // For sorting later
      });

      console.log('Symptom added:', symptomName);
      setSymptomName(''); // Clear the input field
      
    } catch (error) {
      console.error("Error adding document: ", error);
    }

    setLoading(false); // Re-enable button
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3">Add New Symptom</h2>
      <div className="flex">
        <input
          type="text"
          value={symptomName}
          onChange={(e) => setSymptomName(e.target.value)}
          placeholder="e.g., Headache"
          className="grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading} // 4. Disable input while loading
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading} // 5. Disable button while loading
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export default SymptomForm;