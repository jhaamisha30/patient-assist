/**
 * Generate UHID (Unique Health ID) based on name and ID
 * @param {string} name - Person's name
 * @param {string} id - Doctor ID or Patient ID (should be numeric string)
 * @returns {string} - 10 character UHID
 * 
 * Rules:
 * 1. Take first 4 letters from name (uppercase, no spaces, no special chars)
 * 2. If name has fewer than 4 letters, fill with alphabet letters (A, B, C...)
 * 3. Take first 3 digits from ID
 * 4. Take last 3 digits from ID
 * 5. Total must be exactly 10 characters
 * 
 * Examples:
 * - name: 'Abhishek', id: '367248990' -> 'ABHI367990'
 * - name: 'Ram', id: '123456789' -> 'RAMA123789' (R, A, M, A, then first 3 and last 3 of ID)
 * - name: 'A Da', id: '387489234982' -> 'ADAA387982' (A, D, A, A, then first 3 and last 3)
 * - name: 'A D', id: '387489234982' -> 'ADAB387982' (A, D, A, B, then first 3 and last 3)
 */
export function generateUHID(name, id) {
  if (!name || !id) {
    throw new Error('Name and ID are required for UHID generation');
  }

  // Convert ID to string and extract digits only
  const idString = String(id).replace(/\D/g, ''); // Remove non-digits
  
  if (idString.length < 6) {
    throw new Error('ID must contain at least 6 digits for UHID generation');
  }

  // Step 1: Extract letters from name (remove spaces and special characters, convert to uppercase)
  const nameLetters = name.toUpperCase().replace(/[^A-Z]/g, '');
  
  // Step 2: Get first 4 letters (fill with alphabet if needed)
  let letterPart = '';
  let letterIndex = 0;
  
  // First, use letters from the name
  for (let i = 0; i < nameLetters.length && letterPart.length < 4; i++) {
    letterPart += nameLetters[i];
  }
  
  // If we don't have 4 letters yet, fill with alphabet (A, B, C...)
  if (letterPart.length < 4) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let alphabetIndex = 0;
    while (letterPart.length < 4) {
      letterPart += alphabet[alphabetIndex % 26];
      alphabetIndex++;
    }
  }
  
  // Ensure exactly 4 letters
  letterPart = letterPart.substring(0, 4);

  // Step 3: Get first 3 digits from ID
  const firstThreeDigits = idString.substring(0, 3);
  
  // Step 4: Get last 3 digits from ID
  const lastThreeDigits = idString.substring(idString.length - 3);

  // Step 5: Combine to form 10-character UHID
  const uhid = letterPart + firstThreeDigits + lastThreeDigits;

  if (uhid.length !== 10) {
    throw new Error(`UHID generation failed: expected 10 characters, got ${uhid.length}`);
  }

  return uhid;
}

