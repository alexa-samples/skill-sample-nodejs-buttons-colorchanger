// Basic Animation Helper Library

'use strict';
const colorList = require('./colorsList');

var BasicAnimations = {

    // Solid Animation
    'SolidAnimation': function(cycles, color, duration) {
        //console.log('SolidAnimation');
        
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": duration,
                    "blend": false,
                    "color": validateColor(color)
               }
            ]
          }
        ];
    },
    // FadeIn Animation
    'FadeAnimation': function(color, duration) {
        return [
          {
            "repeat": 1,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": duration,
                    "blend": true,
                    "color": validateColor(color)
               }
            ]
          }
        ];
    },
    // FadeIn Animation
    'FadeInAnimation': function(cycles, color, duration) {
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": 1,
                    "blend": true,
                    "color": "000000"
               }, {
                    "durationMs": duration,
                    "blend": true,
                    "color": validateColor(color)
               }
            ]
          }
        ];
    },
    // FadeOut Animation
    'FadeOutAnimation': function(cycles, color, duration) {
        
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": duration,
                    "blend": true,
                    "color": validateColor(color)
                }, {
                    "durationMs": 1,
                    "blend": true,
                    "color": "000000"
                }
            ]
          }
        ];
    },
    // CrossFade Animation
    'CrossFadeAnimation': function(cycles, colorOne, colorTwo, durationOne, durationTwo) {
        //console.log('CrossFadeAnimation');
        
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": durationOne,
                    "blend": true,
                    "color": validateColor(colorOne)
               }, {
                    "durationMs": durationTwo,
                    "blend": true,
                    "color": validateColor(colorTwo)
               }
            ]
          }
        ];
    },
     // Breathe Animation
    'BreatheAnimation': function(cycles, color, duration) {
        //console.log('BreatheAnimation');
        
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": 1,
                    "blend": true,
                    "color": "000000"
               },
               {
                    "durationMs": duration,
                    "blend": true,
                    "color": validateColor(color)
                },
                {
                    "durationMs": 300,
                    "blend": true,
                    "color": validateColor(color)
                },
                {
                    "durationMs": 300,
                    "blend": true,
                    "color": "000000"
                }
            ]
          }
        ];
    },
    // Blink Animation
    'BlinkAnimation': function(cycles, color) {
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": 500,
                    "blend": false,
                    "color": validateColor(color)
                }, {
                    "durationMs": 500,
                    "blend": false,
                    "color": "000000"
                }
            ]
          }
        ];
    },
    // Flip Animation
    'FlipAnimation': function(cycles, colorOne, colorTwo, durationOne, durationTwo) {
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": durationOne,
                    "blend": false,
                    "color": validateColor(colorOne)
                }, {
                    "durationMs": durationTwo,
                    "blend": false,
                    "color": validateColor(colorTwo)
                }
            ]
          }
        ];
    },
    // Pulse Animation
    'PulseAnimation': function(cycles, colorOne, colorTwo) {
        return [
          {
            "repeat": cycles,
            "targetLights": ["1"],
            "sequence": [
               {
                    "durationMs": 500,
                    "blend": true,
                    "color": validateColor(colorOne)
                }, {
                    "durationMs": 1000,
                    "blend": true,
                    "color": validateColor(colorTwo)
                }
            ]
          }
        ];
    }
};

module.exports = BasicAnimations;

// Function to validate the color argument passed. If it's a color name,
// it compares it to the list of colors defined in the colorList.js,
// and returns back the Hex code if applicable.
function validateColor (requestedColor) {    
    var color = requestedColor || '';
    if (color.indexOf('0x') === 0) {
        return color.substring(2);
    } else if (color.indexOf('#') === 0) {
        return color.substring(1);
    } else {        
        return colorList.getColor(color) || color;
    }
}


    