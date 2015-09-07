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

    elasticClient.indices.exists(
	{
	    index: index
	},
	function(error, response) {
	    if (error) {
		console.error(error);
	    } else if (!response) {
		
		elasticClient.indices.create(
		    {
			index: index,
			body: {
			    settings: {},
			    mappings: {
				snapshot: {
				    properties: {
					collection: stringType,
					doc: stringType,
					// This is the ot type, see [https://github.com/ottypes]
					type: stringType,
					data: arbitraryObjType
				    }
				},

				op: {
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
		    function(error, response) {
			if (error) {
			    console.error(error);
			}
		    }
		);
	    }
	}
    );
};
