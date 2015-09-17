"use strict";

/*global module, require, setTimeout*/

var stringType = "string",
    intType = "long",
    booleanType = "boolean",
    dataType = "string";

module.exports = function(elasticClient, index, extraMappings) {
    var stringType = {
	type: "string"
    },

	rawStringType = {
	    type: "string",
	    index: "not_analyzed"
	},

	intType = {
	    type: "long"
	},

	boolType = {
	    type: "boolean"
	},

	arbitraryObjType = {
	    type: "object",
	    enabled: false
	},

	deleteFun = function(callback) {
	    elasticClient.indices.exists(
		{
		    index: index
		},
		function(error, response) {
		    if (error) {
			callback(error, response);
		    } else if (response) {
			elasticClient.indices.delete(
			    {
				index: index
			    },
			    callback
			);
		    } else {
			callback(null, false);
		    }
		}
	    );
	},

	snapshotMappings = {
	    "_timestamp": {
		"enabled": "true",
		"store": "yes"
	    },
	    
	    properties: {
		collection: rawStringType,
		doc: {
		    type: "string",
		    fields: {
			raw: {
			    type: "string",
			    index: "not_analyzed"
			}
		    }
		},
		
		// This is the ot type, see [https://github.com/ottypes]
		type: stringType,
		data: {
		    type: 'object',
		    dynamic: false
		},
		/*
		 Deleted would make more sense as a boolean, but it has to be a string so that the suggester can use it.
		 */
		deleted: stringType,
		suggest: {
		    type: 'completion',
		    context: {
			collection: {
			    type: 'category',
			    path: 'collection'
			},
			deleted: {
			    type: 'category',
			    path: 'deleted'
			}
		    }
		}
	    }
	},

	opMappings = {
	    "_timestamp": {
		"enabled": "true",
		"store": "yes"
	    },
	    
	    properties: {
		collection: rawStringType,
		doc: stringType,
		v: intType,
		src: arbitraryObjType,
		seq: intType,
		meta: arbitraryObjType,
		op: arbitraryObjType,
		del: boolType,
		create: {
		    type: "object",
		    properties: {
			type: stringType,
			data: arbitraryObjType
		    }
		}
	    }
	},

	create = function(callback) {
	    elasticClient.indices.create(
		{
		    index: index,
		    body: {
			settings: {},
			mappings: {
			    snapshot: snapshotMappings,
			    op: opMappings
			}
		    }
		},
		function(error, response) {
		    if (error) {
			callback(error, response);
		    } else {
			/*
			 We need to wait a little while after creating an index before it will be available.
			 */
			setTimeout(
			    function() {
				callback(error, response);
			    },
			    1000
			);
		    }
		}
	    );
	};

    if (extraMappings) {
    	if (extraMappings.snapshotData) {
	    snapshotMappings.properties.data.properties = {};

    	    Object.keys(extraMappings.snapshotData).forEach(function(k) {
    		snapshotMappings.properties.data.properties[k] = extraMappings.snapshotData[k];
    	    });
    	}
    }

    return {
	delete: deleteFun,

	ensureCreated: function(callback) {
	    elasticClient.indices.exists(
		{
		    index: index
		},
		function(error, response) {
		    if (error) {
			callback(error, response);
			
		    } else if (!response) {
			create(callback);
			
		    } else {
			callback(null, false);
		    }
		}
	    );
	},

	deleteThenCreate: function(callback) {
	    deleteFun(function(error, response) {
		if (error) {
		    callback(error, response);
		} else {
		    create(callback);
		}
	    });
	}
    };
};
