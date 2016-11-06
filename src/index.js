/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * This simple sample has no external dependencies or session management, and shows the most basic
 * example of how to create a Lambda function for handling Alexa Skill requests.
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, tell Hello World to say hello"
 *  Alexa: "Hello World!"
 */

/**
 * App ID for the skill
 */
var APP_ID = "amzn1.ask.skill.660b9a28-6cd8-46a0-aa51-32ea10ff586e"; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

var TABLE_NAME = "JeopardySession";

/**
 * Function to use AJAX to connect to the backend server and retrieve a score
 */
function retrieveScore(session, teamName) {
    if (session.attributes && session.attributes[teamName]) {
        return session.attributes[teamName];
    } else {
        session.attributes[teamName] = 0;
        return 0;
    }
}

function getRemainingCategories() {
    // XXX: Return actual remaining categories
    return {
        northern: [ 200, 400, 600, 800, 1000],
        science: [200, 400, 600, 800, 1000],
    };
}

function isGameRunning(callback) {
    var params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "Id = :id, #s = :state",
        ExpressionAttributeValues: {
            ":id": 1,
            ":state": "running"
        },
        ExpressionAttributeNames: {
            "#s": "Session"
        }
    };
    dynamo.query(params, function (err, data) {
        if (err) {
            console.log(JSON.stringify(err, null, 2));
            callback(false);
        } else {
            console.log(JSON.stringify(data, null, 2));
            if (data.Count >= 1) {
                callback(true);
            } else {
                callback(false);
            }
        }
    });
}


function startGame(session, response) {
    response.tell("New game of jeopardy started.");
    var params = {
        TableName: TABLE_NAME,
        Key: {
            "Id": 1
        },
        UpdateExpression: "set #s = :state",
        ExpressionAttributeValues: {
            ":state": "running"
        },
        ExpressionAttributeNames: {
            "#s": "Session"
        },
        ReturnValues: "UPDATED_NEW"
    }
    dynamo.update(params, function(err, data) {
        if (err) {
            console.log("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            response.tell("New game started");
        }
    });
}

/**
 * AlexaJeopardy is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var AlexaJeopardy = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
AlexaJeopardy.prototype = Object.create(AlexaSkill.prototype);
AlexaJeopardy.prototype.constructor = AlexaJeopardy;

AlexaJeopardy.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("AlexaJeopardy onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

AlexaJeopardy.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("AlexaJeopardy onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Welcome to the Alexa Skills Kit, you can say hello";
    var repromptText = "You can say hello";
    response.ask(speechOutput, repromptText);
};

AlexaJeopardy.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("AlexaJeopardy onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

AlexaJeopardy.prototype.intentHandlers = {
    // register custom intent handlers
    "StartJeopardyIntent": function (intent, session, response) {
        isGameRunning(function(isRunning) {
            if (isRunning) {
                session.attributes.cancelPending = true;
                response.ask("Sorry, a game is already running. Want to cancel?", "Do you want me to cancel the game of Jeopardy running?");
            } else {
                startGame(session, response);
            } 
        });
    },
    "ListCategoryIntent": function (intent, session, response) {
        var remainingCategories = {};
        var categoryOutput = "";
        if (session.attributes && session.attributes.remainingCategories && session.attributes.isGameRunning) {
            remainingCategories = session.attributes.remainingCategories;
        } else {
            session.attributes = {
                isGameRunning: true,
                remainingCategories: getRemainingCategories()
            };
            remainingCategories = session.attributes.remainingCategories;
        }
        for (var i in remainingCategories) {
            if (i == undefined || remainingCategories[i] == undefined) {
                continue;
            }
            categoryOutput += i;
            categoryOutput += " for ";
            for (var j = 0; j < remainingCategories[i].length - 1; ++j) {
                categoryOutput += remainingCategories[i][j] + ", ";
            }
            categoryOutput += " and " + remainingCategories[i][remainingCategories[i].length - 1];
            categoryOutput +=", ";
        }
        response.tellKeepSession("The available categories are: " + categoryOutput.replace("undefined", ""));
    },
    "SelectCategoryIntent": function (intent, session, response) {
        var categorySlot = intent.slots.category;
        var scoreSlot = intent.slots.score;
        if (categorySlot && categorySlot.value && scoreSlot && scoreSlot.value) {
            var remainingCategories = {};
            if (session.attributes && session.attributes.remainingCategories && session.attributes.isGameRunning) {
                remainingCategories = session.attributes.remainingCategories;
            } else {
                session.attributes = {
                    isGameRunning: true,
                    remainingCategories: getRemainingCategories()
                };
                remainingCategories = session.attributes.remainingCategories;
            }
            if (remainingCategories[categorySlot.value.toLowerCase()]) {
                console.log(scoreSlot.value  + ':' + remainingCategories[categorySlot.value.toLowerCase()])
                if (remainingCategories[categorySlot.value.toLowerCase()].indexOf(scoreSlot.value) > -1) {
                    
                    response.tellKeepSession("Selected category: " + categorySlot.value + " for " + scoreSlot.value);
                } else {
                    response.tellKeepSession("Sorry " + scoreSlot.value + " is not a valid option for that category.");
                }
            } else {
                response.tellKeepSession("Sorry that category is unavailable");
            }
        } else {
            response.tellKeepSession("Sorry that category failed");
        }
    },
    "AlexaJeopardyScore": function (intent, session, response) {
        var teamName = intent.slots.teamName;
        if (teamName && teamName.value) {
            response.tellKeepSession("The Score for team " + teamName.value + " is currently " + retrieveScore(session, teamName.value));
        } else {
            response.tellKeepSession("Sorry I didn't catch that team name.");
        }
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        isGameRunning(function(data) {
            response.tellKeepSession("" + data);
        });
    },
    "AMAZON.YesIntent": function (intent, session, response) {
        if (session.attributes) {
          if (session.attributes.cancelPending) {
                delete session.attributes.cancelPending;
                session.attributes = {};
                response.ask("Your game has been cancelled. Start again?", "Do you want me to start a new game of Jeopardy?");
                session.attributes.startPending = true;
            } else if (session.attributes.startPending) {
                delete session.attributes.startPending;
                startGame(session, response);
            }
        } 
    },
    "AMAZON.NoIntent": function (intent, session, response) {
        if (session.attributes) {
            if (session.attributes.cancelPending) {
                delete session.attributes.cancelPending;
                response.tellKeepSession("Cancel aborted");
            } else if (session.attributes.startPending) {
                response.tellKeepSession("Ok");
            }
        }
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        if (session.attributes) {
            session.attributes = {};
        }
        response.tell("Game cancelled!");
    } 
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HelloWorld skill.
    var alexaJeopardy = new AlexaJeopardy();
    alexaJeopardy.execute(event, context);
};

