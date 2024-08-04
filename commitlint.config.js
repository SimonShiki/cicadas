module.exports = {
    extends: ['gitmoji'],
    rules: {
        'signed-off-by': [2, 'always', 'Signed-off-by:'],
        'type-enum': [2, 'always', [
            'build', 'ci', 'docs', 'feat', 'fix', 'perf',
            'refactor', 'revert', 'style', 'test', 'wip',
            'merge', 'chore'
        ]]
    }
};
