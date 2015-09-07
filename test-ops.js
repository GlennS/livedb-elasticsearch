"use strict";

/*global module, require, setTimeout*/

var coll = "coll",
    doc = "doc",

    src = "dfhdfhd834yr3",
    type = "http://sharejs.org/types/JSONv0",
    text = "some text",
    updatedText = "some other text",

    createOp = {
	v: 0,
	seq: 0,
	src: src,
	create: {
	    type: type,
	    data: {
		text: text
	    }
	}
    },

    updateOp = {
	v: 1,
	seq: 1,
	src: src,
	op: [
	    {
		p: ["text"],
		oi: updatedText
	    }
	]
    },    

    deleteOp = {
	v: 2,
	seq: 2,
	src: src,
	del: true
    },

    /*
     Ops are identical except for a timestamp.
    */
    validateOp = function(t, actual, expected, message) {
	t.true(actual.timestamp, 'op should have a timestamp');
	
	delete actual.timestamp;
	t.deepEquals(actual, expected, message);
    };

/*
 These tests are stateful and happen in a particular order.
 */
module.exports = function(index, test) {
    test('getVersion default', function(t) {
	t.plan(2);
	
	index.getVersion(coll, doc, function(error, result) {
	    t.error(error, 'get Version');
	    t.equal(result, 0, 'Version without ops');
	});
    });

    test('empty getOps', function(t) {
	t.plan(2);

	index.getOps(coll, doc, null, null, function(error, result) {
	    t.error(error, 'getOps');
	    t.equal(result.length, 0, 'should be no ops in the index');
	});
    });

    test('write 3 ops', function(t) {
	t.plan(11);

	index.writeOp(coll, doc, createOp, function(error, result) {
	    t.error(error, 'write create op');

	    index.writeOp(coll, doc, updateOp, function(error, result) {
		t.error(error, 'write update op');

		index.writeOp(coll, doc, deleteOp, function(error, result) {
		    t.error(error, 'write delete op');

		    setTimeout(function(){

		    index.getOps(coll, doc, null, null, function(error, result) {
			t.error(error, 'getOps');
			t.equal(result.length, 3, 'got 3 ops?');
			validateOp(t, result[0], createOp, 'create op unchanged?');
			validateOp(t, result[1], updateOp, 'update op unchanged?');
			validateOp(t, result[2], deleteOp, 'delete op unchanged?');
		    });

		    }, 1000);
		});
	    });
	});
    });

    test('getOps bounds', function(t) {
	t.plan(10);

	index.getOps(coll, doc, 2, null, function(error, result) {
	    t.error(error, 'getOps start bounded');
	    t.equal(result.length, 1, 'got one op?');
	    validateOp(t, result[0], deleteOp, 'got the last op?');
	});

	index.getOps(coll, doc, 0, 2, function(error, result) {
	    t.error(error, 'getOps both bounds');
	    t.equal(result.length, 2, 'got two ops?');
	    validateOp(t, result[0], createOp, 'got the first op?');
	    validateOp(t, result[1], updateOp, 'got the second op?');
	});
    });

    test('op with wrong version', function(t) {
	t.plan(1);
	
	index.writeOp(coll, doc, {v: 1, del: true}, function(error, response) {
	    t.equal(error.status, '409', 'expected error on writing op with wrong version');
	});
    });

    test('getVersion after 3 operations', function(t) {
	t.plan(2);
	
	index.getVersion(coll, doc, function(error, result) {
	    t.error(error, 'get Version');
	    t.equal(result, 3, 'Version with three ops');
	});
    });
};
