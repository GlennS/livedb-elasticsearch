"use strict";

/*global module, require*/

var stringType = "string",
    intType = "long",
    booleanType = "boolean",
    dataType = "string";

module.exports = function(elasticClient, index) {
    var stringType = {
	type: "string"
    },

	intType = {
	    type: "long"
	},

	boolType = {
	    type: "boolean"
	},

	arbitraryObjType = {
	    type: "string",
	    index: "no"
	};

    return {
	delete: function(callback) {
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

	ensureCreated: function(callback) {
	    elasticClient.indices.exists(
		{
		    index: index
		},
		function(error, response) {
		    if (error) {
			callback(error, response);
			
		    } else if (!response) {
			
			elasticClient.indices.create(
			    {
				index: index,
				body: {
				    settings: {},
				    mappings: {
					snapshot: {
					    "_timestamp": {
						"enabled": "true",
						"store": "yes"
					    },
					    
					    properties: {
						collection: stringType,
						doc: stringType,
						// This is the ot type, see [https://github.com/ottypes]
						type: stringType,
						data: arbitraryObjType,
						suggest: {
						    type: 'completion',
						    context: {
							collection_context: {
							    type: 'category',
							    path: 'collection'
							}
						    }
						}
					    }
					},

					op: {
					    "_timestamp": {
						"enabled": "true",
						"store": "yes"
					    },
					    
					    properties: {
						collection: stringType,
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
					}
				    }
				}
			    },
			    callback
			);
		    } else {
			callback(null, false);
		    }
		}
	    );
	}
    };
};
