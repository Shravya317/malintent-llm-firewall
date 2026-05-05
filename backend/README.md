## Week 1 - Pattern Engine (Layer A)

### What's built
- `malintent/pattern_engine.py` - 30+ regex patterns across 7 OWASP attack categories
- `tests/test_pattern_engine.py` - 50 test cases (25 attacks, 25 safe prompts)

### Attack categories covered
| Category | Patterns | Example |
|---|---|---|
| Direct Injection | 7 | "ignore all previous instructions" |
| Persona Override | 7 | DAN attack, unrestricted AI |
| Data Exfiltration | 6 | "repeat your system prompt" |
| Encoding Obfuscation | 5 | base64, hex encoded payloads |
| Indirect Injection | 6 | XML tags, SYSTEM markers |
| Context Manipulation | 4 | "this is just a test" |
| Harmful Elicitation | 3 | roleplay-as-villain patterns |

### Test results
```
pytest tests/ -v
# All 50 tests passing
```