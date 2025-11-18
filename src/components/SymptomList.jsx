import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, where, updateDoc, getDocs, arrayUnion } from 'firebase/firestore';
import SymptomEditor from './SymptomEditor';
import CharacterizationEditor from './CharacterizationEditor';
import { useIsMobile } from '../hooks/use-mobile';
import Section from './Section'

const SymptomCard = ({ symptom, onEdit, onCharacterize, onDelete, onShare }) => {
  // --- Use the hook to check view mode ---
  const isMobile = useIsMobile();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 relative">
      <div className="flex justify-between items-start">
        <div className="flex items-center mb-2 sm:mb-0">
          <span className="font-medium text-lg text-gray-800">{symptom.name}</span>
          {symptom.collaborators && symptom.collaborators.length > 1 && (
            <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">
              Shared
            </span>
          )}
        </div>

        {/* --- Conditional Rendering based on Hook --- */}
        {isMobile ? (
          // --- MOBILE VIEW: Dropdown Menu ---
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none"
            >
              <span className="text-2xl leading-none">⋮</span>
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-50 py-1">
                <button onClick={() => { onShare(symptom); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">Share Access</button>
                <button onClick={() => { onEdit(symptom.id); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">Edit</button>
                <button onClick={() => { onCharacterize(symptom.id); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 border-b border-gray-100 font-medium">Characterize</button>
                <button onClick={() => { onDelete(symptom.id); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium">Delete</button>
              </div>
            )}
          </div>
        ) : (
          // --- DESKTOP VIEW: Inline Buttons ---
          <div className="flex gap-2">
            <button onClick={() => onShare(symptom)} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md text-sm hover:bg-indigo-100 font-medium">Share</button>
            <button onClick={() => onEdit(symptom.id)} className="bg-yellow-50 text-yellow-600 px-3 py-1.5 rounded-md text-sm hover:bg-yellow-100 font-medium">Edit</button>
            <button onClick={() => onCharacterize(symptom.id)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-sm hover:bg-blue-100 font-medium">Characterize</button>
            <button onClick={() => onDelete(symptom.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-sm hover:bg-red-100 font-medium">Delete</button>
          </div>
        )}
        {/* ------------------------------------------ */}
      </div>
    </div>
  );
};

// --- Main List Component ---
function SymptomList({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSymptomId, setEditingSymptomId] = useState(null); 
  const [characterizingSymptomId, setCharacterizingSymptomId] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Use hook here too if we want to adjust the search bar layout later
  const isMobile = useIsMobile(); 

  useEffect(() => {
    if (!user) return;
    const symptomsCollection = collection(db, 'symptoms');
    const q = query(symptomsCollection, where('collaborators', 'array-contains', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const symptomsData = [];
        querySnapshot.forEach((doc) => symptomsData.push({ ...doc.data(), id: doc.id }));
        setSymptoms(symptomsData);
        setLoading(false);
      },
      (error) => { console.error("Error fetching symptoms: ", error); setLoading(false); }
    );
    return () => unsubscribe();
  }, [user]); 

  const handleShare = async (symptom) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, { shareCode: code });
      alert(`Share Code: ${code}\n\nGive this code to another doctor.`);
    } catch (error) {
      console.error("Error sharing: ", error);
      alert("Could not generate share code.");
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const symptomsCollection = collection(db, 'symptoms');
      const q = query(symptomsCollection, where('shareCode', '==', joinCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("Invalid Code.");
        setIsJoining(false);
        return;
      }
      const docFound = querySnapshot.docs[0];
      const docRef = doc(db, 'symptoms', docFound.id);
      await updateDoc(docRef, { collaborators: arrayUnion(user.uid) });
      alert(`Successfully joined: ${docFound.data().name}`);
      setJoinCode('');
    } catch (error) {
      console.error("Error joining: ", error);
      alert("Error joining symptom.");
    }
    setIsJoining(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this symptom?")) {
      try { await deleteDoc(doc(db, 'symptoms', id)); } 
      catch (error) { console.error("Error removing document: ", error); }
    }
  };

  const filteredSymptoms = symptoms.filter((symptom) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = symptom.name.toLowerCase().includes(term);
    const synonymMatch = Array.isArray(symptom.synonyms) && symptom.synonyms.some(syn => syn.toLowerCase().includes(term));
    return nameMatch || synonymMatch;
  });

  if (loading) return <div className="text-center p-4">Loading symptoms...</div>;

  return (
    <div className="mt-6">
      
      {/* Search & Join Section */}
      {/* Collapsible Join & Search Section */}
      <Section title="🤝 Collaboration & Search">
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-6`}>
          
          {/* Column 1: Join Section */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔑 Join Shared Symptom
            </label>
            <form onSubmit={handleJoin} className="flex w-full">
              <input 
                type="text" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value)} 
                placeholder="Enter Share Code" 
                className="grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" 
              />
              <button 
                type="submit" 
                disabled={isJoining} 
                className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-gray-400 font-medium whitespace-nowrap"
              >
                {isJoining ? '...' : 'Join'}
              </button>
            </form>
          </div>

          {/* Column 2: Search Section */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔎 Search
            </label>
            <input 
              type="search" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Type to filter..." 
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>

        </div>
      </Section>

      <div className="space-y-3">
        {filteredSymptoms.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">{searchTerm ? 'No symptoms match.' : 'No symptoms found.'}</p>
          </div>
        ) : (
          filteredSymptoms.map((symptom) => (
            <div key={symptom.id}>
              {editingSymptomId === symptom.id ? (
                <SymptomEditor symptom={symptom} onStopEditing={() => setEditingSymptomId(null)} />
              ) : characterizingSymptomId === symptom.id ? (
                <CharacterizationEditor symptom={symptom} onStopEditing={() => setCharacterizingSymptomId(null)} />
              ) : (
                <SymptomCard 
                  symptom={symptom} 
                  onShare={handleShare}
                  onEdit={setEditingSymptomId}
                  onCharacterize={setCharacterizingSymptomId}
                  onDelete={handleDelete}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SymptomList;