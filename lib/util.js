'use strict';

function isAsync(input){
	return input && input.constructor.name === 'AsyncFunction';
}

exports = module.exports = {
	isAsync
};
