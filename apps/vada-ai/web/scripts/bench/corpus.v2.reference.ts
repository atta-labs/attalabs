// SQLite natural experiment — V2 reference case.
//
// Same question produced two qualitatively different outcomes under identical V1
// conditions: deflection (Run 1) and commitment (Run 2). Used as N=0 reference for
// Step 4 existential test to anchor interpretation of Vāda's consistency behavior.
//
// This question is NOT part of the main 15-question corpus. It does not count toward
// win-rate statistics. It is a calibration case for Step 4 and Step 6 variance analysis.

export const SQLITE_REFERENCE_QUESTION = {
  id: 'REF-1',
  text: 'Should a solo developer use SQLite or PostgreSQL for a new side project?',
  category: 'Technical' as const,
  difficulty: 'medium' as const,
  notes:
    'Natural experiment reference. Same question produced deflection (Run 1) and commitment (Run 2) under identical V1 conditions. Canonical case for pipeline consistency analysis.'
}

// TODO: pull session IDs from DB — query sessions where question text matches
// "Should a solo developer use SQLite or PostgreSQL for a new side project?"
// Run 1 (deflection) and Run 2 (commitment) should appear as consecutive sessions.
export const SQLITE_RUN_1_SESSION_ID = '' // deflection run
export const SQLITE_RUN_2_SESSION_ID = '' // commitment run
