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



// ***********************************************************************
//   EXIT_MODE Handlers
//     set up handlers for events that are specific to the Exit mode
//     when the skill is prompting the user to confirm if they want to exit
// ***********************************************************************
module.exports = Alexa.CreateStateHandler(Settings.SKILL_STATES.EXIT_MODE, {

    'AMAZON.YesIntent': function() {
        console.log("exitModeIntentHandlers::YesIntent (expecting exit = " + this.attributes.expectingEndSkillConfirmation + ")");

        if (this.attributes.expectingEndSkillConfirmation === true) {                        
            this.emit('GlobalSessionEndedRequestHandler'); 
        } else {
            this.emit('GlobalDefaultHandler');
        }
    },
    'AMAZON.NoIntent': function() {
        console.log("exitModeIntentHandlers::NoIntent (expecting exit = " + this.attributes.expectingEndSkillConfirmation + ")");

        if (this.attributes.expectingEndSkillConfirmation === true) {
            // change state back to Play Mode
            this.handler.state = Settings.SKILL_STATES.PLAY_MODE;

            const reprompt = "Pick a different color, red, blue, or green.";
            const outputSpeech = "Ok, let's keep going. " + reprompt;        
            this.response.speak(outputSpeech).listen(reprompt);
                        
            this.emit('GlobalResponseReady', { 'openMicrophone': true }); 
        } else {
            this.emit('GlobalDefaultHandler');
        }
    },
    'AMAZON.StopIntent': function() {
        this.emit('GlobalStopHandler');
    },
    'AMAZON.CancelIntent': function() {
        this.emit('GlobalStopHandler');
    },
    'AMAZON.HelpIntent': function() {
        this.emit('GlobalHelpHandler');
    },
    'Unhandled': function() {        
        this.emit('GlobalDefaultHandler');
    }
});