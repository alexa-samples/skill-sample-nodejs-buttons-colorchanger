// HTML color Picker site - https://www.w3schools.com/colors/colors_picker.asp
// Choose a shade darker than you intend

'use strict';

var COLORS = {
        "white":"ffffff",
        "red":"ff0000",
        "orange":"ff3300",
        "green":"00ff00",
        "dark green":"004411",
        "blue":"0000ff",
        "light blue":"00a0b0",        
        "purple":"4b0098",
        "yellow":"ffd400",
        "black":"000000"
};

module.exports = {
    getColor: function(colorName) {
        if (typeof colorName === 'string' &&
            COLORS[colorName.toLowerCase()] ) {
            return COLORS[colorName.toLowerCase()];
        }
        console.log("UNKNOWN COLOR: " + colorName);
    }
};
