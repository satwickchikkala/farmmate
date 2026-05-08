# TODO

## Step 5 — Use translations in all pages
- [ ] Inspect all page files for hardcoded visible text.
- [ ] Add `useLanguage` import + `const { t, lang } = useLanguage();` inside each page component.
- [ ] Replace visible strings with `t("key")` using existing keys in `frontend/src/translations/languages.js`.
- [ ] Ensure placeholders/buttons/titles/alerts/empty states are also translated.
- [ ] Leave non-UI logic strings (Firestore field names, internal IDs) unchanged.
- [ ] Run frontend build/lint to verify no syntax errors.

