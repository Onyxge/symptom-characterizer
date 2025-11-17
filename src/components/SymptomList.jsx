import React, { useState, useEffect } from 'react';
// 1. Import db and firestore functions
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

function SymptomList() {
  const [symptoms, setSymptoms] = useState([]); // To hold the list of symptoms
  const [loading, setLoading] = useState(true); // To show a loading message

  // 2. This useEffect hook runs once when the component mounts
  useEffect(() => {
    // 3. Create a query to get all symptoms, ordered by when they were created
    const symptomsCollection = collection(db, 'symptoms');
    const q = query(symptomsCollection, orderBy('createdAt', 'desc'));

    // 4. onSnapshot is the real-time listener
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const symptomsData = [];
        querySnapshot.forEach((doc) => {
          // 5. Get the document data and add the unique ID
          symptomsData.push({ ...doc.data(), id: doc.id });
        });
        setSymptoms(symptomsData); // Update our React state
        setLoading(false);
      },
      (error) => {
        // Handle errors here
        console.error("Error fetching symptoms: ", error);
        setLoading(false);
      }
    );

    // 6. Cleanup: This function runs when the component is unmounted
    // It stops listening to the database to prevent memory leaks
    return () => unsubscribe();
  }, []); // The empty array [] means this effect runs only once

  // 7. Render the UI
  if (loading) {
    return <div className="text-center p-4">Loading symptoms...</div>;
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3">Symptom List</h2>
      <div className="space-y-3">
        {symptoms.length === 0 ? (
          <p className="text-gray-500">No symptoms added yet.</p>
        ) : (
          symptoms.map((symptom) => (
            <div 
              key={symptom.id} 
              className="p-4 bg-white rounded-lg shadow border flex justify-between items-center"
            >
              <span className="font-medium text-lg">{symptom.name}</span>
              {/* We'll add edit/delete buttons here later */}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SymptomList;