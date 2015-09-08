"use strict";

/*global module, require, setTimeout*/

var coll = "coll",
    doc = "document",
    doc2 = 'other document';

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

    test('writeSnapshots', function(t) {
	/*
	 We schedule a delay after writing to allow time for index to pick this up.
	 */
	
	t.plan(4);
	
	index.writeSnapshot(coll, doc, snapshot, function(error, result) {
	    setTimeout(function() {
		t.error(error, 'writeSnapshot 1');
		t.true(result.created, 'document snapshot created in index');
	    }, 1000);
	});

	index.writeSnapshot(coll, doc2, snapshot, function(error, result) {
	    setTimeout(function() {
		t.error(error, 'writeSnapshot 2');
		t.true(result.created, 'other document snapshot created in index');
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
	    t.deepEquals(result, {coll: {document: snapshot}}, 'should contain an entry for the collection we asked for, containing the snapshot we stored');
	});
    });

    test('titleSearch', function(t) {
	t.plan(2);
	
	index.titleSearch(coll, 'doc', function(error, response) {
	    t.error(error, 'titleSearch');
	    t.deepEqual(response, [doc], 'should have found our snapshot title as a suggestion');
	});
    });

    test('bad titleSearch', function(t) {
	t.plan(2);

	index.titleSearch(coll, 'nonsense', function(error, response) {
	    t.error(error, 'titleSearch');
	    t.deepEqual(response, [], "shouldn't have found any suggestions");
	});
    });

    test('empty titleSearch', function(t) {
	t.plan(2);

	index.titleSearch(coll, '', function(error, response) {
	    t.error(error, 'titleSearch');
	    t.deepEqual(response, [doc, doc2], "should have suggested all documents ordered by title");
	});
    });

    test('wrong collection titleSearch', function(t) {
	t.plan(2);

	index.titleSearch('nonsense', 'documen', function(error, response) {
	    t.error(error, 'titleSearch');
	    t.deepEqual(response, [], "shouldn't have found any suggestions");
	});	
    });
};
