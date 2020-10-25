'use strict';

/** @type {import('@types/eslint').Linter.Config} */
module.exports = {
	extends: 'standard',
	env: {
		mocha: true
	},
	rules: {
		semi: ['error', 'always'],
		indent: ['error', 'tab'],
		'no-tabs': 0,
		'no-extra-semi': 'error'
	}
};
