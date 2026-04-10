import { describe, it, expect } from 'vitest';
import { parsePytest } from '../../../src/core/parsers/pytest.js';

const PYTEST_SHORT = `FAILED tests/test_auth.py::test_login_returns_token - AssertionError: assert None == {'token': 'abc123'}
FAILED tests/test_auth.py::test_session_expiry - ValueError: Session expired
PASSED tests/test_utils.py::test_format`;

const PYTEST_VERBOSE = `
=================================== FAILURES ===================================
_________________________________ test_login __________________________________

    def test_login():
        result = login("user")
>       assert result == {"token": "abc123"}
E       AssertionError: assert None == {'token': 'abc123'}

tests/test_auth.py:12: AssertionError
________________________________ test_session _________________________________

    def test_session():
>       raise ValueError("Session expired")
E       ValueError: Session expired

tests/test_auth.py:20: ValueError
=========================== short test summary info ============================
FAILED tests/test_auth.py::test_login - AssertionError: assert None == {'token': 'abc123'}
FAILED tests/test_auth.py::test_session - ValueError: Session expired
============================== 2 failed, 1 passed ==============================`;

describe('parsePytest', () => {
  it('extracts from short-form FAILED lines', () => {
    const errors = parsePytest(PYTEST_SHORT);
    expect(errors).toHaveLength(2);
    expect(errors[0].file).toBe('tests/test_auth.py');
    expect(errors[0].message).toContain('test_login_returns_token');
  });

  it('extracts from verbose output with FAILURES section', () => {
    const errors = parsePytest(PYTEST_VERBOSE);
    expect(errors).toHaveLength(2);
    expect(errors[0].file).toBe('tests/test_auth.py');
    expect(errors[0].message).toContain('test_login');
  });

  it('returns empty array for passing output', () => {
    expect(parsePytest('1 passed in 0.5s')).toEqual([]);
  });
});
