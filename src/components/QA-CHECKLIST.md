# Duplicate Property Prevention - QA Testing Checklist

## Overview
This checklist covers testing the complete duplicate property prevention system that includes:
- Manual property/unit creation with duplicate detection
- CSV import with duplicate prevention
- Duplicate Manager for cleanup
- Database-level constraints for enforcement

## Test Environment Setup
- [ ] Use a test portfolio with some existing properties
- [ ] Have sample CSV files ready for import testing
- [ ] Test with both single-family houses and multi-unit properties

## 1. Manual Property Creation Testing

### Single-Family House Duplicates
- [ ] **Test Case 1.1**: Create a single-family house with address "123 Main St"
  - Expected: Property created successfully
- [ ] **Test Case 1.2**: Try to create another single-family house with "123 Main Street" (similar address)
  - Expected: Duplicate warning dialog appears
  - Expected: "Proceed Anyway" button is hidden/disabled
  - Expected: Only "Cancel" button is available
- [ ] **Test Case 1.3**: Try to create single-family house with "123 main st" (different case)
  - Expected: Duplicate warning appears
- [ ] **Test Case 1.4**: Create different property types at same address (e.g., apartment vs house)
  - Expected: No duplicate warning (different property types allowed)

### Database Constraint Testing
- [ ] **Test Case 1.5**: If duplicate detection is bypassed somehow, database should reject
  - Expected: Friendly error message about duplicate prevention
  - Expected: No technical constraint error shown to user

## 2. Unit Creation Testing

### Unit Duplicates Within Property
- [ ] **Test Case 2.1**: Add unit "1A" to a multi-unit property
  - Expected: Unit created successfully
- [ ] **Test Case 2.2**: Try to add unit "1a" (different case) to same property
  - Expected: Duplicate warning dialog appears
- [ ] **Test Case 2.3**: Try to add unit "1-A" (different formatting) to same property
  - Expected: Duplicate warning appears
- [ ] **Test Case 2.4**: Add unit "1A" to a different property
  - Expected: Unit created successfully (different properties can have same unit numbers)

### UI Integration Testing
- [ ] **Test Case 2.5**: Test "Add Unit" button in PropertyUnitsManager
  - Expected: Opens EditUnitModal in create mode
- [ ] **Test Case 2.6**: Test "Add Your First Unit" button when no units exist
  - Expected: Opens EditUnitModal in create mode
- [ ] **Test Case 2.7**: Test editing existing unit to create duplicate
  - Expected: Duplicate warning appears if changing to duplicate unit number

## 3. CSV Import Testing

### Import with Duplicates
- [ ] **Test Case 3.1**: Import CSV with duplicate single-family addresses
  - Expected: Duplicates are rejected with clear error messages
  - Expected: Non-duplicate rows are processed successfully
- [ ] **Test Case 3.2**: Import CSV with duplicate units in same property
  - Expected: Duplicate units rejected, property created once
- [ ] **Test Case 3.3**: Import CSV mixing new and existing addresses
  - Expected: Only truly new properties/units are created
  - Expected: Existing ones are identified and skipped

### Import Session Tracking
- [ ] **Test Case 3.4**: Verify import session is created and tracked
  - Expected: Session shows in database with proper status
- [ ] **Test Case 3.5**: Check import results are stored per session
  - Expected: Individual row results are recorded with success/failure status

## 4. Duplicate Manager Testing

### Access and Navigation
- [ ] **Test Case 4.1**: Navigate to /duplicates route
  - Expected: DuplicateManager page loads successfully
- [ ] **Test Case 4.2**: Access Duplicate Manager from LandlordDashboard
  - Expected: "Manage Duplicates" button navigates to /duplicates

### Duplicate Detection and Display
- [ ] **Test Case 4.3**: View existing duplicates (if any)
  - Expected: Shows both property and unit duplicates in separate tabs
- [ ] **Test Case 4.4**: Test duplicate cleanup functionality
  - Expected: Can delete duplicate entries
  - Expected: Keeps the most recent duplicate
- [ ] **Test Case 4.5**: Test refresh functionality
  - Expected: Reloads and shows current duplicate status

## 5. Error Handling Testing

### User-Friendly Error Messages
- [ ] **Test Case 5.1**: Verify constraint violation messages are user-friendly
  - Expected: No technical database errors shown
  - Expected: Clear explanation about why duplicate was prevented
- [ ] **Test Case 5.2**: Test network/server errors during duplicate checking
  - Expected: Graceful fallback behavior
  - Expected: User can retry operation

### Edge Cases
- [ ] **Test Case 5.3**: Test with very long addresses
  - Expected: Proper normalization and comparison
- [ ] **Test Case 5.4**: Test with special characters in addresses/unit numbers
  - Expected: Normalization handles special characters correctly
- [ ] **Test Case 5.5**: Test with empty or null values
  - Expected: System handles gracefully without errors

## 6. Performance Testing

### Large Dataset Testing
- [ ] **Test Case 6.1**: Import large CSV (100+ rows)
  - Expected: Process completes in reasonable time
  - Expected: Progress tracking works if implemented
- [ ] **Test Case 6.2**: Test duplicate detection with many existing properties
  - Expected: Duplicate checking remains fast
  - Expected: Database indexes are working effectively

## 7. Integration Testing

### Complete Workflow Testing
- [ ] **Test Case 7.1**: End-to-end workflow: Manual create → CSV import → Duplicate cleanup
  - Expected: All steps work together seamlessly
- [ ] **Test Case 7.2**: Test property editing after creation
  - Expected: Can edit without duplicate warnings when not changing address
- [ ] **Test Case 7.3**: Test property deletion and re-creation
  - Expected: Soft-deleted properties don't trigger duplicates
  - Expected: Can recreate after permanent deletion

## 8. Security and Data Integrity

### RLS Policy Testing
- [ ] **Test Case 8.1**: Verify users can only see their own duplicates
  - Expected: No cross-user data leakage
- [ ] **Test Case 8.2**: Test unauthorized access to duplicate management
  - Expected: Proper access controls in place

### Database Integrity
- [ ] **Test Case 8.3**: Verify database constraints are properly enforced
  - Expected: Cannot bypass duplicate prevention at database level
- [ ] **Test Case 8.4**: Test constraint behavior with concurrent operations
  - Expected: No race conditions allow duplicate creation

## 9. User Experience Testing

### UI/UX Validation
- [ ] **Test Case 9.1**: Verify all duplicate warning dialogs are clear and helpful
  - Expected: Users understand why action was prevented
- [ ] **Test Case 9.2**: Test mobile responsiveness of duplicate manager
  - Expected: Works well on mobile devices
- [ ] **Test Case 9.3**: Verify loading states and feedback
  - Expected: Users get appropriate feedback during operations

## 10. Regression Testing

### Existing Functionality
- [ ] **Test Case 10.1**: Verify existing property creation still works
  - Expected: No broken functionality for valid operations
- [ ] **Test Case 10.2**: Test existing CSV import functionality
  - Expected: Valid imports continue to work as before
- [ ] **Test Case 10.3**: Verify property editing and management
  - Expected: All existing property management features work

## Sign-off Criteria

### Must Pass (Critical)
- [ ] All duplicate detection works correctly
- [ ] Database constraints prevent duplicates
- [ ] User-friendly error messages display
- [ ] No data corruption or loss
- [ ] Security policies work correctly

### Should Pass (Important)
- [ ] Duplicate Manager UI works properly
- [ ] CSV import handles mixed scenarios
- [ ] Performance is acceptable
- [ ] Mobile experience is good

### Nice to Have
- [ ] Advanced duplicate detection edge cases
- [ ] Batch operations work smoothly
- [ ] Advanced error recovery

## Notes Section
_Use this space to record any issues found, workarounds, or additional test cases discovered during testing._

---

**Testing Completed By:** ________________  
**Date:** ________________  
**Environment:** ________________  
**Overall Status:** ________________