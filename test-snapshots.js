"use strict";

/*global module, require, setTimeout*/

var coll = "coll",
    doc = "doc";

module.exports = function(index, test) {
    test('getSnapshot missing', function(t) {
	t.plan(2);
	
	index.getSnapshot(coll, doc, function(error, result) {
	    t.error(error, 'getSnapshot');
	    t.false(result, 'getSnapshot should return null for missing documents');
	});
    });

    test('bulkGetSnapshot missing', function(t) {
	t.plan(2);

	index.bulkGetSnapshot(
	    {
		coll: [doc]
	    },
	    function(error, result) {
		t.error(error, 'bulkGetSnapshot');
		t.deepEquals(result, {coll: {}}, 'Should return names of all collections queries for, but not have found any documents.');
	    }
	);
    });

    var snapshot = {
	v: 1,
	type: "http://sharejs.org/types/JSONv0",
	data: {
	    text: "some text"
	}
    };

    test('writeSnapshot', function(t) {
	t.plan(2);
	
	index.writeSnapshot(coll, doc, snapshot, function(error, result) {

	    /*
	    Delay after writing to allow time for index to pick this up.
	    */
	    setTimeout(function() {
		t.error(error, 'writeSnapshot');
		t.true(result.created, 'snapshot created in index');
	    }, 1000);
	});
    });

    test('getSnapshot', function(t) {
	t.plan(2);

	index.getSnapshot(coll, doc, function(error, result) {
	    t.error(error, 'getSnapshot');
	    t.deepEquals(result, snapshot, 'snapshot should be unchanged over write and read');
	});
    });

    test('bulkGetSnapshot', function(t) {
	t.plan(2);

	index.bulkGetSnapshot({coll: [doc]}, function(error, result) {
	    t.error(error, 'bulkGetSnapshot');
	    t.deepEquals(result, {coll: {doc: snapshot}}, 'should contain an entry for the collection we asked for, containing the snapshot we stored');
	});
    });
};
