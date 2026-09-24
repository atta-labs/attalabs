// This repo runs two independent commit-message gates: commitlint here
// (via .husky/commit-msg), and vinaya's own `commit-msg` command (the
// `>>> vinaya:managed:commit-msg >>>` block `vinaya init` appended after
// commitlint's line in the same hook file). A commit only lands once both
// pass, so this config must accept EXACTLY what vinaya's own regex accepts
// — no wider, no narrower — on every dimension that regex checks: type
// vocabulary, type case, scope character set, and the absence of a
// conventional-commits `!` breaking-change marker, which vinaya's regex has
// no provision for at all. See:
// `@attalabs/aeg-core`'s `COMMIT_TYPE_STYLE` (packages/aeg-core/src/brief-validation.ts,
// pinned to this repo's vinaya version, importable here as a real
// dependency) —
//   /^(Build|Chore|Docs|Feat|Fix|Perf|Plan|Refactor|Revert|Style|Test)(\([a-z0-9-]+\))?: \S/
// — and `apps/cli/src/commands/commit-msg.ts`, which tests a header's first
// line against it verbatim. scripts/commitlint-vinaya-parity.test.ts asserts
// this file's rules and that live regex agree on a table of sample headers.
const types = ['Build', 'Chore', 'Docs', 'Feat', 'Fix', 'Perf', 'Plan', 'Refactor', 'Revert', 'Style', 'Test']

module.exports = {
  parserPreset: { parserOpts: { headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/ } },
  plugins: [
    {
      rules: {
        // vinaya's regex allows only `[a-z0-9-]+` inside the scope's
        // parens — commitlint's own built-in `scope-case` checks casing
        // only, so a scope like `vinaya_core` (underscore) or `apps/web`
        // (slash) is already all-lowercase and would pass `scope-case`
        // while vinaya's regex rejects it outright. This rule closes that
        // gap directly against the same character class.
        //
        // Reads the RAW header, not `parsed.scope`: `conventional-commits-parser`
        // normalizes an empty captured group to `null`, so `Fix(): ...`
        // (empty parens — vinaya's group needs 1+ char, so this must fail)
        // is indistinguishable from `Fix: ...` (no parens at all — a real
        // pass) once parsed. The raw header still tells them apart.
        'scope-charset': ({ header }) => {
          const m = /^\S+\(([^)]*)\)/.exec(header || '')
          if (!m) return [true]
          return [
            /^[a-z0-9-]+$/.test(m[1]),
            "scope must contain only lowercase letters, digits and hyphens, and may not be empty — matches vinaya's commit-msg gate (COMMIT_TYPE_STYLE)"
          ]
        },
        // vinaya's regex requires `: ` immediately after the type/scope —
        // it has no `!?` in its pattern, so a conventional-commits breaking
        // marker (`Fix(cli)!: ...` or `Fix!: ...`) fails vinaya's gate even
        // though this file's own `headerPattern` above still parses it
        // (type-enum/scope-case/etc. would all pass without this rule).
        'header-no-breaking-bang': ({ header }) => [
          !/^\S+(?:\([^)]*\))?!:/.test(header || ''),
          'this repo\'s vinaya commit-msg gate does not support the conventional-commits "!" breaking-change marker — omit it'
        ],
        // vinaya's regex ends in `\S` — the subject must contain at least
        // one NON-WHITESPACE character. commitlint's own built-in
        // `subject-empty` only checks `subject.length > 0`, so a
        // whitespace-only subject (`Fix(cli):  ` — colon, then only
        // spaces) has a non-empty (length 1+) subject and passes it, while
        // vinaya's `\S` rejects it outright.
        'subject-non-whitespace': ({ subject }) => [
          typeof subject === 'string' && /\S/.test(subject),
          "subject must contain a non-whitespace character — matches vinaya's commit-msg gate (COMMIT_TYPE_STYLE)"
        ]
      }
    }
  ],
  rules: {
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 72],
    'header-no-breaking-bang': [2, 'always'],
    'scope-case': [2, 'always', 'lower-case'],
    'scope-charset': [2, 'always'],
    'subject-case': [2, 'never', ['lower-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-non-whitespace': [2, 'always'],
    'type-case': [2, 'always', 'start-case'],
    'type-empty': [2, 'never'],
    'type-enum': [2, 'always', types]
  }
}
