# Testing Guide & Quality Assurance

## Testing Hierarchy
1. **Unit Tests**: Pure business functions, validation schemas, and Redux/Zustand reducers.
2. **Integration Tests**: Express route endpoints with in-memory Mongo test containers.
3. **End-to-End Tests**: Critical user paths (Board drag-and-drop, rich document save).

## Running Tests
```bash
# Backend unit & integration tests
cd backend && npm test

# Client component tests
cd client && npm test
```

## Manual QA Smoke Checklist
- [ ] User signup, login, and session refresh.
- [ ] Create board and reorder columns via drag and drop.
- [ ] Add rich text description in task modal and confirm auto-save.
- [ ] Verify multi-window real-time presence cursor.
