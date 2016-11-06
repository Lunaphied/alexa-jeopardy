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

/**
 * Function to use AJAX to connect to the backend server and retrieve a score
 */
function retrieveScore(teamName) {
    // XXX: Return actual score
    return 9001;
}

function getRemainingCategories() {
    // XXX: Return actual remaining categories
    return [
    {
        category: 'Food',
        value: 100
    }
    ];
}


function startGame(session, response) {
    session.attributes = {};
    session.attributes.gameRunning = true;
    response.tellKeepSession("New game of jeopardy started.");
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
        if (session.attributes && session.attributes.gameRunning) {
            session.attributes.cancelPending = true;
            response.ask("Sorry, a game is already running.]", "Do you want me to cancel?");
        } else {
            startGame(session, response);
        }
    },
    "ListCategoryIntent": function (intent, session, response) {
        response.tellWithCard("The available categories are: Category list here.", "Category options", "List of categories");
    },
    "SelectCategoryIntent": function (intent, session, response) {
        var categorySlot = intent.slots.category;
        if (categorySlot && categorySlot.value) {
            response.tell("Selected category: " + categorySlot.value);
        } else {
            response.tell("Sorry that category failed");
        }
    },
    "AlexaJeopardyScore": function (intent, session, response) {
        var teamName = intent.slots.teamName;
        response.tellKeepSession("The Score for team"+ teamName + "is currently" + retrieveScore(teamName.value));
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can say hello to me!", "You can say hello to me!");
    },
    "AMAZON.YesIntent": function (intent, session, response) {
        if (session.attributes) {
          if (session.attributes.cancelPending) {
                delete session.attributes.cancelPending;
                session.attributes = {};
                response.ask("Your game has been cancelled.", "Do you want me to start a new game?");
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
            }
        }
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HelloWorld skill.
    var alexaJeopardy = new AlexaJeopardy();
    alexaJeopardy.execute(event, context);
};

