import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const generateId = () => `char_${Math.random().toString(36).substr(2, 9)}`;

const STANDARD_HPI_TEMPLATE = [
  { id: 'hpi_onset', label: 'Onset', types: ['Text'], options: [] },
  { id: 'hpi_location', label: 'Location', types: ['Text'], options: [] },
  { id: 'hpi_duration', label: 'Duration', types: ['Text'], options: [] },
  { id: 'hpi_character', label: 'Character', types: ['Select', 'Text'], options: [] },
  { id: 'hpi_aggravating', label: 'Aggravating Factors', types: ['Text'], options: [] },
  { id: 'hpi_alleviating', label: 'Alleviating Factors', types: ['Text'], options: [] },
  { id: 'hpi_radiation', label: 'Radiation', types: ['Text'], options: [] },
  { id: 'hpi_timing', label: 'Timing', types: ['Text'], options: [] },
  { id: 'hpi_severity', label: 'Severity', types: ['Number'], options: [] },
];

function CharacterizationEditor({ symptom, onStopEditing }) {
  const [characterizations, setCharacterizations] = useState(symptom.characterizations || []);
  const [newCharLabel, setNewCharLabel] = useState('');
  
  const initialTypes = {
    Text: false,
    Number: false,
    Boolean: false,
    Date: false,
    Time: false,
    Select: false,
    MultiSelect: false,
  };
  const [newCharTypes, setNewCharTypes] = useState(initialTypes);

  //  ---State for the options editor ---
  const [newCharOptions, setNewCharOptions] = useState([]); // Holds the list of options
  const [currentOption, setCurrentOption] = useState(''); // The text in the option input
  // ---------------------------------------------

  const handleLoadTemplate = async () => {
    if (!window.confirm("This will add the standard HPI fields (like Onset, Location, etc.) to this symptom. Fields you already have will be skipped. Continue?")) {
      return;
    }
    const existingLabels = new Set(characterizations.map(c => c.label));
    const fieldsToAdd = STANDARD_HPI_TEMPLATE.filter(
      templateField => !existingLabels.has(templateField.label)
    );
    if (fieldsToAdd.length === 0) {
      alert("All standard HPI fields are already present.");
      return;
    }
    try {
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, {
        characterizations: arrayUnion(...fieldsToAdd)
      });
      setCharacterizations(prevChars => [...prevChars, ...fieldsToAdd]);
    } catch (error) {
      console.error("Error loading template: ", error);
    }
  };

  const handleAddCharacterization = async (e) => {
    e.preventDefault();
    const selectedTypes = Object.keys(newCharTypes).filter(type => newCharTypes[type]);
    if (newCharLabel.trim() === '' || selectedTypes.length === 0) {
      alert("Please enter a label and select at least one type.");
      return;
    }
//  --- CREATE: New characterization object ---
    const newChar = {
      id: generateId(),
      label: newCharLabel.trim(),
      types: selectedTypes,
      options: newCharOptions
    };
    // --------------------------------------------------------

    try {
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, {
        characterizations: arrayUnion(newChar)
      });
      setCharacterizations([...characterizations, newChar]);
      
      //  Reset all form fields ---
      setNewCharLabel('');
      setNewCharTypes(initialTypes);
      setNewCharOptions([]);
      setCurrentOption('');
      // -----------------------------------------
    } catch (error) {
      console.error("Error adding characterization: ", error);
    }
  };

  const handleRemoveCharacterization = async (char) => {
    try {
      const docRef = doc(db, 'symptoms', symptom.id);
      await updateDoc(docRef, {
        characterizations: arrayRemove(char)
      });
      setCharacterizations(characterizations.filter(c => c.id !== char.id));
    } catch (error) {
      console.error("Error removing characterization: ", error);
    }
  };

  const handleTypeChange = (e) => {
    const { name, checked } = e.target;
    setNewCharTypes(prevTypes => ({
      ...prevTypes,
      [name]: checked
    }));
  };

  //  Handler for adding an option to the list ---
  const handleAddOption = (e) => {
    e.preventDefault(); // Prevent the main form from submitting
    if (currentOption.trim() === '') return;
    setNewCharOptions([...newCharOptions, currentOption.trim()]);
    setCurrentOption(''); // Clear the input
  };
  // -----------------------------------------------------

  // --- NEW: Handler for removing an option from the list ---
  const handleRemoveOption = (optionToRemove) => {
    setNewCharOptions(newCharOptions.filter(option => option !== optionToRemove));
  };
  // ---------------------------------------------------------

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-inner mt-2 space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Characterizations for: <span className="font-bold">{symptom.name}</span>
        </h3>
        
        <button
          onClick={handleLoadTemplate}
          className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 mt-2"
        >
          Load Standard HPI Template (OLD CARTS)
        </button>
        
        <ul className="mt-3 space-y-2">
          {characterizations.length === 0 ? (
            <p className="text-gray-500 text-sm">No characterizations defined yet.</p>
          ) : (
            characterizations.map((char) => (
              <li key={char.id} className="flex justify-between items-center bg-white p-2 rounded border">
                <div>
                  <span className="font-medium">{char.label}</span>
                  <span className="text-gray-500 text-sm ml-2">({char.types.join(', ')})</span>
                  {/* --- Display the options --- */}
                  {char.options && char.options.length > 0 && (
                    <p className="text-xs text-gray-600 pl-2">
                      Options: {char.options.join(' | ')}
                    </p>
                  )}
                  {/* ---------------------------------- */}
                </div>
                <button
                  onClick={() => handleRemoveCharacterization(char)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>

        {/* --- Form to add a new one --- */}
        <form onSubmit={handleAddCharacterization} className="mt-4 p-3 bg-white border rounded-md divide-y divide-gray-200">
          
          {/* --- Part 1: Label and Types --- */}
          <div className="pb-3">
            <label className="block text-sm font-medium text-gray-700">Add New Characterization</label>
            <input
              type="text"
              value={newCharLabel}
              onChange={(e) => setNewCharLabel(e.target.value)}
              placeholder="e.g., Severity, Onset..."
              className="mt-1 w-full p-2 border rounded-md"
            />
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {/* Checkboxes... */}
              <label className="inline-flex items-center"><input type="checkbox" name="Text" checked={newCharTypes.Text} onChange={handleTypeChange} /><span className="ml-2">Text</span></label>
              <label className="inline-flex items-center"><input type="checkbox" name="Number" checked={newCharTypes.Number} onChange={handleTypeChange} /><span className="ml-2">Number</span></label>
              <label className="inline-flex items-center"><input type="checkbox" name="Boolean" checked={newCharTypes.Boolean} onChange={handleTypeChange} /><span className="ml-2">Yes/No</span></label>
              <label className="inline-flex items-center"><input type="checkbox" name="Date" checked={newCharTypes.Date} onChange={handleTypeChange} /><span className="ml-2">Date</span></label>
              <label className="inline-flex items-center"><input type="checkbox" name="Time" checked={newCharTypes.Time} onChange={handleTypeChange} /><span className="ml-2">Time</span></label>
              <label className="inline-flex items-center"><input type="checkbox" name="Select" checked={newCharTypes.Select} onChange={handleTypeChange} /><span className="ml-2">Select (Single)</span></label>
              <label className="inline-flex items-center"><input type="checkbox" name="MultiSelect" checked={newCharTypes.MultiSelect} onChange={handleTypeChange} /><span className="ml-2">Select (Multi)</span></label>
            </div>
          </div>

          {/*  --- Part 2 - Options Editor (Conditional) --- */}
          {(newCharTypes.Select || newCharTypes.MultiSelect) && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700">Define Options</label>
              
              {/* List of options added so far */}
              <ul className="mt-1 space-y-1">
                {newCharOptions.map((option) => (
                  <li key={option} className="flex justify-between items-center bg-gray-100 p-1.5 rounded text-sm">
                    <span>{option}</span>
                    <button
                      type="button" // Important: prevents main form submission
                      onClick={() => handleRemoveOption(option)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              {/* Form to add a new option */}
              <div className="flex mt-2">
                <input
                  type="text"
                  value={currentOption}
                  onChange={(e) => setCurrentOption(e.target.value)}
                  placeholder="e.g., Mild, Moderate..."
                  className="grow p-2 border rounded-l-md text-sm"
                />
                <button
                  type="button" // Important: prevents main form submission
                  onClick={handleAddOption}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-r-md hover:bg-gray-300 text-sm"
                >
                  Add Option
                </button>
              </div>
            </div>
          )}
          {/* ---------------------------------------------------- */}
          
          {/* --- Part 3: Main Add Button --- */}
          <div className="pt-3">
            <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm">
              Add Field to Symptom
            </button>
          </div>

        </form>
      </div>
      
      <div className="flex justify-end border-t pt-4 mt-4">
        <button
          onClick={onStopEditing}
          className="bg-gray-500 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default CharacterizationEditor;