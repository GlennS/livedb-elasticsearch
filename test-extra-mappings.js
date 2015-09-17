"use strict";

/*global module, require, setTimeout*/

var coll = 'coll',
    doc = 'doc';

module.exports = function(indexFactory, indexName, test) {
    var index = indexFactory(
	null,
	indexName,
	{
	    extraMappings: {
		snapshotData: {
		    text: {
			type: 'string',
			index: 'not_analyzed'
		    }
		}
	    }
	}
    ),

	snapshot = {
	    v: 1,
	    type: "http://sharejs.org/types/JSONv0",
	    data: {
		text: "some text",
		otherStuff: "not mapped"
	    }
	};

    test('createIndexWithExtraMappings', function(t) {
	t.plan(3);
	
	index.deleteThenCreateMappings(function(error, result) {
	    t.error(error, 'delete then create indexes');
	    t.true(result, 'Indexes with extra mappings should be created.');
	    
	    setTimeout(
		function() {
		    t.pass("Delay after index creation.");
		},
		100
	    );	
	});
    });

    test('insertSnapshotThenQueryExtraMappings', function(t) {
	t.plan(6);
	
	index.writeSnapshot(coll, doc, snapshot, function(error, result) {
	    setTimeout(function() {
		t.error(error, 'writeSnapshot with extra mappings');
		t.true(result.created, 'document snapshot created in index');

		index.client.search(
		    {
			index: indexName,
			type: 'snapshot',
			body: {
			    query: {
			    	filtered: {
			    	    filter: {
			    		term: {
			    		    'data.text': snapshot.data.text
			    		}
			    	    }
			    	}
			    },
			    fields: [
				'data.text'
			    ]
			}
		    },
		    function(error, response) {
			t.error(error, 'query for custom mapped field "text"');
			t.equal(response.hits.hits.length, 1, 'should have gotten one result');
			t.ok(response.hits.hits[0].fields, 'first hit should contain the fields property');
			t.deepEquals(response.hits.hits[0].fields['data.text'], [snapshot.data.text], 'text should have been returned');
		    }
		);
	    }, 1000);
	});
    });

    
    test('deleteIndexWithExtraMappings', function(t) {
    	t.plan(2);

    	index.deleteMappings(function(error, result) {
    	    t.error(error, 'deleteMappings');
    	    t.ok(result, 'Mappings should be deleted');
    	});
    });
};
