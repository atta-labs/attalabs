const types = ['Build', 'Docs', 'Feat', 'Chore', 'Fix', 'Perf', 'Refactor', 'Revert', 'Style', 'Test']

module.exports = {
  parserPreset: { parserOpts: { headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/ } },
  rules: {
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 72],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['lower-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'start-case'],
    'type-empty': [2, 'never'],
    'type-enum': [2, 'always', types]
  }
}
