/*
 * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

const Alexa = require('alexa-sdk');
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants 
const Settings = require('settings.js');


const RollCallModeIntentHandlers = require('rollcall.js');
const PlayModeIntentHandlers = require('gameplay.js');
const ExitModeIntentHandlers = require('exitstage.js');

exports.handler = function(event, context, callback) {
    console.log("===EVENT=== \n" + JSON.stringify(event)); // Prints Alexa Event Request to CloudWatch logs for easier debugging
    
    const alexa = Alexa.handler(event, context);
    alexa.appId = '';

    // you may enable this to persist Attributes between session to a DynamoDB table called 'ColorChangerState'
    // if you enable DynamoDB persistance for your attributes, you must ensure access to DynamoDB from your skill
    // you can un-comment the next line to enable this functionality; the skill should work similarly in both cases
    // alexa.dynamoDBTableName = 'ColorChangerState';

    alexa.registerHandlers(globalHandlers, RollCallModeIntentHandlers, PlayModeIntentHandlers, ExitModeIntentHandlers);
    alexa.execute();
};

// ***********************************************************************
//   Global Handlers
//     set up some handlers for events that will have to be handled
//     regardless of what state the skill is in
// ***********************************************************************
const globalHandlers = {
    'GlobalHelpHandler': function() {
        console.log('globalHandlers::GlobalHelpHandler');
        
        if (this.attributes.CurrentInputHandlerID) {
            // if there is an active input handler, stop it so it doesn't interrup Alexa speaking the Help prompt
            // see: https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html#stop
            this.response._addDirective(GadgetDirectives.stopInputHandler({ 
                'id': this.attributes.CurrentInputHandlerID
            }));
        }

        let reprompt = "", 
            outputSpeech = "";
        if (this.attributes.isRollCallComplete === true) {
            // roll call is complete - if the user asks for help at this stage, explain about picking a color, or how to quit
            reprompt = "Pick a color to test your buttons: red, blue, or green. Or say cancel or exit to quit. ";
            outputSpeech = "Now that you have registered two buttons, you can pick a color to show when the buttons are pressed. "
                         + "Select one of the following colors: red, blue, or green. "
                         + "If you do not wish to continue, you can say exit. "
                         + reprompt;
            this.response.speak(outputSpeech).listen(reprompt);
        } else {            
            // the user hasn't completed roll call - the help message should explain that roll call needs to be completed and ask the user if they wish to continue
            reprompt = "You can say yes to continue, or no or exit to quit.";
            outputSpeech = "You will need two Echo buttons to use this skill. "
                         + "Each of the two buttons you plan to use must be pressed for the skill to register them. "
                         + "Would you like to continue and register two Echo buttons? "
                         + reprompt;
            this.response.speak(outputSpeech).listen(reprompt);
        
            // at this point, we're essentially waiting for user to decide whether to continue (say 'Yes', or quit - say 'No' or 'Cancel')
            this.attributes.expectingEndSkillConfirmation = true;
        }
                
        this.emit('GlobalResponseReady', { 'openMicrophone': true });
    },
    'GlobalStopHandler': function() {
        console.log('globalHandlers::GlobalStopHandler');
        
        this.response.speak('Good Bye!');  

        // setting shouldEndSession = true -  lets Alexa know that the skill is done      
        this.handler.response.response.shouldEndSession = true;

        this.emit('GlobalSessionEndedRequestHandler');
    },
    'GlobalDefaultHandler': function() {        
        console.log("globalHandlers::GlobalDefaultHandler");
        // this will handle requests that don't otherwise have a designated handler

        if (this.event.request.type === 'System.ExceptionEncountered') {
            // there is not much we can do if an error occurs
            // see:  https://developer.amazon.com/docs/alexa-voice-service/system.html#exceptionencountered
            console.log(JSON.stringify(this.event.request.error));
        } else {
            // otherwise, try to let the user know that we couldn't understand the request and prompt for what to do next
            const reprompt = "Please say again, or say help if you're not sure what to do.";
            const outputSpeech = "Sorry, I didn't get that. " + reprompt;

            this.response.speak(outputSpeech).listen(reprompt);

            this.emit('GlobalResponseReady', { 'openMicrophone': true });
        }
    },
    'GlobalSessionEndedRequestHandler': function() {
        console.log('globalHandlers::GlobalSessionEndedRequestHandler');
        
        // clean up attributes    
        delete this.attributes.STATE;
        delete this.attributes.buttonCount;
        delete this.attributes.isRollCallComplete;
        
        // setting shouldEndSession = fase  -  lets Alexa know that the skill is done
        // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html
        this.handler.response.response.shouldEndSession = true;

        this.handler.state = '';

        // log the response to CloudWatch to make it easier to debug the skill
        console.log("==Response== " + JSON.stringify(this.handler.response));
        // we emit the `:responseReady` event, although in some cases, suchas for actual `SessionEndedRequests` the response will be ignored
        this.emit(':responseReady');
    },
    'GlobalResponseReady': function({
        openMicrophone = false
    } = {}) {
        console.log('globalHandlers::GlobalResponseReady (openMicrophone = ' + openMicrophone + ')');
        // we trigger the `GlobalResponseReady` event from other handlers - the openMicrophone parameter controls the microphone behavior

        if (openMicrophone) {
            // setting shouldEndSession = fase  -  lets Alexa know that we're looking for an answer from the user 
            // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html#open
            //      https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
            this.handler.response.response.shouldEndSession = false;
        } else {
            // deleting shouldEndSession will keep the skill session going, while the input handler is active, waiting for button presses
            // see: https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
            delete this.handler.response.response.shouldEndSession;
        }

        // log the response to CloudWatch to make it easier to debug the skill
        console.log("==Response== " + JSON.stringify(this.handler.response));
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function() {        
        this.emit('GlobalSessionEndedRequestHandler');
    }
};